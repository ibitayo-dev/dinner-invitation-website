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
    expect(compiled.querySelectorAll('.timeline-item').length).toBe(3);
    expect(compiled.querySelectorAll('.detail-card').length).toBeGreaterThan(0);
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
    expect(form?.querySelector('#rsvpPlusOneName')).toBeNull();
  });
});