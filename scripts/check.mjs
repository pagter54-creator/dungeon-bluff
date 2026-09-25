import { readdir, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) out.push(...await walk(filename)); else out.push(filename);
  }
  return out;
}
let count = 0;
for (const filename of await walk(root)) {
  if (!/\.(m?js|ts)$/.test(filename)) continue;
  const result = spawnSync(process.execPath, ['--check', filename], { encoding: 'utf8' });
  if (result.status !== 0) { process.stderr.write(result.stderr); process.exitCode = 1; }
  else count++;
  const source = await readFile(filename, 'utf8');
  for (const match of source.matchAll(/(?:from\s*|import\s*\()\s*['"](\.[^'"]+)['"]/g)) {
    try { await readFile(path.resolve(path.dirname(filename), match[1])); }
    catch { console.error(`Missing module: ${filename} -> ${match[1]}`); process.exitCode = 1; }
  }
}
const html = await readFile(path.join(root, 'index.html'), 'utf8');
for (const match of html.matchAll(/(?:src|href)="(\.\/[^"?#]+)"/g)) {
  try { await readFile(path.join(root, match[1])); }
  catch { console.error(`Missing HTML asset: ${match[1]}`); process.exitCode = 1; }
}
console.log(`${count} JavaScript/TypeScript files parsed; local module and HTML asset references checked.`);
if (process.exitCode) process.exit(process.exitCode);
