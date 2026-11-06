// Local dev server for public/ (no dependencies): node scripts/serve.mjs [port]
// Listens on this computer only (127.0.0.1); a malformed request gets a 400 instead of stopping the server.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = fs.realpathSync(path.resolve('public'));
const port = Number(process.argv[2]) || 3000;
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ico': 'image/x-icon' };

http.createServer((req, res) => {
  let rel;
  try {
    rel = decodeURIComponent(new URL(req.url, 'http://x').pathname); // throws on a malformed escape such as /%E0%A4%A
  } catch (e) {
    res.writeHead(400).end('Bad request');
    return;
  }
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.join(root, rel);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404).end('Not found'); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}).on('clientError', (err, socket) => { if (socket.writable) socket.end('HTTP/1.1 400 Bad Request\r\n\r\n'); })
  .listen(port, '127.0.0.1', () => console.log(`http://localhost:${port}`));
