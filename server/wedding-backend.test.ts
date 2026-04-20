import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { TestContext } from 'node:test';
import test from 'node:test';

import { normalizeDisplayName } from './invite-store-shared.js';
import {
  createWeddingBackendServer,
  normalizeGuestCount,
  normalizePlusOneName,
} from './wedding-backend.js';
import type { IInviteRepository } from './create-invite-repository.js';
import type { Invite, Submission, InviteWithSubmission, DatabaseSnapshot } from './invite-store-shared.js';

function cloneValue<T>(value: T | null): T | null {
  return value === null ? null : structuredClone(value);
}

function compareInvites(left: Invite, right: Invite): number {
  return (
    Number(right.active) - Number(left.active) ||
    right.updatedAt.localeCompare(left.updatedAt) ||
    left.displayName.localeCompare(right.displayName)
  );
}

function compareSubmissions(left: Submission, right: Submission): number {
  return (
    right.updatedAt.localeCompare(left.updatedAt) ||
    left.inviteToken.localeCompare(right.inviteToken)
  );
}

interface MemoryRepository extends IInviteRepository {
  invites: Map<string, Invite>;
  submissions: Map<string, Submission>;
}

function createMemoryRepository(): MemoryRepository {
  const invites = new Map<string, Invite>(
    [
      {
        token: 'alpha-plus-one',
        displayName: 'Alpha Guest',
        inviteType: 'plus_one' as const,
        plusOneAllowed: true,
        active: true,
        createdAt: '2026-04-18T00:00:00.000Z',
        updatedAt: '2026-04-18T00:00:00.000Z',
      },
      {
        token: 'inactive-solo',
        displayName: 'Inactive Guest',
        inviteType: 'solo' as const,
        plusOneAllowed: false,
        active: false,
        createdAt: '2026-04-18T00:00:00.000Z',
        updatedAt: '2026-04-18T00:00:00.000Z',
      },
    ].map((invite) => [invite.token, invite]),
  );
  const submissions = new Map<string, Submission>();

  return {
    provider: 'memory',
    connectionLabel: 'memory://wedding-tests',
    invites,
    submissions,
    async getInviteByToken(token: string, { includeInactive = false } = {}) {
      const invite = invites.get(token);
      if (!invite || (!includeInactive && !invite.active)) {
        return null;
      }

      return cloneValue(invite);
    },
    async getInviteByDisplayName(displayName: string) {
      const normalizedName = normalizeDisplayName(displayName);
      const matches = [...invites.values()]
        .filter(
          (invite) => invite.active && normalizeDisplayName(invite.displayName) === normalizedName,
        )
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

      return cloneValue(matches[0] ?? null);
    },
    async listInvitesWithSubmissions(): Promise<InviteWithSubmission[]> {
      return [...invites.values()].sort(compareInvites).map((invite) => ({
        invite: cloneValue(invite) as Invite,
        submission: cloneValue(submissions.get(invite.token) ?? null),
      }));
    },
    async listDatabaseSnapshot(): Promise<DatabaseSnapshot> {
      return {
        provider: 'memory',
        connectionLabel: 'memory://wedding-tests',
        invites: [...invites.values()].sort(compareInvites).map((invite) => cloneValue(invite) as Invite),
        rsvps: [...submissions.values()]
          .sort(compareSubmissions)
          .map((submission) => cloneValue(submission) as Submission),
      };
    },
    async createInvite({ displayName, inviteType, active = true, token }) {
      const timestamp = new Date().toISOString();
      const invite: Invite = {
        token: token ?? `invite-${invites.size + 1}`,
        displayName,
        inviteType,
        plusOneAllowed: inviteType === 'plus_one',
        active,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      invites.set(invite.token, invite);
      return cloneValue(invite);
    },
    async updateInvite(token: string, updates) {
      const existingInvite = invites.get(token);
      if (!existingInvite) {
        return null;
      }

      const inviteType = updates.inviteType ?? existingInvite.inviteType;
      const updatedInvite: Invite = {
        ...existingInvite,
        displayName: updates.displayName?.trim() || existingInvite.displayName,
        inviteType,
        plusOneAllowed: inviteType === 'plus_one',
        active: updates.active ?? existingInvite.active,
        updatedAt: new Date().toISOString(),
      };

      invites.set(token, updatedInvite);
      return cloneValue(updatedInvite);
    },
    async getRsvpByToken(token: string) {
      return cloneValue(submissions.get(token) ?? null);
    },
    async upsertRsvp(token: string, submission) {
      const record: Submission = {
        inviteToken: token,
        attending: submission.attending === 'no' ? 'no' : 'yes',
        guestCount: submission.guestCount,
        dietaryRequirements: submission.dietaryRequirements ?? '',
        plusOneName: submission.plusOneName ?? '',
        updatedAt: new Date().toISOString(),
      };

      submissions.set(token, record);
      return cloneValue(record);
    },
    async close() {},
  };
}

async function startServer(t: TestContext): Promise<{ repository: MemoryRepository; baseUrl: string }> {
  const repository = createMemoryRepository();
  const server = createWeddingBackendServer({
    repository,
    adminGuid: 'secret-admin-guid',
    databasePath: '/tmp/test-wedding.sqlite',
    databaseUrl: null,
  });

  server.listen(0, '127.0.0.1');
  await once(server, 'listening');

  t.after(
    () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      }),
  );

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Expected the test server to listen on a TCP port.');
  }

  return {
    repository,
    baseUrl: `http://127.0.0.1:${address.port}`,
  };
}

