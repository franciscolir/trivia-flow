// Servidor estÃ¡tico mÃ­nimo para pruebas locales.
// Sirve los archivos del proyecto mapeando URLs limpias (sin .html)
// igual que hace Firebase Hosting (/play -> /play.html).
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = process.env.PORT || 4173;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json'
};

const server = http.createServer((req, res) => {
  try {
let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    if (urlPath === '/') urlPath = '/index';
    if (!path.extname(urlPath)) urlPath += '.html';
    const lower = urlPath.toLowerCase();
    if (lower.includes('favicon') || lower.endsWith('.ico')) {
      res.writeHead(204);
      res.end();
      return;
    }
    const file = path.join(ROOT, urlPath);
if (!file.startsWith(ROOT) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      console.log('[404] ' + req.url);
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found: ' + urlPath);
      return;
    }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Error: ' + (e && e.message));
  }
});

server.listen(PORT, () => console.log('Serving trivia on http://localhost:' + PORT));
