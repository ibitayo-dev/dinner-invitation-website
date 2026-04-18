import { TestBed } from '@angular/core/testing';

import { InvitePageComponent } from './invite-page';

describe('InvitePageComponent', () => {
  beforeEach(async () => {
    (window as Window & { __WEDDING_API_BASE_URL__?: string }).__WEDDING_API_BASE_URL__ = '';
    (window as Window & { __WEDDING_INVITE_TOKEN__?: string }).__WEDDING_INVITE_TOKEN__ = '';
    (window as Window & { __WEDDING_INVITEE_NAME__?: string }).__WEDDING_INVITEE_NAME__ = '';

    await TestBed.configureTestingModule({
      imports: [InvitePageComponent],
    }).compileComponents();
  });

  it('renders the invitation landing experience', async () => {
    const fixture = TestBed.createComponent(InvitePageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Ibitayo');
    expect(compiled.querySelector('h1')?.textContent).toContain('Shannon');
    expect(compiled.querySelector('.rsvp-title')?.textContent).toContain("friend, we'd love to have you!");
    expect(compiled.textContent).not.toContain('Event Schedule');
    expect(compiled.querySelectorAll('.detail-card').length).toBeGreaterThan(0);
    expect(compiled.querySelectorAll('.icon-pulse').length).toBeGreaterThan(0);
  });

  it('opens the RSVP form without showing plus-one input for the default invite', async () => {
    const fixture = TestBed.createComponent(InvitePageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    (compiled.querySelector('.btn-primary') as HTMLButtonElement | null)?.click();
    fixture.detectChanges();

    const form = compiled.querySelector('.rsvp-form');
    expect(form).not.toBeNull();
    expect(form?.querySelector('#rsvpGuests')).toBeNull();
    expect(form?.querySelector('#rsvpPlusOneName')).toBeNull();
  });

  it('caps plus-one invites to two guests and only shows the plus-one field for a second guest', async () => {
    const fixture = TestBed.createComponent(InvitePageComponent);
    const component = fixture.componentInstance as InvitePageComponent & {
      activeInvite: { set: (invite: unknown) => void };
      rsvpForm: InvitePageComponent['rsvpForm'];
    };

    fixture.detectChanges();
    await fixture.whenStable();

    component.activeInvite.set({
      token: 'shannon-plus-one',
      displayName: 'Shannon',
      inviteType: 'plus_one',
      plusOneAllowed: true,
      active: true,
      createdAt: '2026-04-18T00:00:00.000Z',
      updatedAt: '2026-04-18T00:00:00.000Z',
    });

    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    (compiled.querySelector('.btn-primary') as HTMLButtonElement | null)?.click();
    fixture.detectChanges();

    const guestSelect = compiled.querySelector('#rsvpGuests') as HTMLSelectElement | null;
    expect(guestSelect).not.toBeNull();
    expect(guestSelect?.options.length).toBe(2);

    component.rsvpForm.controls.guestCount.setValue('4');
    fixture.detectChanges();
    expect(component.rsvpForm.controls.guestCount.value).toBe('2');
    expect(compiled.querySelector('#rsvpPlusOneName')).not.toBeNull();

    component.rsvpForm.controls.attending.setValue('no');
    fixture.detectChanges();
    expect(component.rsvpForm.controls.guestCount.value).toBe('1');
    expect(compiled.querySelector('#rsvpGuests')).toBeNull();
    expect(compiled.querySelector('#rsvpPlusOneName')).toBeNull();
  });
});