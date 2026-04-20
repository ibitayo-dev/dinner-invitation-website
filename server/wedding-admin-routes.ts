import type { IncomingMessage, ServerResponse } from 'node:http';

import type { IInviteRepository } from './create-invite-repository.js';

interface AdminRequest {
  guid: string;
  resource: string | null;
  resourceId: string | null;
}

function parseAdminRequest(pathname: string): AdminRequest | null {
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

function isAuthorizedAdmin(configuredAdminGuid: string | null, guid: string): boolean {
  return Boolean(configuredAdminGuid && guid && configuredAdminGuid === guid);
}

interface HandleAdminRequestOptions {
  request: IncomingMessage;
  response: ServerResponse;
  adminRequest: AdminRequest;
  origin: string | undefined;
  repository: IInviteRepository;
  adminGuid: string | null;
  readJsonBody: (request: IncomingMessage) => Promise<unknown>;
  normalizeBoolean: (value: unknown, fallback?: boolean) => boolean;
  normalizeInviteType: (value: unknown) => 'solo' | 'plus_one' | null;
  normalizeString: (value: unknown) => string;
  sendJson: (response: ServerResponse, statusCode: number, payload: unknown, origin?: string) => void;
}

async function handleAdminRequest({
  request,
  response,
  adminRequest,
  origin,
  repository,
  adminGuid,
  readJsonBody,
  normalizeBoolean,
  normalizeInviteType,
  normalizeString,
  sendJson,
}: HandleAdminRequestOptions): Promise<boolean> {
  if (!isAuthorizedAdmin(adminGuid, adminRequest.guid)) {
    sendJson(response, 403, { error: 'Admin access denied.' }, origin);
    return true;
  }

  if (
    request.method === 'GET' &&
    adminRequest.resource === 'invites' &&
    adminRequest.resourceId === null
  ) {
    sendJson(response, 200, { items: await repository.listInvitesWithSubmissions() }, origin);
    return true;
  }

  if (
    request.method === 'GET' &&
    adminRequest.resource === 'database' &&
    adminRequest.resourceId === null
  ) {
    sendJson(response, 200, { snapshot: await repository.listDatabaseSnapshot() }, origin);
    return true;
  }

  if (
    request.method === 'POST' &&
    adminRequest.resource === 'invites' &&
    adminRequest.resourceId === null
  ) {
    const body = await readJsonBody(request);
    const bodyRecord = body as Record<string, unknown> | null;
    const displayName = normalizeString(bodyRecord?.['displayName']);
    const inviteType = normalizeInviteType(bodyRecord?.['inviteType']);

    if (!displayName || !inviteType) {
      sendJson(response, 400, { error: 'displayName and inviteType are required.' }, origin);
      return true;
    }

    const invite = await repository.createInvite({
      displayName,
      inviteType,
      active: normalizeBoolean(bodyRecord?.['active'], true),
      token: normalizeString(bodyRecord?.['token']) || undefined,
    });

    sendJson(response, 201, { invite }, origin);
    return true;
  }

  if (
    request.method === 'PATCH' &&
    adminRequest.resource === 'invites' &&
    adminRequest.resourceId
  ) {
    const body = await readJsonBody(request);
    const bodyRecord = body as Record<string, unknown> | null;
    const inviteType =
      bodyRecord?.['inviteType'] === undefined
        ? undefined
        : normalizeInviteType(bodyRecord['inviteType']);

    if (bodyRecord?.['inviteType'] !== undefined && !inviteType) {
      sendJson(response, 400, { error: 'inviteType must be solo or plus_one.' }, origin);
      return true;
    }

    const invite = await repository.updateInvite(adminRequest.resourceId, {
      active:
        typeof bodyRecord?.['active'] === 'boolean' ? bodyRecord['active'] : undefined,
      displayName:
        bodyRecord?.['displayName'] === undefined
          ? undefined
          : normalizeString(bodyRecord['displayName']),
      inviteType: inviteType ?? undefined,
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

export { handleAdminRequest, isAuthorizedAdmin, parseAdminRequest };
