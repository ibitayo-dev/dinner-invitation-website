import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('creates the invitation shell', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the simplified invitation experience', async () => {
    window.history.replaceState({}, '', '/?token=shannon-plus-one');
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Ibitayo');
    expect(compiled.querySelector('h1')?.textContent).toContain('Shannon');
    expect(compiled.querySelector('.rsvp-title')?.textContent).toContain('Shannon');
    expect(compiled.querySelectorAll('.timeline-item').length).toBe(3);
    expect(compiled.querySelectorAll('.detail-card').length).toBeGreaterThan(0);

    (compiled.querySelector('.btn-primary') as HTMLButtonElement | null)?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const form = compiled.querySelector('.rsvp-form');
    expect(form?.querySelector('#rsvpPlusOneName')).not.toBeNull();
    expect(form?.textContent).not.toContain('Email Address');
    expect(form?.textContent).not.toContain('Your Name');
  });

  it('loads a saved RSVP for an invite token', async () => {
    window.localStorage.setItem(
      'dinner-invitation.submissions.v1',
      JSON.stringify({
        submissions: {
          'shannon-plus-one': {
            inviteToken: 'shannon-plus-one',
            attending: 'yes',
            guestCount: 2,
            dietaryRequirements: 'Vegetarian',
            plusOneName: 'Alex',
            updatedAt: '2026-04-18T00:00:00.000Z',
          },
        },
      })
    );
    window.history.replaceState({}, '', '/?token=shannon-plus-one');
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.rsvp-success')?.textContent).toContain('Saved RSVP loaded');
    expect((compiled.querySelector('#rsvpPlusOneName') as HTMLInputElement | null)?.value).toBe('Alex');
  });

  it('shows an error for an unknown invite token', async () => {
    window.history.replaceState({}, '', '/?token=missing-token');
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.rsvp-success')?.textContent).toContain('Invite link issue');
    expect(compiled.querySelector('.rsvp-actions')).not.toBeNull();
  });
});
