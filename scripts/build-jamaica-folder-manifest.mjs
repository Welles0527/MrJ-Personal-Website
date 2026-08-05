import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const rawArgs = process.argv.slice(2);
const args = new Map();
for (let index = 0; index < rawArgs.length; index += 2) {
  args.set(rawArgs[index], rawArgs[index + 1]);
}

const required = (name) => {
  const value = args.get(name);
  if (!value) throw new Error(`Missing required argument: ${name}`);
  return path.resolve(value);
};

const sourceRoot = required('--root');
const manifestPath = required('--manifest');
const reportPath = required('--report');
const reviewItemsPath = args.get('--review-items') ? path.resolve(args.get('--review-items')) : '';
const manualReviewPath = args.get('--manual-review') ? path.resolve(args.get('--manual-review')) : '';
const dockerPath = path.resolve(
  args.get('--docker') || 'D:/AppGallery/DockerDesktop/resources/bin/docker.exe',
);
const libraryRoot = path.resolve(
  args.get('--library-root') || 'D:/Personal Data Huawei/Personal Data/Photo/10_Library',
);

const excludedFolderName = '他人照片';
const imageExtensions = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.bmp',
  '.tif',
  '.tiff',
  '.heic',
]);
const videoExtensions = new Set(['.avi', '.mp4', '.mov', '.mkv', '.wmv', '.m4v']);
const preferredEventOrder = ['Jamaica标志性照片', '大事记', '其他', '前期考察', '小事记'];
const phashThreshold = 4;
const pixelMadThreshold = 15;

const normalizeFileName = (value) =>
  path
    .basename(value)
    .toLowerCase()
    .replace(/_preview(?=\.[^.]+$)/, '')
    .replace(/_jpg(?=\.jpg$)/, '');

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
  const sorted = coefficients.slice(1).sort((left, right) => left - right);
  const median = sorted[Math.floor(sorted.length / 2)];
  let hash = 0n;
  for (let index = 0; index < coefficients.length; index += 1) {
    if (coefficients[index] > median) hash |= 1n << BigInt(index);
  }
  return hash;
};
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
const fingerprintCache = new Map();
const fingerprint = (imagePath) => {
  if (!fingerprintCache.has(imagePath)) {
    fingerprintCache.set(
      imagePath,
      Promise.all([
        sharp(imagePath, { failOn: 'none' }).rotate().grayscale().resize(32, 32, { fit: 'fill' }).raw().toBuffer(),
        sharp(imagePath, { failOn: 'none' }).rotate().resize(64, 64, { fit: 'fill' }).removeAlpha().raw().toBuffer(),
      ]).then(([grayscale, rgb]) => ({ phash: buildPHash(grayscale), rgb })),
    );
  }
  return fingerprintCache.get(imagePath);
};

const sourceStats = await stat(sourceRoot);
if (!sourceStats.isDirectory()) throw new Error(`Source root is not a directory: ${sourceRoot}`);

const eventsOnDisk = (await readdir(sourceRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory() && entry.name !== excludedFolderName)
  .map((entry) => entry.name);
const eventOrder = [
  ...preferredEventOrder.filter((name) => eventsOnDisk.includes(name)),
  ...eventsOnDisk.filter((name) => !preferredEventOrder.includes(name)).sort((a, b) => a.localeCompare(b, 'zh-CN')),
];

const discovered = [];
const excluded = [];

const walk = async (directory, relativeSegments) => {
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((left, right) => left.name.localeCompare(right.name, 'zh-CN', { numeric: true }));
  for (const entry of entries) {
    const nextSegments = [...relativeSegments, entry.name];
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === excludedFolderName) {
        excluded.push({ path: nextSegments.join('/'), reason: 'excluded-folder' });
        continue;
      }
      await walk(absolutePath, nextSegments);
      continue;
    }
    if (!entry.isFile()) continue;
    const extension = path.extname(entry.name).toLowerCase();
    if (imageExtensions.has(extension)) {
      discovered.push({ absolutePath, relativeSegments: nextSegments, extension });
    } else {
      excluded.push({
        path: nextSegments.join('/'),
        reason: videoExtensions.has(extension) ? 'video' : 'unsupported-file',
      });
    }
  }
};

for (const event of eventOrder) {
  await walk(path.join(sourceRoot, event), [event]);
}

