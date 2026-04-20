import type { IncomingMessage, ServerResponse } from 'node:http';

import type { IInviteRepository } from './create-invite-repository.js';

function getPathValue(prefix: string, pathname: string): string {
  return decodeURIComponent(pathname.replace(prefix, ''));
}

interface HandleApiRequestOptions {
  request: IncomingMessage;
  response: ServerResponse;
  url: URL;
  origin: string | undefined;
  repository: IInviteRepository;
  databasePath: string;
  databaseUrl: string | null;
  adminGuid: string | null;
  readJsonBody: (request: IncomingMessage) => Promise<unknown>;
  normalizeString: (value: unknown) => string;
  normalizeGuestCount: (value: unknown, plusOneAllowed: boolean, attending: string) => number;
  normalizePlusOneName: (value: unknown, guestCount: number) => string;
  sendJson: (response: ServerResponse, statusCode: number, payload: unknown, origin?: string) => void;
}

async function handleApiRequest({
  request,
  response,
  url,
  origin,
  repository,
  databasePath,
  databaseUrl,
  adminGuid,
  readJsonBody,
  normalizeString,
  normalizeGuestCount,
  normalizePlusOneName,
  sendJson,
}: HandleApiRequestOptions): Promise<boolean> {
  if (request.method === 'GET' && url.pathname === '/api/health') {
    sendJson(
      response,
      200,
      {
        status: 'ok',
        databasePath: databaseUrl ? null : databasePath,
        databaseProvider: repository.provider,
        databaseConnection: repository.connectionLabel,
        adminConfigured: Boolean(adminGuid),
      },
      origin,
    );
    return true;
  }

  if (request.method === 'GET' && url.pathname === '/api/invites') {
    const name = normalizeString(url.searchParams.get('name'));
    const invite = name ? await repository.getInviteByDisplayName(name) : null;
    sendJson(response, 200, { invite }, origin);
    return true;
  }

  if (request.method === 'GET' && url.pathname.startsWith('/api/invites/')) {
    const invite = await repository.getInviteByToken(getPathValue('/api/invites/', url.pathname));
    if (!invite) {
      sendJson(response, 404, { invite: null }, origin);
      return true;
    }

    sendJson(response, 200, { invite }, origin);
    return true;
  }

  if (request.method === 'GET' && url.pathname.startsWith('/api/rsvps/')) {
    const token = getPathValue('/api/rsvps/', url.pathname);
    const invite = await repository.getInviteByToken(token);
    if (!invite) {
      sendJson(response, 404, { submission: null }, origin);
      return true;
    }

    const submission = await repository.getRsvpByToken(token);
    if (!submission) {
      sendJson(response, 404, { submission: null }, origin);
      return true;
    }

    sendJson(response, 200, { submission }, origin);
    return true;
  }

  if (request.method === 'PUT' && url.pathname.startsWith('/api/rsvps/')) {
    const token = getPathValue('/api/rsvps/', url.pathname);
    const invite = await repository.getInviteByToken(token);
    if (!invite) {
      sendJson(response, 404, { error: 'Invite not found.' }, origin);
      return true;
    }

    const body = await readJsonBody(request);
    if (!body) {
      sendJson(response, 400, { error: 'Request body is required.' }, origin);
      return true;
    }

    const bodyRecord = body as Record<string, unknown>;
    const attending = bodyRecord['attending'] === 'no' ? 'no' : 'yes';
    const guestCount = normalizeGuestCount(
      bodyRecord['guestCount'],
      invite.plusOneAllowed,
      attending,
    );
    const submission = await repository.upsertRsvp(token, {
      attending,
      dietaryRequirements: normalizeString(bodyRecord['dietaryRequirements']),
      guestCount,
      plusOneName: normalizePlusOneName(bodyRecord['plusOneName'], guestCount),
    });

    sendJson(response, 200, { submission }, origin);
    return true;
  }

  return false;
}

export { handleApiRequest };
