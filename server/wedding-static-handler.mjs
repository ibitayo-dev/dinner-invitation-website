import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function resolveStaticPath(staticDir, pathname) {
  const relativePath = pathname === '/' ? '/index.html' : pathname;
  const filePath = normalize(join(staticDir, relativePath));
  return filePath.startsWith(staticDir) ? filePath : null;
}

async function serveStaticAsset(staticDir, pathname, response) {
  const filePath = resolveStaticPath(staticDir, pathname);
  if (!filePath) {
    return false;
  }

  try {
    const fileStats = await stat(filePath);
    if (!fileStats.isFile()) {
      return false;
    }

    response.writeHead(200, {
      'Content-Type': contentTypes[extname(filePath)] ?? 'application/octet-stream',
      'Cache-Control':
        pathname === '/index.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
    });
    response.end(await readFile(filePath));
    return true;
  } catch {
    return false;
  }
}

async function serveAppShell(indexFile, response, sendText) {
  try {
    response.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache',
    });
    response.end(await readFile(indexFile, 'utf8'));
  } catch {
    sendText(response, 503, 'Frontend build output is not available yet. Run npm run build first.');
  }
}

async function handleStaticRequest({
  request,
  response,
  pathname,
  staticDir,
  indexFile,
  adminGuid,
  isAuthorizedAdmin,
  sendText,
}) {
  if (request.method !== 'GET' || pathname.startsWith('/api/')) {
    return false;
  }

  const servedAsset = await serveStaticAsset(staticDir, pathname, response);
  if (servedAsset) {
    return true;
  }

  if (
    pathname.startsWith('/admin/') &&
    !isAuthorizedAdmin(adminGuid, decodeURIComponent(pathname.split('/').filter(Boolean)[1] ?? ''))
  ) {
    sendText(response, 404, 'Not found');
    return true;
  }

  await serveAppShell(indexFile, response, sendText);
  return true;
}

export { handleStaticRequest };
