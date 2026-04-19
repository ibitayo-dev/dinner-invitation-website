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

function isAuthorizedAdmin(configuredAdminGuid, guid) {
  return Boolean(configuredAdminGuid && guid && configuredAdminGuid === guid);
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
}) {
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
    const displayName = normalizeString(body?.displayName);
    const inviteType = normalizeInviteType(body?.inviteType);

    if (!displayName || !inviteType) {
      sendJson(response, 400, { error: 'displayName and inviteType are required.' }, origin);
      return true;
    }

    const invite = await repository.createInvite({
      displayName,
      inviteType,
      active: normalizeBoolean(body?.active, true),
      token: normalizeString(body?.token) || undefined,
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
    const inviteType =
      body?.inviteType === undefined ? undefined : normalizeInviteType(body.inviteType);

    if (body?.inviteType !== undefined && !inviteType) {
      sendJson(response, 400, { error: 'inviteType must be solo or plus_one.' }, origin);
      return true;
    }

    const invite = await repository.updateInvite(adminRequest.resourceId, {
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

export { handleAdminRequest, isAuthorizedAdmin, parseAdminRequest };
