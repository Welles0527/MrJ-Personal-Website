import { spawnSync } from 'node:child_process';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const rawArgs = process.argv.slice(2);
const args = new Map();
for (let index = 0; index < rawArgs.length; index += 2) {
  args.set(rawArgs[index], rawArgs[index + 1]);
}

const required = (name) => {
  const value = args.get(name);
  if (!value) {
    throw new Error(`Missing required argument: ${name}`);
  }
  return path.resolve(value);
};

const selectedPath = required('--selected');
const reportPath = required('--report');
const excludedPath = required('--excluded');
const dockerPath = path.resolve(
  args.get('--docker') || 'D:/AppGallery/DockerDesktop/resources/bin/docker.exe',
);
const libraryRoot = path.resolve(
  args.get('--library-root') || 'D:/Personal Data Huawei/Personal Data/Photo/10_Library',
);
const concurrency = Math.max(1, Math.min(8, Number(args.get('--concurrency') || 6)));
const phashThreshold = Number(args.get('--phash-threshold') || 4);
const pixelMadThreshold = Number(args.get('--pixel-mad-threshold') || 15);

if (!Number.isInteger(phashThreshold) || phashThreshold < 0 || phashThreshold > 10) {
  throw new Error('--phash-threshold must be an integer from 0 to 10.');
}
if (!Number.isFinite(pixelMadThreshold) || pixelMadThreshold < 0 || pixelMadThreshold > 30) {
  throw new Error('--pixel-mad-threshold must be from 0 to 30.');
}

const sql = `
select a.id,
       a."originalPath",
       a."originalFileName",
       a."localDateTime"::text,
       e.latitude,
       e.longitude,
       coalesce(e.city, ''),
       coalesce(e.state, ''),
       coalesce(e.country, ''),
       encode(a.checksum, 'hex')
from asset a
join asset_exif e on e."assetId" = a.id
where a."deletedAt" is null
  and a.type = 'IMAGE'
  and e.country = 'Jamaica'
  and e.latitude between 17.5 and 18.6
  and e.longitude between -78.5 and -76.0
order by a."localDateTime", a."originalPath";
`;

const query = spawnSync(
  dockerPath,
  ['exec', '-i', 'immich_postgres', 'psql', '-U', 'postgres', '-d', 'immich', '-F', '\t', '-At'],
  { input: sql, encoding: 'utf8', maxBuffer: 16_000_000 },
);

if (query.status !== 0) {
  throw new Error(`Immich query failed: ${query.stderr || query.stdout}`);
}

const assets = query.stdout
  .trim()
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => {
    const parts = line.split('\t');
    if (parts.length !== 10) {
      throw new Error(`Unexpected database row: ${line}`);
    }
    const [assetId, originalPath, fileName, localDateTime, latitude, longitude, city, state, country, checksum] = parts;
    const relativePath = originalPath.replace(/^\/mnt\/library\//, '');
    if (relativePath === originalPath || relativePath.includes('..')) {
      throw new Error(`Unexpected Immich path: ${originalPath}`);
    }
    return {
      assetId,
      originalPath,
      sourcePath: path.join(libraryRoot, ...relativePath.split('/')),
      fileName,
      localDateTime,
      latitude: Number(latitude),
      longitude: Number(longitude),
      city,
      state,
      country,
      checksum,
    };
  });

if (assets.length === 0) {
  throw new Error('No Jamaica geotagged images were returned by Immich.');
}

const dctSize = 32;
const lowFrequencySize = 8;
const cosine = Array.from({ length: lowFrequencySize }, (_, frequency) =>
  Array.from({ length: dctSize }, (_, position) =>
    Math.cos(((2 * position + 1) * frequency * Math.PI) / (2 * dctSize)),
  ),
);

const buildPHash = (pixels) => {
  const coefficients = [];
  for (let vertical = 0; vertical < lowFrequencySize; vertical += 1) {
    for (let horizontal = 0; horizontal < lowFrequencySize; horizontal += 1) {
      let value = 0;
      for (let y = 0; y < dctSize; y += 1) {
        for (let x = 0; x < dctSize; x += 1) {
          value += pixels[y * dctSize + x] * cosine[horizontal][x] * cosine[vertical][y];
        }
      }
      coefficients.push(value);
    }
  }

  const valuesWithoutDc = coefficients.slice(1).sort((left, right) => left - right);
  const median = valuesWithoutDc[Math.floor(valuesWithoutDc.length / 2)];
  let hash = 0n;
  for (let index = 0; index < coefficients.length; index += 1) {
    if (coefficients[index] > median) {
      hash |= 1n << BigInt(index);
    }
  }
  return hash;
};

let cursor = 0;
const worker = async () => {
  while (cursor < assets.length) {
    const index = cursor;
    cursor += 1;
    const asset = assets[index];
    const image = sharp(asset.sourcePath, { failOn: 'none' }).rotate();
    const [metadata, grayscale, rgb, fileStats] = await Promise.all([
      image.clone().metadata(),
      image.clone().grayscale().resize(32, 32, { fit: 'fill' }).raw().toBuffer(),
      image.clone().resize(64, 64, { fit: 'fill' }).removeAlpha().raw().toBuffer(),
      stat(asset.sourcePath),
    ]);
    if (!metadata.width || !metadata.height) {
      throw new Error(`Could not read image dimensions: ${asset.sourcePath}`);
    }
    asset.width = metadata.width;
    asset.height = metadata.height;
    asset.pixelCount = metadata.width * metadata.height;
    asset.fileBytes = fileStats.size;
    asset.phash = buildPHash(grayscale);
    asset.rgb = rgb;
  }
};

