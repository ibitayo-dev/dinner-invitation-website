import { TestBed } from '@angular/core/testing';

import { ResolveInviteResult, WEDDING_INVITE_DATABASE } from '../invite-database';
import { InvitePageFacade } from './invite-page-facade';

function createInviteGatewayStub() {
  return {
    resolveInvite: vi.fn(
      async (): Promise<ResolveInviteResult> => ({
        invite: {
          token: 'remote-token',
          displayName: 'Remote Guest',
          inviteType: 'plus_one',
          plusOneAllowed: true,
          active: true,
          createdAt: '2026-04-18T00:00:00.000Z',
          updatedAt: '2026-04-18T00:00:00.000Z',
        },
        source: 'token',
      }),
    ),
    getSubmission: vi.fn(async () => ({
      inviteToken: 'remote-token',
      attending: 'yes' as const,
      guestCount: 2,
      dietaryRequirements: 'Vegetarian',
      plusOneName: 'Alex',
      updatedAt: '2026-04-18T02:00:00.000Z',
    })),
    saveSubmission: vi.fn(
      async (token: string, submission: { guestCount: number; plusOneName: string }) => ({
        inviteToken: token,
        attending: 'yes' as const,
        guestCount: submission.guestCount,
        dietaryRequirements: 'Vegetarian',
        plusOneName: submission.plusOneName,
        updatedAt: '2026-04-18T02:00:00.000Z',
      }),
    ),
  };
}

describe('InvitePageFacade', () => {
  it('loads invite state from tokenized runtime context and includes saved RSVP state', async () => {
    const gateway = createInviteGatewayStub();

    TestBed.configureTestingModule({
      providers: [
        InvitePageFacade,
        {
          provide: WEDDING_INVITE_DATABASE,
          useValue: gateway,
        },
      ],
    });

    const facade = TestBed.inject(InvitePageFacade);
    const state = await facade.load({
      locationSearch: '?token=remote-token',
    });

    expect(gateway.resolveInvite).toHaveBeenCalledWith('remote-token', null);
    expect(gateway.getSubmission).toHaveBeenCalledWith('remote-token');
    expect(state.inviteeName).toBe('Remote Guest');
    expect(state.inviteSource).toBe('token');
    expect(state.savedSubmission?.plusOneName).toBe('Alex');
    expect(state.inviteError).toBe('');
  });

  it('surfaces invalid invite errors without attempting to load RSVP state', async () => {
    const gateway = createInviteGatewayStub();
    gateway.resolveInvite.mockResolvedValue({
      invite: null,
      source: 'invalid',
      error: 'Missing invite',
    });

    TestBed.configureTestingModule({
      providers: [
        InvitePageFacade,
        {
          provide: WEDDING_INVITE_DATABASE,
          useValue: gateway,
        },
      ],
    });

    const facade = TestBed.inject(InvitePageFacade);
    const state = await facade.load({
      locationSearch: '?token=missing-token',
    });

    expect(state.invite).toBeNull();
    expect(state.inviteSource).toBe('invalid');
    expect(state.inviteError).toBe('Missing invite');
    expect(gateway.getSubmission).not.toHaveBeenCalled();
  });

  it('trims RSVP submission fields before saving', async () => {
    const gateway = createInviteGatewayStub();

    TestBed.configureTestingModule({
      providers: [
        InvitePageFacade,
        {
          provide: WEDDING_INVITE_DATABASE,
          useValue: gateway,
        },
      ],
    });

    const facade = TestBed.inject(InvitePageFacade);

    await facade.save(
      {
        token: 'remote-token',
        displayName: 'Remote Guest',
        inviteType: 'plus_one',
        plusOneAllowed: true,
        active: true,
        createdAt: '2026-04-18T00:00:00.000Z',
        updatedAt: '2026-04-18T00:00:00.000Z',
      },
      {
        attending: 'yes',
        dietaryRequirements: ' Vegetarian ',
        guestCount: 2,
        plusOneName: ' Alex ',
      },
    );

    expect(gateway.saveSubmission).toHaveBeenCalledWith('remote-token', {
      attending: 'yes',
      dietaryRequirements: 'Vegetarian',
      guestCount: 2,
      plusOneName: 'Alex',
    });
  });
});
