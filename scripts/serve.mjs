import { createServer } from 'node:http';
import { readFileSync, realpathSync, statSync } from 'node:fs';
import { extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const MIME = Object.freeze({
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.glb': 'model/gltf-binary', '.ico': 'image/x-icon',
});

function inside(root, candidate) {
  const path = relative(root, candidate);
  return path === '' || (!path.startsWith(`..${sep}`) && path !== '..' && !isAbsolute(path));
}

export function resolveStaticPath(root, requestUrl) {
  if (typeof root !== 'string' || !root || typeof requestUrl !== 'string' || requestUrl.length > 4096) throw new TypeError('Invalid static request');
  const rawPath = requestUrl.split(/[?#]/, 1)[0];
  if (!rawPath.startsWith('/')) throw new RangeError('Request path must be absolute');
  let pathname;
  try { pathname = decodeURIComponent(rawPath); } catch { throw new RangeError('Invalid path encoding'); }
  if (pathname.includes('\0') || pathname.includes('\\') || pathname.split('/').includes('..')) throw new RangeError('Unsafe request path');
  const base = resolve(root);
  const candidate = resolve(base, `.${pathname === '/' ? '/index.html' : pathname}`);
  if (!inside(base, candidate)) throw new RangeError('Unsafe request path');
  return candidate;
}

export function createStaticServer({ root }) {
  const base = realpathSync(resolve(root));
  return createServer((request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cache-Control', 'no-store');
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(405, { Allow: 'GET, HEAD' }); response.end('Method not allowed'); return;
    }
    try {
      const candidate = resolveStaticPath(base, request.url);
      if (!statSync(candidate).isFile()) throw new Error('Not a file');
      const file = realpathSync(candidate);
      if (!inside(base, file)) throw new RangeError('Unsafe resolved path');
      const body = readFileSync(file);
      response.writeHead(200, { 'Content-Type': MIME[extname(file).toLowerCase()] || 'application/octet-stream', 'Content-Length': body.length });
      response.end(request.method === 'HEAD' ? undefined : body);
    } catch (error) {
      const status = error instanceof RangeError ? 400 : 404;
      response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end(request.method === 'HEAD' ? undefined : status === 400 ? 'Invalid request' : 'Not found');
    }
  });
}

function parseArgs(args) {
  let host = '127.0.0.1', port = 8096;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--host' && args[i + 1] && !/\s/.test(args[i + 1])) host = args[++i];
    else if (args[i] === '--port' && /^\d+$/.test(args[i + 1] || '') && Number(args[i + 1]) >= 1 && Number(args[i + 1]) <= 65535) port = Number(args[++i]);
    else throw new RangeError('Usage: node scripts/serve.mjs [--host 127.0.0.1] [--port 8096]');
  }
  return { host, port };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { host, port } = parseArgs(process.argv.slice(2));
  const root = fileURLToPath(new URL('../', import.meta.url));
  createStaticServer({ root }).listen(port, host, () => console.log(`Bioprinting Workbench: http://${host}:${port}/`));
}
