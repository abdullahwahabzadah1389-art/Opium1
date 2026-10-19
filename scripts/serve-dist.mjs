// Minimal static file server for dist/ — used as the Freebuff preview command.
// Mirrors production semantics: correct MIME types (module scripts require
// text/javascript), directory index.html resolution, and the site's
// _redirects rule (missing paths -> 404.html with status 404).
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(dirname(fileURLToPath(import.meta.url))), 'dist');
const port = Number(process.env.PORT) || Number(process.argv[2]) || 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.wasm': 'application/wasm',
  '.swf': 'application/x-shockwave-flash',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
};

function send(res, status, body, type) {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
  res.end(body);
}

function serveFile(res, file) {
  const type = MIME[extname(file).toLowerCase()] || 'application/octet-stream';
  send(res, 200, readFileSync(file), type);
}

createServer((req, res) => {
  let pathname;
  let search;
  try {
    const parsed = new URL(req.url, 'http://x');
    pathname = decodeURIComponent(parsed.pathname);
    search = parsed.search;
  } catch {
    return send(res, 400, 'Bad request', 'text/plain; charset=utf-8');
  }

  // Path traversal guard: the resolved path must stay inside dist/.
  const target = resolve(root, '.' + normalize(pathname));
  if (target !== root && !target.startsWith(root + sep)) {
    return send(res, 403, 'Forbidden', 'text/plain; charset=utf-8');
  }

  try {
    if (existsSync(target) && statSync(target).isDirectory()) {
      // Match standard static-host semantics (python http.server, Netlify,
      // Vercel): redirect /games/slope -> /games/slope/ so the page's
      // relative assets (game.html, etc.) resolve against the directory.
      if (!pathname.endsWith('/')) {
        res.writeHead(301, { Location: pathname + '/' + search });
        return res.end();
      }
      const index = join(target, 'index.html');
      if (existsSync(index)) return serveFile(res, index);
    } else if (existsSync(target)) {
      return serveFile(res, target);
    }
  } catch {
    // fall through to 404
  }

  // _redirects: /* /404.html 404
  const notFound = join(root, '404.html');
  if (existsSync(notFound)) {
    return send(res, 404, readFileSync(notFound), 'text/html; charset=utf-8');
  }
  send(res, 404, 'Not found', 'text/plain; charset=utf-8');
}).listen(port, '0.0.0.0', () => {
  console.log(`serving dist/ on 0.0.0.0:${port}`);
});
