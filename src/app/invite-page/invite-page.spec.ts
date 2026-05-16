import { TestBed } from '@angular/core/testing';

import { InvitePageComponent } from './invite-page';
import { InvitePageFacade, InvitePageLoadState } from './invite-page-facade';

function createInvitePageFacadeStub() {
  return {
    load: vi.fn(
      async (): Promise<InvitePageLoadState> => ({
        invite: {
          token: 'guest',
          displayName: 'friend',
          inviteType: 'solo',
          plusOneAllowed: false,
          active: true,
          createdAt: '2026-04-18T00:00:00.000Z',
          updatedAt: '2026-04-18T00:00:00.000Z',
        },
        inviteeName: 'friend',
        inviteSource: 'default',
        inviteError: '',
        savedSubmission: null,
      }),
    ),
    save: vi.fn(
      async (
        _invite,
        submission,
      ): Promise<{
        inviteToken: string;
        attending: 'yes' | 'no';
        guestCount: number;
        dietaryRequirements: string;
        plusOneName: string;
        inviteeStarter: string;
        inviteeMain: string;
        inviteeDessert: string;
        plusOneStarter: string;
        plusOneMain: string;
        plusOneDessert: string;
        updatedAt: string;
      }> => ({
        inviteToken: 'guest',
        attending: 'yes',
        guestCount: 1,
        dietaryRequirements: submission.dietaryRequirements,
        plusOneName: submission.plusOneName,
        inviteeStarter: submission.inviteeStarter,
        inviteeMain: submission.inviteeMain,
        inviteeDessert: submission.inviteeDessert,
        plusOneStarter: submission.plusOneStarter,
        plusOneMain: submission.plusOneMain,
        plusOneDessert: submission.plusOneDessert,
        updatedAt: '2026-04-18T02:00:00.000Z',
      }),
    ),
  };
}

