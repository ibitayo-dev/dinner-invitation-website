import { WeddingInviteDatabase } from './invite-database';

describe('WeddingInviteDatabase', () => {
  beforeEach(() => {
    window.localStorage.clear();
    (window as Window & { __WEDDING_API_BASE_URL__?: string }).__WEDDING_API_BASE_URL__ = '';
  });

  it('resolves seeded local invites and saves RSVP data locally', async () => {
    const database = new WeddingInviteDatabase();
    const invite = await database.resolveInvite('shannon-plus-one', null);

    expect(invite.invite?.displayName).toBe('Shannon');
    expect(invite.invite?.plusOneAllowed).toBe(true);

    await database.saveSubmission('shannon-plus-one', {
      attending: 'yes',
      guestCount: 2,
      dietaryRequirements: 'Vegetarian',
      plusOneName: 'Alex',
    });

    const saved = await database.getSubmission('shannon-plus-one');
    expect(saved?.plusOneName).toBe('Alex');
    expect(saved?.guestCount).toBe(2);
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

      throw new Error(`Unexpected request: ${url}`);
    });

    const database = new WeddingInviteDatabase(window.localStorage, {
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

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.test/api/rsvps/remote-token',
      expect.objectContaining({ method: 'PUT' })
    );
  });
});
