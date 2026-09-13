import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const readJson = async name => JSON.parse(await readFile(path.join(root, 'src/data', name), 'utf8'));
const albums = await readJson('travel-2018-albums.json');
for (const name of ['coffee-latte-art-album.json', 'jamaica-photo-album.json', 'japan-kanto-2015-album.json', 'sanya-2016-album.json']) albums.push(await readJson(name));
const photos = new Map();
for (const item of albums) {
  assert.equal(item.album.count, item.photos.length, `Photo count mismatch: ${item.album.slug}`);
  for (const photo of item.photos) {
    const existing = photos.get(photo.id);
    if (existing) existing.albumSlugs.push(item.album.slug);
    else photos.set(photo.id, { id: photo.id, src: photo.src, width: photo.width, height: photo.height, takenAt: photo.takenAt ?? '', albumSlugs: [item.album.slug] });
  }
}
const ids = JSON.stringify([...photos.keys()]).replaceAll("'", "''");
const sql = `with requested as (select value photo_id from jsonb_array_elements_text('${ids}'::jsonb)), matched as (
  select r.photo_id,a.id from requested r join asset a on a.id::text=r.photo_id where a."deletedAt" is null
  union select r.photo_id,a.id from requested r join asset a on encode(a.checksum,'hex')=r.photo_id where a."deletedAt" is null and length(r.photo_id)=40
) select json_build_object('photoId',m.photo_id,'city',e.city,'state',e.state,'country',e.country,'latitude',e.latitude,'longitude',e.longitude) from matched m left join asset_exif e on e."assetId"=m.id;`;
const query = spawnSync('docker', ['exec', '-i', 'immich_postgres', 'psql', '-U', 'postgres', '-d', 'immich', '-At', '-v', 'ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8', maxBuffer: 20000000 });
if (query.status !== 0) throw new Error(query.stderr || query.stdout);
const rows = query.stdout.trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
const countries = { "People's Republic of China": '中国', China: '中国', Macao: '中国', 'United States of America': '美国', Türkiye: '土耳其', Australia: '澳大利亚', 'United Kingdom': '英国', France: '法国', Singapore: '新加坡', Japan: '日本', 'Czech Republic': '捷克', Germany: '德国', 'South Korea': '韩国', Jamaica: '牙买加' };
const names = { 'San Francisco': '旧金山', 'Los Angeles': '洛杉矶', 'Santa Monica': '圣莫尼卡', 'Santa Barbara': '圣巴巴拉', Stanford: '斯坦福', Alameda: '阿拉米达', 'Santa Clara': '圣克拉拉', Glendale: '格伦代尔', Burbank: '伯班克', Solvang: '索尔万', 'San Jose': '圣何塞', Oakland: '奥克兰', Cambria: '坎布里亚', Cayucos: '卡尤科斯', 'Morro Bay': '莫罗贝', 'Carmel-by-the-Sea': '卡梅尔', Istanbul: '伊斯坦布尔', Göreme: '格雷梅', Pamukkale: '棉花堡', Antalya: '安塔利亚', Kaş: '卡什', Fethiye: '费特希耶', Çeşme: '切什梅', Selçuk: '塞尔丘克', Üsküdar: '于斯屈达尔', Ölüdeniz: '厄吕代尼兹', Shanghai: '上海', Beijing: '北京', Macao: '澳门', Guangzhou: '广州', Zhuhai: '珠海', Xiamen: '厦门', London: '伦敦', Melbourne: '墨尔本', Sydney: '悉尼', Cairns: '凯恩斯', 'Port Campbell': '坎贝尔港', Singapore: '新加坡', Kyoto: '京都', Fukuoka: '福冈', Prague: '布拉格', Cannes: '戛纳' };
const clean = value => String(value ?? '').normalize('NFKC').trim();
const groups = new Map();
const located = new Set();
for (const row of rows) {
  if (!clean(row.city) || !clean(row.country) || !Number.isFinite(row.latitude) || !Number.isFinite(row.longitude) || Math.abs(row.latitude) > 90 || Math.abs(row.longitude) > 180) continue;
  assert(!located.has(row.photoId), `Ambiguous location for photo ${row.photoId}`);
  located.add(row.photoId);
  const country = countries[row.country] ?? clean(row.country);
  // Immich can return districts for these municipality-level regions.
  const city = row.country === 'Macao' ? 'Macao' : row.country === "People's Republic of China" && ['Shanghai', 'Beijing'].includes(row.state) ? row.state : clean(row.city);
  const key = city === 'Macao' ? '中国|Macao' : [country, clean(row.state), city].join('|');
  if (!groups.has(key)) groups.set(key, { id: `city-${createHash('sha256').update(key).digest('hex').slice(0, 16)}`, name: names[city] ?? city, originalName: city, country, photos: [], positions: [], sourceNames: new Set() });
  const group = groups.get(key);
  group.photos.push(photos.get(row.photoId));
  group.positions.push({ latitude: row.latitude, longitude: row.longitude });
  group.sourceNames.add(clean(row.city));
}
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const cities = [];
const photoDirectory = path.join(root, 'public/data/travel-cities');
await mkdir(photoDirectory, { recursive: true });
for (const group of groups.values()) {
  group.photos.sort((a, b) => a.takenAt.localeCompare(b.takenAt) || a.id.localeCompare(b.id));
  for (const photo of group.photos) await access(path.join(root, 'public', photo.src));
  const albumSlugs = [...new Set(group.photos.flatMap(photo => photo.albumSlugs))];
  const coverIds = albums.filter(item => albumSlugs.includes(item.album.slug)).map(item => item.album.coverId);
  const cover = group.photos.find(photo => coverIds.includes(photo.id)) ?? group.photos[0];
  cities.push({ id: group.id, name: group.name, markerName: group.name, originalName: group.originalName, sourceNames: [...group.sourceNames].sort(), country: group.country, region: `${group.country} · ${group.name}`, count: group.photos.length, latitude: median(group.positions.map(p => p.latitude)), longitude: median(group.positions.map(p => p.longitude)), cover: cover.src, albumSlugs, photosPath: `/data/travel-cities/${group.id}.json` });
  await writeFile(path.join(photoDirectory, `${group.id}.json`), `${JSON.stringify({ id: group.id, name: group.name, photos: group.photos })}\n`);
}
cities.sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));
const albumLinks = albums.map(item => ({ slug: item.album.slug, name: item.album.name, count: item.photos.length, unlocatedCount: item.photos.filter(photo => !located.has(photo.id)).length, cover: item.album.cover }));
const index = { totalPhotos: photos.size, locatedPhotos: located.size, unlocatedPhotos: photos.size - located.size, albumPhotoCount: albums.reduce((sum, item) => sum + item.photos.length, 0), albums: albumLinks, cities };
assert.equal(cities.reduce((sum, city) => sum + city.count, 0), index.locatedPhotos);
assert.equal(index.locatedPhotos + index.unlocatedPhotos, index.totalPhotos);
await writeFile(path.join(root, 'src/data/travel-city-map.json'), `${JSON.stringify(index, null, 2)}\n`);
console.log(JSON.stringify({ cities: cities.length, totalPhotos: index.totalPhotos, locatedPhotos: index.locatedPhotos, unlocatedPhotos: index.unlocatedPhotos, albums: albums.length }));
