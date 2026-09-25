import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = Number(process.env.PORT || 5173);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg' };
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${port}`);
    const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
    // Only public web assets are served; backend source, dotfiles and credentials are not.
    if (!['index.html', 'config.js', 'styles.css', 'bgm_lobby.mp3', 'bgm_dungeon.mp3'].includes(relative) && !/^sfx_[a-z_]+\.mp3$/.test(relative) && !/^(src|assets)\/[a-zA-Z0-9_./-]+$/.test(relative) && !/^(skin image|monster)\/[a-zA-Z0-9_-]+\.png$/.test(relative) && !/^background\/background[1-9][0-9]*\.png$/.test(relative)) throw new Error('not found');
    const filename = path.resolve(root, relative);
    if (!filename.startsWith(root) || relative.split('/').some(p => p.startsWith('.'))) throw new Error('not found');
    const info = await stat(filename);
    if (!info.isFile()) throw new Error('not found');
    const data = await readFile(filename);
    res.writeHead(200, { 'Content-Type': types[path.extname(filename)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(data);
  } catch { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Not found'); }
});
server.listen(port, '127.0.0.1', () => console.log(`눈치 레이드: http://localhost:${port}\n종료: Ctrl+C`));
