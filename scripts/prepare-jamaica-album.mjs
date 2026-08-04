import { mkdir, readFile, writeFile } from 'node:fs/promises';
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
  return value;
};

const manifestPath = path.resolve(required('--manifest'));
const outputDirectory = path.resolve(required('--output'));
const dataPath = path.resolve(required('--data'));
const requestedCoverId = args.get('--cover') || '';
const maxWidth = Number(args.get('--max-width') || 1600);
const quality = Number(args.get('--quality') || 80);
const concurrency = Math.max(1, Math.min(8, Number(args.get('--concurrency') || 4)));

if (!Number.isInteger(maxWidth) || maxWidth < 800 || maxWidth > 2400) {
  throw new Error('--max-width must be an integer from 800 to 2400.');
}
if (!Number.isInteger(quality) || quality < 60 || quality > 90) {
  throw new Error('--quality must be an integer from 60 to 90.');
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
if (!Array.isArray(manifest) || manifest.length === 0) {
  throw new Error('Manifest must be a non-empty JSON array.');
}

const entries = manifest
  .map((entry) => ({
    id: String(entry.assetId || ''),
    sourcePath: String(entry.sourcePath || ''),
    fileName: String(entry.fileName || ''),
    capturedAt: String(entry.localDateTime || ''),
  }))
  .sort((left, right) =>
    left.capturedAt.localeCompare(right.capturedAt) || left.fileName.localeCompare(right.fileName),
  );

for (const entry of entries) {
  if (!/^[0-9a-f-]{36}$/i.test(entry.id) || !entry.sourcePath || !entry.capturedAt) {
    throw new Error(`Invalid manifest entry: ${JSON.stringify(entry)}`);
  }
}

await mkdir(outputDirectory, { recursive: true });
await mkdir(path.dirname(dataPath), { recursive: true });

const photos = new Array(entries.length);
let cursor = 0;

const worker = async () => {
  while (cursor < entries.length) {
    const index = cursor;
    cursor += 1;
    const entry = entries[index];
    const outputName = `${entry.id}.webp`;
    const outputPath = path.join(outputDirectory, outputName);
    const result = await sharp(entry.sourcePath, { failOn: 'none' })
      .rotate()
      .resize({ width: maxWidth, height: maxWidth, fit: 'inside', withoutEnlargement: true })
      .webp({ quality, effort: 4, smartSubsample: true })
      .toFile(outputPath);

    const date = entry.capturedAt.slice(0, 10);
    photos[index] = {
      id: entry.id,
      src: `/images/photo-wall/jamaica/${outputName}`,
      width: result.width,
      height: result.height,
      date,
      year: Number(date.slice(0, 4)),
      fileName: entry.fileName,
    };
  }
};

await Promise.all(Array.from({ length: concurrency }, () => worker()));

const coverId = requestedCoverId || photos[0].id;
const cover = photos.find((photo) => photo.id === coverId);
if (!cover) {
  throw new Error(`Cover asset is not in the manifest: ${coverId}`);
}

const countsByYear = Object.fromEntries(
  [...new Set(photos.map((photo) => photo.year))]
    .sort()
    .map((year) => [String(year), photos.filter((photo) => photo.year === year).length]),
);

const albumData = {
  album: {
    slug: 'jamaica',
    name: '牙买加',
    eyebrow: 'JAMAICA · 2003—2005',
    description: '加勒比海的风、海岸线与那些被留住的日常。',
    dateFrom: '2003-03-14',
    dateTo: '2005-11-24',
    count: photos.length,
    cover: cover.src,
    coverId,
    countsByYear,
  },
  photos,
};

await writeFile(dataPath, `${JSON.stringify(albumData, null, 2)}\n`, 'utf8');

const totalBytes = photos.reduce((sum, photo) => sum + photo.width * photo.height, 0);
console.log(
  JSON.stringify(
    {
      photos: photos.length,
      coverId,
      outputDirectory,
      dataPath,
      decodedMegapixels: Math.round(totalBytes / 1_000_000),
    },
    null,
    2,
  ),
);