async function renderInvitePage(facade: ReturnType<typeof createInvitePageFacadeStub>) {
  await TestBed.configureTestingModule({
    imports: [InvitePageComponent],
    providers: [
      {
        provide: InvitePageFacade,
        useValue: facade,
      },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(InvitePageComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

describe('InvitePageComponent', () => {
  beforeEach(() => {
    (window as Window & { __WEDDING_API_BASE_URL__?: string }).__WEDDING_API_BASE_URL__ = '';
    (window as Window & { __WEDDING_INVITE_TOKEN__?: string }).__WEDDING_INVITE_TOKEN__ = '';
    (window as Window & { __WEDDING_INVITEE_NAME__?: string }).__WEDDING_INVITEE_NAME__ = '';
  });

  afterEach(() => {
    delete (window as Window & { __WEDDING_API_BASE_URL__?: string }).__WEDDING_API_BASE_URL__;
    delete (window as Window & { __WEDDING_INVITE_TOKEN__?: string }).__WEDDING_INVITE_TOKEN__;
    delete (window as Window & { __WEDDING_INVITEE_NAME__?: string }).__WEDDING_INVITEE_NAME__;
  });

  it('renders the invitation landing experience', async () => {
    const facade = createInvitePageFacadeStub();
    const fixture = await renderInvitePage(facade);
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('h1')?.textContent).toContain('IBITAYO');
    expect(compiled.querySelector('.hero-name--right')?.textContent).toContain('SHANNON');
    expect(compiled.querySelector('.section--rsvp h2')?.textContent).toContain('Friend');
    expect(compiled.textContent).toContain('Guest Attire');
    expect(compiled.querySelectorAll('.fact-card').length).toBe(4);
    expect(compiled.querySelectorAll('.attire-track').length).toBe(2);
    expect(facade.load).toHaveBeenCalled();
  });

  it('opens the RSVP form without showing plus-one input for the default invite', async () => {
    const facade = createInvitePageFacadeStub();
    const fixture = await renderInvitePage(facade);
    const compiled = fixture.nativeElement as HTMLElement;
    (compiled.querySelector('.rsvp-open-button') as HTMLButtonElement | null)?.click();
    fixture.detectChanges();

    const form = compiled.querySelector('.rsvp-form');
    expect(form).not.toBeNull();
    expect(form?.querySelector('#rsvpGuests')).toBeNull();
    expect(form?.querySelector('#rsvpPlusOneName')).toBeNull();
  });

  it('shows plus-one controls for loaded token invites and normalizes guest selection through the UI', async () => {
    const facade = createInvitePageFacadeStub();
    facade.load.mockResolvedValue({
      invite: {
        token: 'shannon-plus-one',
        displayName: 'Shannon',
        inviteType: 'plus_one',
        plusOneAllowed: true,
        active: true,
        createdAt: '2026-04-18T00:00:00.000Z',
        updatedAt: '2026-04-18T00:00:00.000Z',
      },
      inviteeName: 'Shannon',
      inviteSource: 'token',
      inviteError: '',
      savedSubmission: null,
    });

    const fixture = await renderInvitePage(facade);
    const compiled = fixture.nativeElement as HTMLElement;
    (compiled.querySelector('.rsvp-open-button') as HTMLButtonElement | null)?.click();
    fixture.detectChanges();

    const guestSelect = compiled.querySelector('#rsvpGuests') as HTMLSelectElement | null;
    expect(guestSelect).not.toBeNull();
    expect(guestSelect?.options.length).toBe(2);

    guestSelect!.value = '2';
    guestSelect!.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(compiled.querySelector('#rsvpPlusOneName')).not.toBeNull();

    const attendingSelect = compiled.querySelector('#rsvpAttending') as HTMLSelectElement | null;
    attendingSelect!.value = 'no';
    attendingSelect!.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(compiled.querySelector('#rsvpGuests')).toBeNull();
    expect(compiled.querySelector('#rsvpPlusOneName')).toBeNull();
    expect(compiled.querySelector('#inviteeStarter')).toBeNull();
    expect(compiled.querySelector('#rsvpDietary')).toBeNull();
  });

  it('submits RSVP details through the injected gateway and shows success feedback', async () => {
    const facade = createInvitePageFacadeStub();
    facade.load.mockResolvedValue({
      invite: {
        token: 'remote-token',
        displayName: 'Remote Guest',
        inviteType: 'plus_one',
        plusOneAllowed: true,
        active: true,
        createdAt: '2026-04-18T00:00:00.000Z',
        updatedAt: '2026-04-18T00:00:00.000Z',
      },
      inviteeName: 'Remote Guest',
      inviteSource: 'token',
      inviteError: '',
      savedSubmission: null,
    });

    const fixture = await renderInvitePage(facade);
    const compiled = fixture.nativeElement as HTMLElement;

    (compiled.querySelector('.rsvp-open-button') as HTMLButtonElement | null)?.click();
    fixture.detectChanges();

    const guestSelect = compiled.querySelector('#rsvpGuests') as HTMLSelectElement | null;
    const inviteeStarter = compiled.querySelector('#inviteeStarter') as HTMLSelectElement | null;
    const inviteeMain = compiled.querySelector('#inviteeMain') as HTMLSelectElement | null;
    const dietaryRequirements = compiled.querySelector(
      '#rsvpDietary',
    ) as HTMLTextAreaElement | null;

    guestSelect!.value = '2';
    guestSelect!.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    await fixture.whenStable();

    const plusOneName = compiled.querySelector('#rsvpPlusOneName') as HTMLInputElement | null;
    const plusOneMain = compiled.querySelector('#plusOneMain') as HTMLSelectElement | null;

    plusOneName!.value = ' Alex ';
    plusOneName!.dispatchEvent(new Event('input'));
    inviteeStarter!.value = 'Steak Tartare';
    inviteeStarter!.dispatchEvent(new Event('change'));
    inviteeMain!.value = 'Grilled Butterflied Seabass';
    inviteeMain!.dispatchEvent(new Event('change'));
    plusOneMain!.value = 'Ribeye Steak 300g';
    plusOneMain!.dispatchEvent(new Event('change'));
    dietaryRequirements!.value = ' Vegetarian ';
    dietaryRequirements!.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    (compiled.querySelector('button[type="submit"]') as HTMLButtonElement | null)?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(facade.save).toHaveBeenCalled();
    expect(facade.save).toHaveBeenLastCalledWith(
      expect.objectContaining({ token: 'remote-token' }),
      expect.objectContaining({
        inviteeStarter: 'Steak Tartare',
        inviteeMain: 'Grilled Butterflied Seabass',
        plusOneMain: 'Ribeye Steak 300g',
      }),
    );
    expect(compiled.textContent).toContain('Thank you.');
  });
});
