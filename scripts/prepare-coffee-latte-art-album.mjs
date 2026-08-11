import { spawnSync } from 'node:child_process';
import { mkdir, readdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const albumId = '29eaa1e0-5142-4525-a49e-5f2092b7eae7';
const repositoryRoot = path.resolve(import.meta.dirname, '..');
const libraryRoot = 'D:\\Personal Data Huawei\\Personal Data\\Photo\\10_Library';
const outputDirectory = path.join(repositoryRoot, 'public', 'images', 'photo-wall', 'coffee-latte-art');
const dataPath = path.join(repositoryRoot, 'src', 'data', 'coffee-latte-art-album.json');
const publicPrefix = '/images/photo-wall/coffee-latte-art';
const expectedAlbumCount = 310;
const maxWidth = 1600;
const quality = 82;
const concurrency = 6;

const sql = String.raw`
select json_build_object(
  'id', a.id,
  'originalPath', a."originalPath",
  'fileName', a."originalFileName",
  'takenAt', coalesce(e."dateTimeOriginal", a."localDateTime", a."fileCreatedAt"),
  'latitude', e.latitude,
  'longitude', e.longitude,
  'city', e.city,
  'state', e.state,
  'country', e.country,
  'isCover', a.id = al."albumThumbnailAssetId",
  'albumUpdatedAt', al."updatedAt"
)::text
from album al
join album_asset aa on aa."albumId" = al.id
join asset a on a.id = aa."assetId"
left join asset_exif e on e."assetId" = a.id
where al.id = '${albumId}'
  and a."deletedAt" is null
  and a.type = 'IMAGE'
order by coalesce(e."dateTimeOriginal", a."localDateTime", a."fileCreatedAt") desc, a."originalFileName";
`;

const query = spawnSync(
  'docker',
  ['exec', '-i', 'immich_postgres', 'psql', '-U', 'postgres', '-d', 'immich', '-At'],
  { input: sql, encoding: 'utf8', maxBuffer: 20_000_000 },
);

if (query.status !== 0) {
  throw new Error(`Unable to read the Immich album: ${query.stderr || query.stdout}`);
}

const assets = query.stdout
  .trim()
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => JSON.parse(line));

if (assets.length !== expectedAlbumCount) {
  throw new Error(`Expected ${expectedAlbumCount} Immich assets, received ${assets.length}`);
}
if (new Set(assets.map((asset) => asset.id)).size !== assets.length) {
  throw new Error('Immich returned duplicate asset IDs');
}

await mkdir(outputDirectory, { recursive: true });
const expectedFiles = new Set(assets.map((asset) => `${asset.id}.webp`));
const photos = new Array(assets.length);
let cursor = 0;

const resolveSourcePath = (originalPath) => {
  const prefix = '/mnt/library/';
  if (!originalPath.startsWith(prefix)) {
    throw new Error(`Unsupported Immich source path: ${originalPath}`);
  }
  return path.join(libraryRoot, ...originalPath.slice(prefix.length).split('/'));
};

const roundCoordinate = (value) => {
  if (value === null || value === undefined) return null;
  return Math.round(Number(value) * 1000) / 1000;
};

const worker = async () => {
  while (cursor < assets.length) {
    const index = cursor;
    cursor += 1;
    const asset = assets[index];
    const sourcePath = resolveSourcePath(asset.originalPath);
    const outputName = `${asset.id}.webp`;
    const destination = path.join(outputDirectory, outputName);

    await sharp(sourcePath, { failOn: 'none', animated: false })
      .rotate()
      .resize({ width: maxWidth, withoutEnlargement: true })
      .webp({ quality, effort: 5 })
      .toFile(destination);

    const metadata = await sharp(destination).metadata();
    const takenAt = new Date(asset.takenAt);
    if (Number.isNaN(takenAt.valueOf())) throw new Error(`Invalid photo date for ${asset.fileName}`);
    const year = takenAt.getUTCFullYear();
    const month = takenAt.getUTCMonth() + 1;

    photos[index] = {
      id: asset.id,
      src: `${publicPrefix}/${outputName}`,
      width: metadata.width,
      height: metadata.height,
      fileName: asset.fileName,
      takenAt: takenAt.toISOString(),
      year,
      month,
      monthKey: `${year}-${String(month).padStart(2, '0')}`,
      latitude: roundCoordinate(asset.latitude),
      longitude: roundCoordinate(asset.longitude),
      city: asset.city || null,
      state: asset.state || null,
      country: asset.country || null,
      isCover: Boolean(asset.isCover),
    };
  }
};

await Promise.all(Array.from({ length: concurrency }, () => worker()));

for (const fileName of await readdir(outputDirectory)) {
  if (path.extname(fileName).toLowerCase() === '.webp' && !expectedFiles.has(fileName)) {
    await unlink(path.join(outputDirectory, fileName));
  }
}

const locationPhotos = photos.filter((photo) => photo.latitude !== null && photo.longitude !== null);
const locationMap = new Map();
for (const photo of locationPhotos) {
  const key = `${photo.latitude.toFixed(3)}|${photo.longitude.toFixed(3)}`;
  if (!locationMap.has(key)) {
    const place = photo.city || photo.state || photo.country || '未标注地点';
    const area = [photo.state, photo.country].filter((value, index, values) => value && value !== place && values.indexOf(value) === index);
    locationMap.set(key, {
      id: key,
      label: place,
      area: area.join(' · '),
      latitude: photo.latitude,
      longitude: photo.longitude,
      photoIds: [],
    });
  }
  locationMap.get(key).photoIds.push(photo.id);
}

const locations = [...locationMap.values()]
  .map((location) => ({ ...location, count: location.photoIds.length }))
  .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'zh-CN'));
const yearOrder = [...new Set(photos.map((photo) => photo.year))].sort((a, b) => b - a);
const countsByYear = Object.fromEntries(yearOrder.map((year) => [year, photos.filter((photo) => photo.year === year).length]));
const coverPhoto = photos.find((photo) => photo.isCover) || photos[0];

const data = {
  album: {
    slug: 'coffee-latte-art',
    sourceAlbumId: albumId,
    sourceUpdatedAt: assets[0].albumUpdatedAt,
    name: '咖啡拉花',
    eyebrow: 'COFFEE · LATTE ART JOURNAL',
    description: '从第一杯被记录的纹理，到旅途中偶遇的心形与叶片；一册关于咖啡、地点与日常时间的视觉笔记。',
    count: photos.length,
    cover: coverPhoto.src,
    coverId: coverPhoto.id,
    yearOrder,
    countsByYear,
    monthCount: new Set(photos.map((photo) => photo.monthKey)).size,
    locationPhotoCount: locationPhotos.length,
    locationCount: locations.length,
  },
  photos,
  locations,
};

await mkdir(path.dirname(dataPath), { recursive: true });
await writeFile(dataPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  photos: photos.length,
  years: yearOrder.length,
  months: data.album.monthCount,
  locationPhotos: locationPhotos.length,
  locations: locations.length,
  cover: coverPhoto.fileName,
  outputDirectory,
  dataPath,
}, null, 2));
