import { spawnSync } from 'node:child_process';
import { mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises';
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

const manifestPath = required('--manifest');
const outputDirectory = required('--output');
const dataPath = required('--data');
const maxWidth = Number(args.get('--max-width') || 1600);
const quality = Number(args.get('--quality') || 80);
const concurrency = Number(args.get('--concurrency') || 8);
const publicPrefix = '/images/photo-wall/jamaica';

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
if (!Array.isArray(manifest) || manifest.length === 0) throw new Error('Manifest is empty');

await mkdir(outputDirectory, { recursive: true });
const expectedFiles = new Set(manifest.map((item) => `${item.id}.webp`));

const pythonBmpFallback = String.raw`
from PIL import Image, ImageOps
import sys
source, destination, max_width, quality = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
with Image.open(source) as image:
    image = ImageOps.exif_transpose(image).convert('RGB')
    if image.width > max_width:
        height = round(image.height * max_width / image.width)
        image = image.resize((max_width, height), Image.Resampling.LANCZOS)
    image.save(destination, 'WEBP', quality=quality, method=6)
`;

let cursor = 0;
const prepared = new Array(manifest.length);
const worker = async () => {
  while (cursor < manifest.length) {
    const index = cursor;
    cursor += 1;
    const item = manifest[index];
    const fileName = `${item.id}.webp`;
    const destination = path.join(outputDirectory, fileName);
    try {
      await sharp(item.sourcePath, { failOn: 'none', animated: false })
        .rotate()
        .resize({ width: maxWidth, withoutEnlargement: true })
        .webp({ quality, effort: 5 })
        .toFile(destination);
    } catch (error) {
      if (path.extname(item.sourcePath).toLowerCase() !== '.bmp') throw error;
      const fallback = spawnSync(
        'python',
        ['-c', pythonBmpFallback, item.sourcePath, destination, String(maxWidth), String(quality)],
        { encoding: 'utf8', maxBuffer: 1_000_000 },
      );
      if (fallback.status !== 0) {
        throw new Error(`BMP conversion failed for ${item.relativePath}: ${fallback.stderr || fallback.stdout}`);
      }
    }
    const metadata = await sharp(destination).metadata();
    prepared[index] = {
      id: item.id,
      src: `${publicPrefix}/${fileName}`,
      width: metadata.width,
      height: metadata.height,
      event: item.event,
      chapter: item.chapter,
      chapterPath: item.chapterPath,
      category: item.category,
      fileName: item.fileName,
      relativePath: item.relativePath,
    };
  }
};

await Promise.all(Array.from({ length: concurrency }, () => worker()));

for (const fileName of await readdir(outputDirectory)) {
  if (path.extname(fileName).toLowerCase() === '.webp' && !expectedFiles.has(fileName)) {
    await unlink(path.join(outputDirectory, fileName));
  }
}

const eventOrder = [...new Set(prepared.map((photo) => photo.event))];
const countsByEvent = Object.fromEntries(
  eventOrder.map((event) => [event, prepared.filter((photo) => photo.event === event).length]),
);
const countsByCategory = {
  people: prepared.filter((photo) => photo.category === 'people').length,
  scenery: prepared.filter((photo) => photo.category === 'scenery').length,
};
const chapterCount = new Set(prepared.map((photo) => `${photo.event}\u0000${photo.chapter}`)).size;
const coverPhoto =
  prepared.find(
    (photo) => photo.event === 'Jamaica标志性照片' && photo.chapterPath.length === 0 && photo.fileName === '01.jpg',
  ) || prepared[0];
const data = {
  album: {
    slug: 'jamaica',
    name: '牙买加',
    eyebrow: 'JAMAICA · LIFE ARCHIVE',
    description: '依照生活照片目录重新编排的牙买加记忆：大事、小事、考察与那些具有标志性的瞬间。',
    count: prepared.length,
    chapterCount,
    cover: coverPhoto.src,
    coverId: coverPhoto.id,
    eventOrder,
    countsByEvent,
    countsByCategory,
  },
  photos: prepared,
};

await mkdir(path.dirname(dataPath), { recursive: true });
await writeFile(dataPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
console.log(
  JSON.stringify(
    {
      photos: prepared.length,
      chapters: chapterCount,
      countsByEvent,
      countsByCategory,
      cover: coverPhoto.relativePath,
      removedStaleWebp: 'complete',
    },
    null,
    2,
  ),
);
