import { cp, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, '..');
const source = path.join(path.dirname(require.resolve('cesium/package.json')), 'Build/Cesium');
const destination = path.join(root, 'public/cesium');
await mkdir(destination, { recursive: true });
for (const directory of ['Assets', 'Workers', 'ThirdParty', 'Widgets']) {
  await cp(path.join(source, directory), path.join(destination, directory), { recursive: true });
}
console.log('Cesium local imagery and runtime assets prepared.');
