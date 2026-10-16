import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

// The confirmed coffee-learning portfolio is preserved in homepage-root.html.
const expectedContentHash = 'f7cb448c975c8843c340c174ecf2451b7d8dcc5835b58ae0059b7ad18f6dc82a';
const iconHref = '/officialwebsite/icons/personal-home-orange.png?v=20261012-reference';
const targets = process.argv.slice(2);
if (!targets.length) targets.push('public/homepage-root.html');

for (const target of targets) {
  let html;
  if (/^https?:\/\//.test(target)) {
    const response = await fetch(target, {
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      signal: AbortSignal.timeout(20000),
    });
    assert.equal(response.status, 200, `${target}: HTTP status`);
    html = await response.text();
  } else {
    html = await readFile(target, 'utf8');
  }
  const content = html.replace(/\r\n/g, '\n').replace(/<link\b[^>]*rel="(?:icon|shortcut icon)"[^>]*>/gi, '');
  const hash = createHash('sha256').update(content).digest('hex');
  assert.equal(hash, expectedContentHash, `${target}: content and links must match the last verified root release`);
  const icons = [...html.matchAll(/<link\b[^>]*rel="(?:icon|shortcut icon)"[^>]*>/gi)].map(match => match[0]);
  assert.ok(icons.at(-1)?.includes(iconHref), `${target}: the last favicon must be the requested personal-home icon`);
  console.log(`PASS ${target}: original content and links preserved, requested favicon present`);
}