const sql = `
select encode(a.checksum, 'hex'),
       a.id,
       to_char(a."localDateTime", 'YYYY-MM-DD HH24:MI:SS'),
       coalesce(f.face_count, 0),
       a."originalFileName",
       a."originalPath"
from asset a
left join (
  select "assetId", count(*)::int as face_count
  from asset_face
  group by "assetId"
) f on f."assetId" = a.id
where a."deletedAt" is null and a.type = 'IMAGE'
order by a.id;
`;
const query = spawnSync(
  dockerPath,
  ['exec', '-i', 'immich_postgres', 'psql', '-U', 'postgres', '-d', 'immich', '-F', '\t', '-At'],
  { input: sql, encoding: 'utf8', maxBuffer: 32_000_000 },
);
if (query.status !== 0) throw new Error(`Immich query failed: ${query.stderr || query.stdout}`);

const immichByChecksum = new Map();
const immichByName = new Map();
for (const line of query.stdout.trim().split(/\r?\n/).filter(Boolean)) {
  const [checksum, assetId, localDateTime, faceCount, fileName, originalPath] = line.split('\t');
  const sourcePath = originalPath.startsWith('/mnt/library/')
    ? path.join(libraryRoot, ...originalPath.slice('/mnt/library/'.length).split('/'))
    : '';
  const match = { assetId, localDateTime, faceCount: Number(faceCount), fileName, originalPath, sourcePath };
  const matches = immichByChecksum.get(checksum) || [];
  matches.push(match);
  immichByChecksum.set(checksum, matches);
  const normalizedName = normalizeFileName(fileName);
  const nameMatches = immichByName.get(normalizedName) || [];
  nameMatches.push(match);
  immichByName.set(normalizedName, nameMatches);
}

let cursor = 0;
const manifest = new Array(discovered.length);
const concurrency = 8;
const worker = async () => {
  while (cursor < discovered.length) {
    const index = cursor;
    cursor += 1;
    const file = discovered[index];
    const relativePath = file.relativeSegments.join('/');
    const bytes = await readFile(file.absolutePath);
    const contentSha1 = createHash('sha1').update(bytes).digest('hex');
    const pathId = createHash('sha1').update(relativePath, 'utf8').digest('hex');
    let matches = immichByChecksum.get(contentSha1) || [];
    let classificationEvidence = matches.length ? 'exact-checksum' : 'unmatched';
    let readError = '';
    if (matches.length === 0) {
      try {
        const sourceFingerprint = await fingerprint(file.absolutePath);
        const candidates = immichByName.get(normalizeFileName(file.relativeSegments.at(-1))) || [];
        const compared = [];
        for (const candidate of candidates) {
          if (!candidate.sourcePath) continue;
          try {
            const candidateFingerprint = await fingerprint(candidate.sourcePath);
            const phashDistance = hammingDistance(sourceFingerprint.phash, candidateFingerprint.phash);
            if (phashDistance > phashThreshold) continue;
            const mad = pixelMad(sourceFingerprint.rgb, candidateFingerprint.rgb);
            if (mad <= pixelMadThreshold) compared.push({ ...candidate, phashDistance, pixelMad: Number(mad.toFixed(4)) });
          } catch {
            // Offline or unreadable Immich candidates are ignored.
          }
        }
        if (compared.length) {
          compared.sort((left, right) => left.phashDistance - right.phashDistance || left.pixelMad - right.pixelMad);
          const bestDistance = compared[0].phashDistance;
          const bestMad = compared[0].pixelMad;
          matches = compared.filter((candidate) => candidate.phashDistance === bestDistance && candidate.pixelMad === bestMad);
          classificationEvidence = 'same-name-visual-match';
        }
      } catch (error) {
        classificationEvidence = 'unreadable-source';
        readError = error instanceof Error ? error.message : String(error);
      }
    }
    const faceCount = Math.max(0, ...matches.map((match) => match.faceCount));
    const event = file.relativeSegments[0];
    const chapterSegments = file.relativeSegments.slice(1, -1);
    manifest[index] = {
      id: pathId,
      sourcePath: file.absolutePath,
      relativePath,
      event,
      eventOrder: eventOrder.indexOf(event),
      chapter: chapterSegments.length ? chapterSegments.join(' / ') : event,
      chapterPath: chapterSegments,
      fileName: file.relativeSegments.at(-1),
      contentSha1,
      category: faceCount > 0 ? 'people' : 'scenery',
      faceCount,
      classificationEvidence,
      readError,
      immichMatches: matches,
    };
  }
};
await Promise.all(Array.from({ length: concurrency }, () => worker()));

