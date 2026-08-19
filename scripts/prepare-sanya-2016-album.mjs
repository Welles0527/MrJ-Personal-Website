import { spawnSync } from 'node:child_process';
import { access, mkdir, readdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const repositoryRoot = path.resolve(import.meta.dirname, '..');
const libraryRoot = 'D:\\Personal Data Huawei\\Personal Data\\Photo\\10_Library';
const outputDirectory = path.join(repositoryRoot, 'public', 'images', 'photo-wall', 'sanya-2016');
const dataPath = path.join(repositoryRoot, 'src', 'data', 'sanya-2016-album.json');
const publicPrefix = '/images/photo-wall/sanya-2016';
const albumId = 'e437386c-ac2f-44d5-ac5a-094688c5c9e5';
const coverId = '4c98a0e6-9c70-49ca-9509-2d4dcf40d536';
const expectedCount = 126;
const maxWidth = 1600;
const quality = 82;
const concurrency = 6;

const sql = String.raw`
select json_build_object(
  'id', a.id,
  'originalPath', a."originalPath",
  'takenAt', a."localDateTime",
  'checksum', encode(a.checksum, 'hex')
)::text
from album_asset aa
join asset a on a.id = aa."assetId"
where aa."albumId" = '${albumId}'
  and a."deletedAt" is null
  and a.type = 'IMAGE'
order by a."localDateTime", a.id;
`;

const query = spawnSync(
  'docker',
  ['exec', '-i', 'immich_postgres', 'psql', '-U', 'postgres', '-d', 'immich', '-At'],
  { input: sql, encoding: 'utf8', maxBuffer: 20_000_000 },
);

if (query.status !== 0) {
  throw new Error(`Unable to read the Immich album: ${query.stderr || query.stdout}`);
}

const databaseAssets = query.stdout
  .trim()
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => JSON.parse(line));

if (databaseAssets.length !== expectedCount) {
  throw new Error(`Expected ${expectedCount} album images, received ${databaseAssets.length}`);
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
    missingSources.push(asset.id);
  }
}

if (missingSources.length > 0 || assets.length !== expectedCount) {
  throw new Error(`Missing ${missingSources.length} source images from the local photo library`);
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
    if (!/^2016-12-(2[6-9]|30)$/.test(dayKey)) {
      throw new Error(`Unexpected photo date for ${asset.id}: ${takenAt}`);
    }

    photos[index] = {
      id: asset.id,
      src: `${publicPrefix}/${outputName}`,
      width: metadata.width,
      height: metadata.height,
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
    slug: 'sanya-2016',
    name: '2016 海南三亚',
    eyebrow: 'SANYA · WINTER JOURNAL',
    description: '2016年冬日的三亚旅程。海湾、酒店、街巷与同行片段，依照每天的拍摄时间重新编排。',
    dateRange: '2016年12月26日—30日',
    count: photos.length,
    dayCount: dayOrder.length,
    cover: coverPhoto.src,
    coverId: coverPhoto.id,
    dayOrder,
    countsByDay,
  },
  photos,
};

await mkdir(path.dirname(dataPath), { recursive: true });
await writeFile(dataPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  photos: photos.length,
  days: dayOrder.length,
  countsByDay,
  coverId,
  outputDirectory,
  dataPath,
}, null, 2));