test('solo invites always normalize guest count to one attendee', () => {
  assert.equal(normalizeGuestCount(4, false, 'yes'), 1);
  assert.equal(normalizeGuestCount(2, false, 'no'), 1);
});

test('plus-one invites clamp guest count to at most two attendees', () => {
  assert.equal(normalizeGuestCount(1, true, 'yes'), 1);
  assert.equal(normalizeGuestCount(2, true, 'yes'), 2);
  assert.equal(normalizeGuestCount(4, true, 'yes'), 2);
  assert.equal(normalizeGuestCount(2, true, 'no'), 1);
});

test('plus-one names are only kept when a second guest is attending', () => {
  assert.equal(normalizePlusOneName(' Alex ', 2), 'Alex');
  assert.equal(normalizePlusOneName(' Alex ', 1), '');
});

test('health endpoint reports backend status and allowed CORS headers', async (t) => {
  const { baseUrl } = await startServer(t);

  const response = await fetch(`${baseUrl}/api/health`, {
    headers: {
      Origin: 'http://localhost:4200',
    },
  });
  const payload = await response.json() as Record<string, unknown>;

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:4200');
  assert.deepEqual(payload, {
    status: 'ok',
    databasePath: '/tmp/test-wedding.sqlite',
    databaseProvider: 'memory',
    databaseConnection: 'memory://wedding-tests',
    adminConfigured: true,
  });
});

test('invite routes resolve guests by display name and token', async (t) => {
  const { baseUrl } = await startServer(t);

  let response = await fetch(
    `${baseUrl}/api/invites?name=${encodeURIComponent('  alpha   guest ')}`,
  );
  let payload = await response.json() as Record<string, unknown>;

  assert.equal(response.status, 200);
  assert.equal((payload['invite'] as Invite | null)?.token, 'alpha-plus-one');

  response = await fetch(`${baseUrl}/api/invites/alpha-plus-one`);
  payload = await response.json() as Record<string, unknown>;

  assert.equal(response.status, 200);
  assert.equal((payload['invite'] as Invite | null)?.displayName, 'Alpha Guest');

  response = await fetch(`${baseUrl}/api/invites/missing-token`);
  payload = await response.json() as Record<string, unknown>;

  assert.equal(response.status, 404);
  assert.equal(payload['invite'], null);
});

