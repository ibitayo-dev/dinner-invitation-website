import { WeddingInviteDatabase } from './invite-database';

describe('WeddingInviteDatabase', () => {
  beforeEach(() => {
    (window as Window & { __WEDDING_API_BASE_URL__?: string }).__WEDDING_API_BASE_URL__ = '';
  });

  it('returns a default invite when no token or legacy name is available', async () => {
    const database = new WeddingInviteDatabase({ apiBaseUrl: null });
    const invite = await database.resolveInvite(null, 'Guest Name');

    expect(invite.source).toBe('default');
    expect(invite.invite?.displayName).toBe('Guest Name');
    expect(invite.invite?.plusOneAllowed).toBe(false);
  });

  it('talks to the backend when an api base is provided', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.endsWith('/api/invites/remote-token')) {
        return new Response(
          JSON.stringify({
            invite: {
              token: 'remote-token',
              displayName: 'Remote Guest',
              inviteType: 'plus_one',
              plusOneAllowed: true,
              active: true,
              createdAt: '2026-04-18T00:00:00.000Z',
              updatedAt: '2026-04-18T00:00:00.000Z',
            },
          }),
          { status: 200 }
        );
      }

      if (url.endsWith('/api/rsvps/remote-token') && (!init || init.method === undefined || init.method === 'GET')) {
        return new Response(
          JSON.stringify({
            submission: {
              inviteToken: 'remote-token',
              attending: 'yes',
              guestCount: 2,
              dietaryRequirements: 'Vegetarian',
              plusOneName: 'Alex',
              updatedAt: '2026-04-18T00:00:00.000Z',
            },
          }),
          { status: 200 }
        );
      }

      if (url.endsWith('/api/rsvps/remote-token') && init?.method === 'PUT') {
        return new Response(
          JSON.stringify({
            submission: {
              inviteToken: 'remote-token',
              attending: 'no',
              guestCount: 1,
              dietaryRequirements: 'Vegetarian',
              plusOneName: 'Alex',
              updatedAt: '2026-04-18T00:00:00.000Z',
            },
          }),
          { status: 200 }
        );
      }

      if (url.endsWith('/api/admin/admin-guid/database')) {
        return new Response(
          JSON.stringify({
            snapshot: {
              provider: 'postgres',
              connectionLabel: 'railway.internal/wedding',
              invites: [
                {
                  token: 'remote-token',
                  displayName: 'Remote Guest',
                  inviteType: 'plus_one',
                  plusOneAllowed: true,
                  active: true,
                  createdAt: '2026-04-18T00:00:00.000Z',
                  updatedAt: '2026-04-18T00:00:00.000Z',
                },
              ],
              rsvps: [],
            },
          }),
          { status: 200 }
        );
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    const database = new WeddingInviteDatabase({
      apiBaseUrl: 'https://api.example.test',
      fetchImpl: fetchMock as typeof fetch,
    });

    const invite = await database.resolveInvite('remote-token', null);
    expect(invite.invite?.displayName).toBe('Remote Guest');

    const submission = await database.getSubmission('remote-token');
    expect(submission?.plusOneName).toBe('Alex');

    await database.saveSubmission('remote-token', {
      attending: 'no',
      guestCount: 1,
      dietaryRequirements: 'Vegetarian',
      plusOneName: 'Alex',
    });

    const snapshot = await database.getDatabaseSnapshot('admin-guid');
    expect(snapshot?.provider).toBe('postgres');
    expect(snapshot?.invites.length).toBe(1);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.test/api/rsvps/remote-token',
      expect.objectContaining({ method: 'PUT' })
    );
  });
});