if (reviewItemsPath || manualReviewPath) {
  if (!reviewItemsPath || !manualReviewPath) {
    throw new Error('Both --review-items and --manual-review are required for manual classification');
  }
  const reviewItems = JSON.parse(await readFile(reviewItemsPath, 'utf8'));
  const manualReview = JSON.parse(await readFile(manualReviewPath, 'utf8'));
  const reviewById = new Map(reviewItems.map((item) => [item.reviewId, item]));
  const manualPool = manifest.filter((item) =>
    ['unmatched', 'unreadable-source'].includes(item.classificationEvidence),
  );
  const reviewItemIds = new Set(reviewItems.map((item) => item.id));
  const manualPoolIds = new Set(manualPool.map((item) => item.id));
  const missingReviewItems = manualPool.filter((item) => !reviewItemIds.has(item.id));
  const staleReviewItems = reviewItems.filter((item) => !manualPoolIds.has(item.id));
  if (
    reviewItems.length !== manualReview.reviewedCount ||
    missingReviewItems.length ||
    staleReviewItems.length
  ) {
    throw new Error(
      `Manual review no longer matches this manifest: ${JSON.stringify({
        expected: manualReview.reviewedCount,
        actual: reviewItems.length,
        missing: missingReviewItems.length,
        stale: staleReviewItems.length,
      })}`,
    );
  }
  const peopleIds = new Set(
    manualReview.peopleReviewIds.map((reviewId) => {
      const reviewItem = reviewById.get(reviewId);
      if (!reviewItem) throw new Error(`Unknown manual review id: ${reviewId}`);
      return reviewItem.id;
    }),
  );
  for (const item of manualPool) {
    item.category = peopleIds.has(item.id) ? 'people' : 'scenery';
    item.classificationEvidence = 'manual-contact-sheet-review';
  }
}

manifest.sort(
  (left, right) =>
    left.eventOrder - right.eventOrder ||
    left.chapter.localeCompare(right.chapter, 'zh-CN', { numeric: true }) ||
    left.fileName.localeCompare(right.fileName, 'zh-CN', { numeric: true }) ||
    left.relativePath.localeCompare(right.relativePath, 'zh-CN'),
);

const contentGroups = new Map();
for (const item of manifest) {
  const group = contentGroups.get(item.contentSha1) || [];
  group.push(item.relativePath);
  contentGroups.set(item.contentSha1, group);
}
const duplicateGroups = [...contentGroups.entries()]
  .filter(([, paths]) => paths.length > 1)
  .map(([contentSha1, paths]) => ({ contentSha1, paths }));

const countsByEvent = Object.fromEntries(
  eventOrder.map((event) => [event, manifest.filter((item) => item.event === event).length]),
);
const countsByCategory = {
  people: manifest.filter((item) => item.category === 'people').length,
  scenery: manifest.filter((item) => item.category === 'scenery').length,
};
const report = {
  generatedAt: new Date().toISOString(),
  sourceRoot,
  rules: {
    eventOrder,
    excludedFolderName,
    imageExtensions: [...imageExtensions].sort(),
    videosIncluded: false,
    duplicatePolicy: 'preserve every source path exactly as organized',
    categoryPolicy:
      'matched images use read-only Immich face counts; unmatched images use manual contact-sheet review',
  },
  counts: {
    selectedImages: manifest.length,
    excludedFolders: excluded.filter((item) => item.reason === 'excluded-folder').length,
    excludedVideos: excluded.filter((item) => item.reason === 'video').length,
    excludedUnsupportedFiles: excluded.filter((item) => item.reason === 'unsupported-file').length,
    exactImmichChecksumMatches: manifest.filter((item) => item.classificationEvidence === 'exact-checksum').length,
    sameNameVisualMatches: manifest.filter((item) => item.classificationEvidence === 'same-name-visual-match').length,
    unmatchedImages: manifest.filter((item) => item.classificationEvidence === 'unmatched').length,
    unreadableSourceImages: manifest.filter((item) => item.classificationEvidence === 'unreadable-source').length,
    manuallyReviewedImages: manifest.filter(
      (item) => item.classificationEvidence === 'manual-contact-sheet-review',
    ).length,
    exactDuplicateGroupsPreserved: duplicateGroups.length,
  },
  countsByEvent,
  countsByCategory,
  excluded,
  duplicateGroups,
};

await Promise.all([
  mkdir(path.dirname(manifestPath), { recursive: true }),
  mkdir(path.dirname(reportPath), { recursive: true }),
]);
await Promise.all([
  writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8'),
  writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8'),
]);

console.log(JSON.stringify({ ...report.counts, countsByEvent, countsByCategory }, null, 2));
