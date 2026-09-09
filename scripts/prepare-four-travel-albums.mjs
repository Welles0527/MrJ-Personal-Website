import { spawnSync } from 'node:child_process';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const library = 'D:/Personal Data Huawei/Personal Data/Photo/10_Library';
const definitions = [
  ['6495d97e-cbbf-409c-8ad7-013f22dc1bca', 'guang-shen-zhu-2019', '广深珠', '2019年3月', 'domestic', 625],
  ['47ed2fe2-aa28-4368-bc1f-6ec5d80545e4', 'jiuzhaigou-2014', '九寨沟', '2014年8月', 'domestic', 66],
  ['7513588c-c1ab-4588-900d-c5beec3057f0', 'germany-czech-2015', '德国捷克', '2015年10月', 'overseas', 530],
  ['5237f188-b632-439c-aa5e-d1996b88f7f5', 'australia-2013', '澳洲', '2013年11月', 'overseas', 303],
];
function query(sql) {
  const result = spawnSync('docker', ['exec', '-i', 'immich_postgres', 'psql', '-U', 'postgres', '-d', 'immich', '-At'], { input: sql, encoding: 'utf8', maxBuffer: 30000000 });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  return result.stdout.trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
}
const prepared = [];
for (const [id, slug, title, date, region, expected] of definitions) {
  const [album] = query(`select json_build_object('name',"albumName",'coverId',"albumThumbnailAssetId") from album where id='${id}';`);
  const assets = query(`select json_build_object('id',a.id,'originalPath',a."originalPath",'takenAt',a."localDateTime",'type',a.type) from album_asset aa join asset a on a.id=aa."assetId" where aa."albumId"='${id}' and a."deletedAt" is null order by a."localDateTime",a.id;`);
  if (assets.length !== expected || new Set(assets.map(a => a.id)).size !== expected || assets.some(a => a.type !== 'IMAGE')) throw new Error(`Invalid assets: ${slug}`);
  if (!assets.some(a => a.id === album.coverId)) throw new Error(`Missing cover: ${slug}`);
  for (const asset of assets) {
    if (!asset.originalPath.startsWith('/mnt/library/')) throw new Error(`Unsupported source: ${asset.id}`);
    asset.source = path.join(library, asset.originalPath.slice('/mnt/library/'.length));
    await access(asset.source);
  }
  prepared.push({ slug, title, date, region, album, assets });
}
const generated = [];
for (const { slug, title, date, region, album, assets } of prepared) {
  const directory = path.join(root, 'public/images/photo-wall', slug);
  await mkdir(directory, { recursive: true });
  const photos = new Array(assets.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (cursor < assets.length) {
      const index = cursor++;
      const asset = assets[index];
      const info = await sharp(asset.source, { failOn: 'none', animated: false }).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 82, effort: 5 }).toFile(path.join(directory, `${asset.id}.webp`));
      const takenAt = String(asset.takenAt);
      photos[index] = { id: asset.id, src: `/images/photo-wall/${slug}/${asset.id}.webp`, width: info.width, height: info.height, takenAt, dayKey: takenAt.slice(0, 10) };
    }
  }));
  const dayOrder = [...new Set(photos.map(p => p.dayKey))];
  const countsByDay = Object.fromEntries(dayOrder.map(day => [day, photos.filter(p => p.dayKey === day).length]));
  generated.push({ title, date, region, album: { slug, name: album.name, eyebrow: date, description: `${date}，${title}的旅行照片，按原始拍摄日期编排。`, dateRange: `${dayOrder[0]} — ${dayOrder.at(-1)}`, count: photos.length, dayCount: dayOrder.length, cover: photos.find(p => p.id === album.coverId).src, coverId: album.coverId, dayOrder, countsByDay }, photos });
  console.log(JSON.stringify({ slug, count: photos.length, days: dayOrder.length, dates: [dayOrder[0], dayOrder.at(-1)], coverId: album.coverId }));
}
const dataPath = path.join(root, 'src/data/travel-2018-albums.json');
const existing = JSON.parse(await readFile(dataPath, 'utf8'));
const california = existing.find(a => a.album.slug === 'california-2019');
if (california) {
  california.title = '洛杉矶+旧金山';
  california.album.name = '2019年1月 洛杉矶+旧金山';
}
const slugs = new Set(generated.map(a => a.album.slug));
const all = [...existing.filter(a => !slugs.has(a.album.slug)), ...generated].sort((a, b) => b.album.dayOrder[0].localeCompare(a.album.dayOrder[0]));
await writeFile(dataPath, JSON.stringify(all, null, 2) + '\n');
