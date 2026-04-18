import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

import { InviteRepository } from './invite-repository.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');
const staticDir = join(__dirname, '..', 'dist', 'dinner-invitation-website', 'browser');
const indexFile = join(staticDir, 'index.html');
const databasePath = process.env.DATABASE_PATH ?? join(dataDir, 'wedding.sqlite');
const seedFilePath = join(dataDir, 'wedding-data.json');
const adminGuid = process.env.ADMIN_GUID?.trim() || null;
const port = Number.parseInt(process.env.PORT ?? '3001', 10);
const repository = new InviteRepository({ databasePath, seedFilePath });

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

const allowedOrigins = new Set(['http://localhost:4200', 'http://127.0.0.1:4200']);

if (process.env.APP_ORIGIN?.trim()) {
  allowedOrigins.add(process.env.APP_ORIGIN.trim());
}

if (process.env.RAILWAY_PUBLIC_DOMAIN?.trim()) {
  allowedOrigins.add(`https://${process.env.RAILWAY_PUBLIC_DOMAIN.trim()}`);
}

function buildCorsHeaders(origin) {
  if (!origin || !allowedOrigins.has(origin)) {
    return {};
  }

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
}

function normalizeBoolean(value, fallback = true) {
  return typeof value === 'boolean' ? value : fallback;
}

function normalizeInviteType(value) {
  return value === 'plus_one' || value === 'solo' ? value : null;
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeGuestCount(value) {
  const guestCount = Number.parseInt(String(value ?? '1'), 10);
  return Number.isInteger(guestCount) && guestCount > 0 ? guestCount : 1;
}

async function readJsonBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return null;
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : null;
}

function sendJson(response, statusCode, payload, origin) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    ...buildCorsHeaders(origin),
  });
  response.end(JSON.stringify(payload));
}

function sendText(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
  });
  response.end(payload);
}

function sendCorsPreflight(response, origin) {
  response.writeHead(204, {
    ...buildCorsHeaders(origin),
    'Access-Control-Max-Age': '86400',
  });
  response.end();
}

function resolveStaticPath(pathname) {
  const relativePath = pathname === '/' ? '/index.html' : pathname;
  const filePath = normalize(join(staticDir, relativePath));
  return filePath.startsWith(staticDir) ? filePath : null;
}

function parseAdminRequest(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] !== 'api' || parts[1] !== 'admin' || !parts[2]) {
    return null;
  }

  return {
    guid: decodeURIComponent(parts[2]),
    resource: parts[3] ? decodeURIComponent(parts[3]) : null,
    resourceId: parts[4] ? decodeURIComponent(parts[4]) : null,
  };
}

function isAuthorizedAdmin(guid) {
  return Boolean(adminGuid && guid && adminGuid === guid);
}

async function serveStaticAsset(pathname, response) {
  const filePath = resolveStaticPath(pathname);
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
      'Cache-Control': pathname === '/index.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
    });
    response.end(await readFile(filePath));
    return true;
  } catch {
    return false;
  }
}