await Promise.all(Array.from({ length: concurrency }, () => worker()));

const hammingDistance = (left, right) => {
  let value = left ^ right;
  let count = 0;
  while (value) {
    value &= value - 1n;
    count += 1;
  }
  return count;
};

const pixelMad = (left, right) => {
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference += Math.abs(left[index] - right[index]);
  }
  return difference / left.length;
};

const parent = Array.from({ length: assets.length }, (_, index) => index);
const find = (index) => {
  if (parent[index] !== index) {
    parent[index] = find(parent[index]);
  }
  return parent[index];
};
const join = (left, right) => {
  const leftRoot = find(left);
  const rightRoot = find(right);
  if (leftRoot !== rightRoot) {
    parent[rightRoot] = leftRoot;
  }
};

const matchedPairs = [];
for (let left = 0; left < assets.length; left += 1) {
  for (let right = left + 1; right < assets.length; right += 1) {
    const phashDistance = hammingDistance(assets[left].phash, assets[right].phash);
    if (phashDistance > phashThreshold) {
      continue;
    }
    const mad = pixelMad(assets[left].rgb, assets[right].rgb);
    if (mad > pixelMadThreshold) {
      continue;
    }
    join(left, right);
    matchedPairs.push({ left, right, phashDistance, pixelMad: mad });
  }
}

const groups = new Map();
for (let index = 0; index < assets.length; index += 1) {
  const root = find(index);
  if (!groups.has(root)) {
    groups.set(root, []);
  }
  groups.get(root).push(index);
}

const isPlaceholderDate = (value) => value.startsWith('2003-01-01 00:00:00');
const isDerivedName = (value) => /_jpg(?:_jpg)*\.jpg$/i.test(value);
const compareQuality = (left, right) =>
  right.pixelCount - left.pixelCount ||
  Number(isPlaceholderDate(left.localDateTime)) - Number(isPlaceholderDate(right.localDateTime)) ||
  Number(isDerivedName(left.fileName)) - Number(isDerivedName(right.fileName)) ||
  right.fileBytes - left.fileBytes ||
  left.assetId.localeCompare(right.assetId);

const publicEntry = (asset) => ({
  assetId: asset.assetId,
  sourcePath: asset.sourcePath,
  originalPath: asset.originalPath,
  fileName: asset.fileName,
  localDateTime: asset.localDateTime,
  latitude: asset.latitude,
  longitude: asset.longitude,
  city: asset.city,
  state: asset.state,
  country: asset.country,
  checksum: asset.checksum,
  width: asset.width,
  height: asset.height,
});

const selected = [];
const excluded = [];
const duplicateGroups = [];

for (const indexes of groups.values()) {
  const ranked = indexes.map((index) => assets[index]).sort(compareQuality);
  const kept = ranked[0];
  selected.push(publicEntry(kept));
  if (ranked.length === 1) {
    continue;
  }
  const members = ranked.map((asset) => {
    const sourceIndex = assets.indexOf(asset);
    const matchingEdges = matchedPairs.filter(
      (pair) => pair.left === sourceIndex || pair.right === sourceIndex,
    );
    return {
      ...publicEntry(asset),
      kept: asset.assetId === kept.assetId,
      phash: asset.phash.toString(16).padStart(16, '0'),
      nearestPhashDistance: Math.min(...matchingEdges.map((edge) => edge.phashDistance)),
      nearestPixelMad: Number(
        Math.min(...matchingEdges.map((edge) => edge.pixelMad)).toFixed(4),
      ),
    };
  });
  duplicateGroups.push({ keptAssetId: kept.assetId, members });
  for (const asset of ranked.slice(1)) {
    excluded.push({
      ...publicEntry(asset),
      keptAssetId: kept.assetId,
      reason: 'near-duplicate',
    });
  }
}

selected.sort(
  (left, right) =>
    left.localDateTime.localeCompare(right.localDateTime) ||
    left.fileName.localeCompare(right.fileName) ||
    left.assetId.localeCompare(right.assetId),
);
excluded.sort(
  (left, right) =>
    left.keptAssetId.localeCompare(right.keptAssetId) || left.assetId.localeCompare(right.assetId),
);
duplicateGroups.sort((left, right) => left.keptAssetId.localeCompare(right.keptAssetId));

const distinctChecksums = new Set(assets.map((asset) => asset.checksum)).size;
const report = {
  generatedAt: new Date().toISOString(),
  selection: {
    country: 'Jamaica',
    latitude: [17.5, 18.6],
    longitude: [-78.5, -76.0],
    assetType: 'IMAGE',
  },
  deduplication: {
    method: '64-bit perceptual hash plus normalized 64x64 RGB mean absolute difference',
    phashThreshold,
    pixelMadThreshold,
    keepRule: 'highest pixel count, then non-placeholder date, original filename, and file size',
  },
  counts: {
    candidates: assets.length,
    distinctFileChecksums: distinctChecksums,
    exactFileChecksumDuplicates: assets.length - distinctChecksums,
    duplicateGroups: duplicateGroups.length,
    excludedNearDuplicates: excluded.length,
    selected: selected.length,
  },
  duplicateGroups,
};

for (const outputPath of [selectedPath, reportPath, excludedPath]) {
  await mkdir(path.dirname(outputPath), { recursive: true });
}
await Promise.all([
  writeFile(selectedPath, `${JSON.stringify(selected, null, 2)}\n`, 'utf8'),
  writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8'),
  writeFile(excludedPath, `${JSON.stringify(excluded, null, 2)}\n`, 'utf8'),
]);

console.log(JSON.stringify(report.counts, null, 2));
