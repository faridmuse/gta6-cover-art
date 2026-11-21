// Tiny static server for trying the app locally: serves app/ at http://localhost:8080.
// No build step; the app is plain static files. Run: node serve.ts
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), 'app');
const types = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.mjs': 'text/javascript', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.ttf': 'font/ttf', '.txt': 'text/plain',
};

const server = createServer(async (req, res) => {
  const path = req.url.split('?')[0];
  const file = join(root, path === '/' ? 'index.html' : decodeURIComponent(path));
  if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404); res.end('not found');
  }
});

server.listen(8080, () => console.log('Neon Coast Cover Studio at http://localhost:8080'));
