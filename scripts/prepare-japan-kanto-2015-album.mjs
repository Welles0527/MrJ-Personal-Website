import { spawnSync } from 'node:child_process';
import { access, mkdir, readdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const repositoryRoot = path.resolve(import.meta.dirname, '..');
const libraryRoot = 'D:\\Personal Data Huawei\\Personal Data\\Photo\\10_Library';
const outputDirectory = path.join(repositoryRoot, 'public', 'images', 'photo-wall', 'japan-kanto-2015');
const dataPath = path.join(repositoryRoot, 'src', 'data', 'japan-kanto-2015-album.json');
const publicPrefix = '/images/photo-wall/japan-kanto-2015';
const expectedAvailableCount = 378;
const expectedDatabaseCount = 379;
const coverId = '7ec31cfd-01bf-4925-8421-6a7b7f617d95';
const maxWidth = 1600;
const quality = 82;
const concurrency = 6;

const sql = String.raw`
select json_build_object(
  'id', a.id,
  'originalPath', a."originalPath",
  'fileName', a."originalFileName",
  'takenAt', a."localDateTime",
  'checksum', encode(a.checksum, 'hex')
)::text
from asset a
where a."deletedAt" is null
  and a.type = 'IMAGE'
  and a."localDateTime"::date between date '2015-04-26' and date '2015-05-03'
order by a."localDateTime", a."originalFileName";
`;

const query = spawnSync(
  'docker',
  ['exec', '-i', 'immich_postgres', 'psql', '-U', 'postgres', '-d', 'immich', '-At'],
  { input: sql, encoding: 'utf8', maxBuffer: 20_000_000 },
);

if (query.status !== 0) {
  throw new Error(`Unable to read the Immich library: ${query.stderr || query.stdout}`);
}

const databaseAssets = query.stdout
  .trim()
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => JSON.parse(line));

if (databaseAssets.length !== expectedDatabaseCount) {
  throw new Error(`Expected ${expectedDatabaseCount} database assets, received ${databaseAssets.length}`);
}
if (new Set(databaseAssets.map((asset) => asset.id)).size !== databaseAssets.length) {
  throw new Error('Immich returned duplicate asset IDs');
}
if (new Set(databaseAssets.map((asset) => asset.checksum)).size !== databaseAssets.length) {
  throw new Error('Immich returned duplicate image checksums');
}

const resolveSourcePath = (originalPath) => {
  const prefix = '/mnt/library/';
  if (!originalPath.startsWith(prefix)) {
    throw new Error(`Unsupported Immich source path: ${originalPath}`);
  }
  return path.join(libraryRoot, ...originalPath.slice(prefix.length).split('/'));
};

const assets = [];
const missingSources = [];
for (const asset of databaseAssets) {
  const sourcePath = resolveSourcePath(asset.originalPath);
  try {
    await access(sourcePath);
    assets.push({ ...asset, sourcePath });
  } catch {
    missingSources.push({ id: asset.id, fileName: asset.fileName, originalPath: asset.originalPath });
  }
}

if (assets.length !== expectedAvailableCount) {
  throw new Error(`Expected ${expectedAvailableCount} readable source files, received ${assets.length}`);
}
if (!assets.some((asset) => asset.id === coverId)) {
  throw new Error(`Cover asset ${coverId} is not available`);
}

await mkdir(outputDirectory, { recursive: true });
const expectedFiles = new Set(assets.map((asset) => `${asset.id}.webp`));
const photos = new Array(assets.length);
let cursor = 0;

const worker = async () => {
  while (cursor < assets.length) {
    const index = cursor;
    cursor += 1;
    const asset = assets[index];
    const outputName = `${asset.id}.webp`;
    const destination = path.join(outputDirectory, outputName);

    await sharp(asset.sourcePath, { failOn: 'none', animated: false })
      .rotate()
      .resize({ width: maxWidth, withoutEnlargement: true })
      .webp({ quality, effort: 5 })
      .toFile(destination);

    const metadata = await sharp(destination).metadata();
    const takenAt = String(asset.takenAt);
    const dayKey = takenAt.slice(0, 10);
    if (!/^2015-(04-(2[6-9]|30)|05-0[1-3])$/.test(dayKey)) {
      throw new Error(`Invalid local photo date for ${asset.fileName}: ${takenAt}`);
    }

    photos[index] = {
      id: asset.id,
      src: `${publicPrefix}/${outputName}`,
      width: metadata.width,
      height: metadata.height,
      fileName: asset.fileName,
      takenAt,
      dayKey,
    };
  }
};

await Promise.all(Array.from({ length: concurrency }, () => worker()));

for (const fileName of await readdir(outputDirectory)) {
  if (path.extname(fileName).toLowerCase() === '.webp' && !expectedFiles.has(fileName)) {
    await unlink(path.join(outputDirectory, fileName));
  }
}

const dayOrder = [...new Set(photos.map((photo) => photo.dayKey))];
const countsByDay = Object.fromEntries(dayOrder.map((day) => [day, photos.filter((photo) => photo.dayKey === day).length]));
const coverPhoto = photos.find((photo) => photo.id === coverId);

const data = {
  album: {
    slug: 'japan-kanto-2015',
    name: '2015年日本（关东）',
    eyebrow: 'JAPAN · KANTO JOURNAL',
    description: '2015年春日旅程的八日影像。从街道、车站与餐桌，到行走途中偶遇的人和景，依照每天的拍摄时间重新编排。',
    dateRange: '2015年4月26日—5月3日',
    count: photos.length,
    dayCount: dayOrder.length,
    cover: coverPhoto.src,
    coverId: coverPhoto.id,
    dayOrder,
    countsByDay,
    sourceDatabaseCount: databaseAssets.length,
    missingSourceCount: missingSources.length,
  },
  photos,
  audit: {
    generatedAt: new Date().toISOString(),
    missingSources,
  },
};

await mkdir(path.dirname(dataPath), { recursive: true });
await writeFile(dataPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  photos: photos.length,
  days: dayOrder.length,
  countsByDay,
  missingSources,
  cover: coverPhoto.fileName,
  outputDirectory,
  dataPath,
}, null, 2));