test('rsvp routes read and write normalized submissions', async (t) => {
  const { baseUrl, repository } = await startServer(t);

  let response = await fetch(`${baseUrl}/api/rsvps/alpha-plus-one`);
  let payload = await response.json() as Record<string, unknown>;

  assert.equal(response.status, 404);
  assert.equal(payload['submission'], null);

  response = await fetch(`${baseUrl}/api/rsvps/alpha-plus-one`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      attending: 'yes',
      guestCount: 4,
      dietaryRequirements: '  Vegetarian ',
      plusOneName: ' Alex ',
    }),
  });
  payload = await response.json() as Record<string, unknown>;

  assert.equal(response.status, 200);
  assert.equal((payload['submission'] as Submission).guestCount, 2);
  assert.equal((payload['submission'] as Submission).plusOneName, 'Alex');
  assert.equal(repository.submissions.get('alpha-plus-one')?.dietaryRequirements, 'Vegetarian');

  response = await fetch(`${baseUrl}/api/rsvps/alpha-plus-one`);
  payload = await response.json() as Record<string, unknown>;

  assert.equal(response.status, 200);
  assert.equal((payload['submission'] as Submission).attending, 'yes');

  response = await fetch(`${baseUrl}/api/rsvps/missing-token`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ attending: 'yes' }),
  });
  payload = await response.json() as Record<string, unknown>;

  assert.equal(response.status, 404);
  assert.equal(payload['error'], 'Invite not found.');

  response = await fetch(`${baseUrl}/api/rsvps/alpha-plus-one`, {
    method: 'PUT',
  });
  payload = await response.json() as Record<string, unknown>;

  assert.equal(response.status, 400);
  assert.equal(payload['error'], 'Request body is required.');
});

test('admin routes enforce auth and support invite maintenance', async (t) => {
  const { baseUrl } = await startServer(t);

  let response = await fetch(`${baseUrl}/api/admin/not-the-guid/invites`);
  let payload = await response.json() as Record<string, unknown>;

  assert.equal(response.status, 403);
  assert.equal(payload['error'], 'Admin access denied.');

  response = await fetch(`${baseUrl}/api/admin/secret-admin-guid/invites`);
  payload = await response.json() as Record<string, unknown>;

  assert.equal(response.status, 200);
  assert.equal(Array.isArray(payload['items']), true);
  assert.equal((payload['items'] as unknown[]).length, 2);

  response = await fetch(`${baseUrl}/api/admin/secret-admin-guid/invites`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ displayName: 'Gamma Guest' }),
  });
  payload = await response.json() as Record<string, unknown>;

  assert.equal(response.status, 400);
  assert.equal(payload['error'], 'displayName and inviteType are required.');

  response = await fetch(`${baseUrl}/api/admin/secret-admin-guid/invites`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      displayName: 'Gamma Guest',
      inviteType: 'plus_one',
      active: true,
      token: 'gamma-plus-one',
    }),
  });
  payload = await response.json() as Record<string, unknown>;

  assert.equal(response.status, 201);
  assert.equal((payload['invite'] as Invite).token, 'gamma-plus-one');
  assert.equal((payload['invite'] as Invite).plusOneAllowed, true);

  response = await fetch(`${baseUrl}/api/admin/secret-admin-guid/invites/gamma-plus-one`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      active: false,
      displayName: 'Gamma Updated',
      inviteType: 'solo',
    }),
  });
  payload = await response.json() as Record<string, unknown>;

  assert.equal(response.status, 200);
  assert.equal((payload['invite'] as Invite).displayName, 'Gamma Updated');
  assert.equal((payload['invite'] as Invite).active, false);
  assert.equal((payload['invite'] as Invite).plusOneAllowed, false);

  response = await fetch(`${baseUrl}/api/admin/secret-admin-guid/invites/missing-token`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ active: true }),
  });
  payload = await response.json() as Record<string, unknown>;

  assert.equal(response.status, 404);
  assert.equal(payload['error'], 'Invite not found.');

  response = await fetch(`${baseUrl}/api/admin/secret-admin-guid/database`);
  payload = await response.json() as Record<string, unknown>;

  assert.equal(response.status, 200);
  assert.equal((payload['snapshot'] as DatabaseSnapshot).provider, 'memory');
  assert.equal(
    (payload['snapshot'] as DatabaseSnapshot).invites.some((invite) => invite.token === 'gamma-plus-one'),
    true,
  );
});
