import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  handleAdminRequest,
  isAuthorizedAdmin,
  parseAdminRequest,
} from './wedding-admin-routes.js';
import { createInviteRepository } from './create-invite-repository.js';
import type { IInviteRepository } from './create-invite-repository.js';
import { handleApiRequest } from './wedding-guest-routes.js';
import {
  normalizeBoolean,
  normalizeGuestCount,
  normalizeInviteType,
  normalizePlusOneName,
  normalizeString,
} from './wedding-request-normalization.js';
import { createResponseHelpers, readJsonBody } from './wedding-response-utils.js';
import { handleStaticRequest } from './wedding-static-handler.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');
const staticDir = join(__dirname, '..', 'dist', 'dinner-invitation-website', 'browser');
const indexFile = join(staticDir, 'index.html');
const databasePath = process.env['DATABASE_PATH'] ?? join(dataDir, 'wedding.sqlite');
const databaseUrl = process.env['DATABASE_URL']?.trim() || null;
const seedFilePath = join(dataDir, 'wedding-data.json');
const adminGuid = process.env['ADMIN_GUID']?.trim() || null;
const port = Number.parseInt(process.env['PORT'] ?? '3001', 10);

const allowedOrigins = new Set(['http://localhost:4200', 'http://127.0.0.1:4200']);

if (process.env['APP_ORIGIN']?.trim()) {
  allowedOrigins.add(process.env['APP_ORIGIN'].trim());
}

if (process.env['RAILWAY_PUBLIC_DOMAIN']?.trim()) {
  allowedOrigins.add(`https://${process.env['RAILWAY_PUBLIC_DOMAIN'].trim()}`);
}

export { normalizeGuestCount, normalizePlusOneName };

interface CreateWeddingBackendServerOptions {
  repository?: IInviteRepository;
  adminGuid?: string | null;
  databasePath?: string;
  databaseUrl?: string | null;
  staticDir?: string;
  indexFile?: string;
}

export function createWeddingBackendServer({
  repository,
  adminGuid: configuredAdminGuid = adminGuid,
  databasePath: configuredDatabasePath = databasePath,
  databaseUrl: configuredDatabaseUrl = databaseUrl,
  staticDir: configuredStaticDir = staticDir,
  indexFile: configuredIndexFile = indexFile,
}: CreateWeddingBackendServerOptions = {}) {
  if (!repository) {
    throw new Error('A repository is required to create the wedding backend server.');
  }

  const { sendJson, sendText, sendCorsPreflight } = createResponseHelpers(allowedOrigins);

  return createServer(async (request, response) => {
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
            databasePath: configuredDatabaseUrl ? null : configuredDatabasePath,
            databaseProvider: repository.provider,
            databaseConnection: repository.connectionLabel,
            adminConfigured: Boolean(configuredAdminGuid),
          },
          origin,
        );
        return;
      }

      const adminRequest = parseAdminRequest(url.pathname);
      if (adminRequest) {
        await handleAdminRequest({
          request,
          response,
          adminRequest,
          origin,
          repository,
          adminGuid: configuredAdminGuid,
          readJsonBody,
          normalizeBoolean,
          normalizeInviteType,
          normalizeString,
          sendJson,
        });
        return;
      }

      const handledApiRequest = await handleApiRequest({
        request,
        response,
        url,
        origin,
        repository,
        databasePath: configuredDatabasePath,
        databaseUrl: configuredDatabaseUrl,
        adminGuid: configuredAdminGuid,
        readJsonBody,
        normalizeString,
        normalizeGuestCount,
        normalizePlusOneName,
        sendJson,
      });
      if (handledApiRequest) {
        return;
      }

      const handledStaticRequest = await handleStaticRequest({
        request,
        response,
        pathname: url.pathname,
        staticDir: configuredStaticDir,
        indexFile: configuredIndexFile,
        adminGuid: configuredAdminGuid,
        isAuthorizedAdmin,
        sendText,
      });
      if (handledStaticRequest) {
        return;
      }

      sendJson(response, 404, { error: 'Not found' }, origin);
    } catch (error) {
      console.error(error);
      sendJson(response, 500, { error: 'Internal server error' }, origin);
    }
  });
}

async function main(): Promise<void> {
  const repository = await createInviteRepository({
    databasePath,
    databaseUrl,
    seedFilePath,
  });

  const server = createWeddingBackendServer({ repository });

  server.listen(port, () => {
    console.log(`Wedding backend listening on http://localhost:${port}`);
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
