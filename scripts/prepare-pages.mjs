import {cp, mkdir, readFile, readdir, lstat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const ROOT = fileURLToPath(new URL('../', import.meta.url));
const publicFiles = ['index.html', 'styles.css', 'config.js', '.nojekyll'];
const publicDirectories = ['src', 'assets', 'skin image', 'monster', 'background'];

// Publish a fresh allowlisted artifact, never the whole checkout (SQL, tests,
// workflows, node_modules, .env and Git metadata must not reach Pages).
export async function preparePages(root, output) {
  const destination = path.resolve(output);
  const source = path.resolve(root);
  if (destination === source || source.startsWith(destination + path.sep)) {
    throw new Error('Pages output must not contain the repository.');
  }
  await mkdir(destination, {recursive: false});
  async function publicEntry(entry) {
    if ((await lstat(entry)).isSymbolicLink()) throw new Error('Pages assets must not contain symbolic links.');
    return !path.basename(entry).startsWith('.');
  }
  for (const name of publicFiles) {
    if ((await lstat(path.join(source, name))).isSymbolicLink()) throw new Error('Pages assets must not contain symbolic links.');
    await cp(path.join(source, name), path.join(destination, name), {dereference: false});
  }
  for (const name of publicDirectories) {
    await cp(path.join(source, name), path.join(destination, name), {
      recursive: true,
      dereference: false,
      filter: publicEntry,
    });
  }
  for (const name of await readdir(source)) {
    if (/^(bgm_(lobby|dungeon)|sfx_[a-z_]+)\.mp3$/.test(name)) {
      await publicEntry(path.join(source, name));
      await cp(path.join(source, name), path.join(destination, name));
    }
  }
  // Ensure production settings are copied byte-for-byte, never beta-generated.
  if (!(await readFile(path.join(destination, 'config.js'))).equals(await readFile(path.join(source, 'config.js')))) {
    throw new Error('Pages config differs from the checked-out production config.');
  }
  return destination;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const index = process.argv.indexOf('--out');
  if (index < 0 || !process.argv[index + 1]) throw new Error('Use --out with a fresh artifact directory.');
  console.log('Pages artifact: ' + await preparePages(ROOT, process.argv[index + 1]));
}