async function serveAppShell(response) {
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

async function handleAdminRequest(request, response, adminRequest, origin) {
  if (!isAuthorizedAdmin(adminRequest.guid)) {
    sendJson(response, 403, { error: 'Admin access denied.' }, origin);
    return true;
  }

  if (request.method === 'GET' && adminRequest.resource === 'invites' && adminRequest.resourceId === null) {
    sendJson(response, 200, { items: repository.listInvitesWithSubmissions() }, origin);
    return true;
  }

  if (request.method === 'POST' && adminRequest.resource === 'invites' && adminRequest.resourceId === null) {
    const body = await readJsonBody(request);
    const displayName = normalizeString(body?.displayName);
    const inviteType = normalizeInviteType(body?.inviteType);

    if (!displayName || !inviteType) {
      sendJson(response, 400, { error: 'displayName and inviteType are required.' }, origin);
      return true;
    }

    const invite = repository.createInvite({
      displayName,
      inviteType,
      active: normalizeBoolean(body?.active, true),
      token: normalizeString(body?.token) || undefined,
    });

    sendJson(response, 201, { invite }, origin);
    return true;
  }

  if (request.method === 'PATCH' && adminRequest.resource === 'invites' && adminRequest.resourceId) {
    const body = await readJsonBody(request);
    const inviteType = body?.inviteType === undefined ? undefined : normalizeInviteType(body.inviteType);

    if (body?.inviteType !== undefined && !inviteType) {
      sendJson(response, 400, { error: 'inviteType must be solo or plus_one.' }, origin);
      return true;
    }

    const invite = repository.updateInvite(adminRequest.resourceId, {
      active: typeof body?.active === 'boolean' ? body.active : undefined,
      displayName: body?.displayName === undefined ? undefined : normalizeString(body.displayName),
      inviteType,
    });

    if (!invite) {
      sendJson(response, 404, { error: 'Invite not found.' }, origin);
      return true;
    }

    sendJson(response, 200, { invite }, origin);
    return true;
  }

  sendJson(response, 404, { error: 'Not found' }, origin);
  return true;
}

async function main() {
  const server = createServer(async (request, response) => {
    const origin = request.headers.origin;
    const url = new URL(request.url ?? '/', 'http://localhost');

    try {
      if (request.method === 'OPTIONS') {
        sendCorsPreflight(response, origin);
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/health') {
        sendJson(
          response,
          200,
          {
            status: 'ok',
            databasePath,
            adminConfigured: Boolean(adminGuid),
          },
          origin
        );
        return;
      }

      const adminRequest = parseAdminRequest(url.pathname);
      if (adminRequest) {
        await handleAdminRequest(request, response, adminRequest, origin);
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/invites') {
        const name = normalizeString(url.searchParams.get('name'));
        const invite = name ? repository.getInviteByDisplayName(name) : null;
        sendJson(response, 200, { invite }, origin);
        return;
      }

      if (request.method === 'GET' && url.pathname.startsWith('/api/invites/')) {
        const token = decodeURIComponent(url.pathname.replace('/api/invites/', ''));
        const invite = repository.getInviteByToken(token);
        if (!invite) {
          sendJson(response, 404, { invite: null }, origin);
          return;
        }

        sendJson(response, 200, { invite }, origin);
        return;
      }

      if (request.method === 'GET' && url.pathname.startsWith('/api/rsvps/')) {
        const token = decodeURIComponent(url.pathname.replace('/api/rsvps/', ''));
        const invite = repository.getInviteByToken(token);
        if (!invite) {
          sendJson(response, 404, { submission: null }, origin);
          return;
        }

        const submission = repository.getRsvpByToken(token);
        if (!submission) {
          sendJson(response, 404, { submission: null }, origin);
          return;
        }

        sendJson(response, 200, { submission }, origin);
        return;
      }

      if (request.method === 'PUT' && url.pathname.startsWith('/api/rsvps/')) {
        const token = decodeURIComponent(url.pathname.replace('/api/rsvps/', ''));
        const invite = repository.getInviteByToken(token);
        if (!invite) {
          sendJson(response, 404, { error: 'Invite not found.' }, origin);
          return;
        }

        const body = await readJsonBody(request);
        if (!body) {
          sendJson(response, 400, { error: 'Request body is required.' }, origin);
          return;
        }

        const submission = repository.upsertRsvp(token, {
          attending: body.attending === 'no' ? 'no' : 'yes',
          dietaryRequirements: normalizeString(body.dietaryRequirements),
          guestCount: normalizeGuestCount(body.guestCount),
          plusOneName: normalizeString(body.plusOneName),
        });

        sendJson(response, 200, { submission }, origin);
        return;
      }

      if (request.method === 'GET' && !url.pathname.startsWith('/api/')) {
        const servedAsset = await serveStaticAsset(url.pathname, response);
        if (servedAsset) {
          return;
        }

        if (url.pathname.startsWith('/admin/') && !isAuthorizedAdmin(decodeURIComponent(url.pathname.split('/').filter(Boolean)[1] ?? ''))) {
          sendText(response, 404, 'Not found');
          return;
        }

        await serveAppShell(response);
        return;
      }

      sendJson(response, 404, { error: 'Not found' }, origin);
    } catch (error) {
      console.error(error);
      sendJson(response, 500, { error: 'Internal server error' }, origin);
    }
  });

  server.listen(port, () => {
    console.log(`Wedding backend listening on http://localhost:${port}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
