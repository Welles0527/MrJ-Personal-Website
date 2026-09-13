import { spawnSync } from 'node:child_process';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const library = 'D:/Personal Data Huawei/Personal Data/Photo/10_Library';
const albumId = '7cdf0544-c3f4-4612-8225-12796b65e022';
const slug = 'turkey-2019';
const expectedCount = 1656;
const dataPath = path.join(root, 'src/data/travel-2018-albums.json');
const directory = path.join(root, 'public/images/photo-wall', slug);

function query(sql) {
  const result = spawnSync('docker', ['exec', '-i', 'immich_postgres', 'psql', '-U', 'postgres', '-d', 'immich', '-At', '-v', 'ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8', maxBuffer: 30000000 });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  return result.stdout.trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
}

const [album] = query(`select json_build_object('name',"albumName",'coverId',"albumThumbnailAssetId") from album where id='${albumId}' and "deletedAt" is null;`);
const assets = query(`select json_build_object('id',a.id,'originalPath',a."originalPath",'takenAt',a."localDateTime",'type',a.type,'checksum',encode(a.checksum,'hex'),'deleted',a."deletedAt" is not null) from album_asset aa join asset a on a.id=aa."assetId" where aa."albumId"='${albumId}' order by a."localDateTime",a.id;`);
if (!album || assets.length !== expectedCount || assets.some(asset => asset.type !== 'IMAGE' || asset.deleted)) {
  throw new Error(`Expected ${expectedCount} active photos in the Turkey album`);
}
if (new Set(assets.map(asset => asset.id)).size !== expectedCount || new Set(assets.map(asset => asset.checksum)).size !== expectedCount) {
  throw new Error('Immich returned duplicate photos');
}
if (!assets.some(asset => asset.id === album.coverId)) throw new Error('Album cover is missing');
for (const asset of assets) {
  if (!asset.originalPath.startsWith('/mnt/library/')) throw new Error(`Unsupported source: ${asset.id}`);
  if (!/^2019-09-(1[1-9]|2[0-3])T/.test(asset.takenAt)) throw new Error(`Unexpected photo date: ${asset.id}`);
  asset.source = path.join(library, asset.originalPath.slice('/mnt/library/'.length));
  await access(asset.source);
}
console.log(`Verified ${assets.length} unique photos and readable source files.`);

await mkdir(directory, { recursive: true });
const photos = new Array(assets.length);
let cursor = 0;
let completed = 0;
await Promise.all(Array.from({ length: 6 }, async () => {
  while (cursor < assets.length) {
    const index = cursor++;
    const asset = assets[index];
    const info = await sharp(asset.source, { failOn: 'error', animated: false }).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 82, effort: 5 }).toFile(path.join(directory, `${asset.id}.webp`));
    const takenAt = String(asset.takenAt);
    photos[index] = { id: asset.id, src: `/images/photo-wall/${slug}/${asset.id}.webp`, width: info.width, height: info.height, takenAt, dayKey: takenAt.slice(0, 10) };
    completed++;
    if (completed % 200 === 0 || completed === assets.length) console.log(`Prepared ${completed}/${assets.length} photos.`);
  }
}));

const dayOrder = [...new Set(photos.map(photo => photo.dayKey))];
const countsByDay = Object.fromEntries(dayOrder.map(day => [day, photos.filter(photo => photo.dayKey === day).length]));
const turkeyAlbum = {
  title: '土耳其',
  date: '2019年9月',
  region: 'overseas',
  album: {
    slug,
    name: album.name,
    eyebrow: 'TÜRKIYE · SEPTEMBER 2019',
    description: '2019年9月的土耳其旅行照片，保留原相册封面，按实际拍摄日期编排。',
    dateRange: `${dayOrder[0]} — ${dayOrder.at(-1)}`,
    count: photos.length,
    dayCount: dayOrder.length,
    cover: photos.find(photo => photo.id === album.coverId).src,
    coverId: album.coverId,
    dayOrder,
    countsByDay,
  },
  photos,
};
const existing = JSON.parse(await readFile(dataPath, 'utf8'));
await writeFile(dataPath, `${JSON.stringify([turkeyAlbum, ...existing.filter(item => item.album.slug !== slug)], null, 2)}\n`);
console.log(JSON.stringify({ slug, count: photos.length, days: dayOrder.length, countsByDay, coverId: album.coverId, directory, dataPath }, null, 2));
