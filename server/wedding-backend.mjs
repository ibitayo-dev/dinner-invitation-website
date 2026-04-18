import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');
const dataFile = join(dataDir, 'wedding-data.json');
const port = Number.parseInt(process.env.PORT ?? '3001', 10);

const seedState = {
  invites: [
    {
      token: 'shannon-plus-one',
      displayName: 'Shannon',
      inviteType: 'plus_one',
      plusOneAllowed: true,
      active: true,
      createdAt: '2026-04-18T00:00:00.000Z',
      updatedAt: '2026-04-18T00:00:00.000Z',
    },
    {
      token: 'ibitayo-solo',
      displayName: 'Ibitayo',
      inviteType: 'solo',
      plusOneAllowed: false,
      active: true,
      createdAt: '2026-04-18T00:00:00.000Z',
      updatedAt: '2026-04-18T00:00:00.000Z',
    },
  ],
  submissions: {},
};

function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalize(value) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function nowIso() {
  return new Date().toISOString();
}

function generateToken(displayName, inviteType) {
  const base = slugify(displayName) || 'guest';
  const suffix = inviteType === 'plus_one' ? 'plus-one' : 'solo';
  const randomPart = globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);

  return `${base}-${suffix}-${randomPart}`;
}

async function ensureSeededStore() {
  try {
    const raw = await readFile(dataFile, 'utf8');
    return JSON.parse(raw);
  } catch {
    await mkdir(dataDir, { recursive: true });
    await writeFile(dataFile, JSON.stringify(seedState, null, 2));
    return structuredClone(seedState);
  }
}

async function persistStore(store) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(dataFile, JSON.stringify(store, null, 2));
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

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  response.end(JSON.stringify(payload));
}

function sendCorsPreflight(response) {
  response.writeHead(204, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  });
  response.end();
}

function getInviteByToken(state, token) {
  return state.invites.find((invite) => invite.token === token) ?? null;
}

function getInviteByDisplayName(state, displayName) {
  const target = normalize(displayName);
  return state.invites.find((invite) => normalize(invite.displayName) === target) ?? null;
}

async function main() {
  const state = await ensureSeededStore();

  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://localhost');

    if (request.method === 'OPTIONS') {
      sendCorsPreflight(response);
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/health') {
      sendJson(response, 200, { ok: true });
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/invites') {
      const name = url.searchParams.get('name');
      const invite = name ? getInviteByDisplayName(state, name) : null;
      sendJson(response, 200, { invite });
      return;
    }

    if (request.method === 'GET' && url.pathname.startsWith('/api/invites/')) {
      const token = decodeURIComponent(url.pathname.replace('/api/invites/', ''));
      const invite = getInviteByToken(state, token);
      if (!invite) {
        sendJson(response, 404, { invite: null });
        return;
      }

      sendJson(response, 200, { invite });
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/invites') {
      const body = await readJsonBody(request);
      if (!body?.displayName || !body?.inviteType) {
        sendJson(response, 400, { error: 'displayName and inviteType are required' });
        return;
      }

      const invite = {
        token: typeof body.token === 'string' && body.token.trim() ? body.token.trim() : generateToken(body.displayName, body.inviteType),
        displayName: String(body.displayName).trim(),
        inviteType: body.inviteType === 'plus_one' ? 'plus_one' : 'solo',
        plusOneAllowed: body.inviteType === 'plus_one',
        active: body.active !== false,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };

      const existingIndex = state.invites.findIndex((entry) => entry.token === invite.token);
      if (existingIndex >= 0) {
        state.invites[existingIndex] = invite;
      } else {
        state.invites.unshift(invite);
      }

      await persistStore(state);
      sendJson(response, 201, { invite });
      return;
    }

    if (request.method === 'GET' && url.pathname.startsWith('/api/rsvps/')) {
      const token = decodeURIComponent(url.pathname.replace('/api/rsvps/', ''));
      const submission = state.submissions[token] ?? null;
      if (!submission) {
        sendJson(response, 404, { submission: null });
        return;
      }

      sendJson(response, 200, { submission });
      return;
    }

    if (request.method === 'PUT' && url.pathname.startsWith('/api/rsvps/')) {
      const token = decodeURIComponent(url.pathname.replace('/api/rsvps/', ''));
      const body = await readJsonBody(request);
      if (!body) {
        sendJson(response, 400, { error: 'Request body is required' });
        return;
      }

      const submission = {
        inviteToken: token,
        attending: body.attending === 'no' ? 'no' : 'yes',
        guestCount: Number.isFinite(Number(body.guestCount)) ? Number(body.guestCount) : 1,
        dietaryRequirements: typeof body.dietaryRequirements === 'string' ? body.dietaryRequirements : '',
        plusOneName: typeof body.plusOneName === 'string' ? body.plusOneName : '',
        updatedAt: nowIso(),
      };

      state.submissions[token] = submission;
      await persistStore(state);
      sendJson(response, 200, { submission });
      return;
    }

    sendJson(response, 404, { error: 'Not found' });
  });

  server.listen(port, () => {
    console.log(`Wedding backend listening on http://localhost:${port}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
