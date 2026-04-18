import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    window.localStorage.clear();
    (window as Window & { __WEDDING_API_BASE_URL__?: string }).__WEDDING_API_BASE_URL__ = '';
    (window as Window & { __WEDDING_INVITE_TOKEN__?: string }).__WEDDING_INVITE_TOKEN__ = '';
    (window as Window & { __WEDDING_INVITEE_NAME__?: string }).__WEDDING_INVITEE_NAME__ = '';
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('creates the invitation shell', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the invitation landing experience', async () => {
    const fixture = TestBed.createComponent(App);
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

  it('opens the RSVP form', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    (compiled.querySelector('.btn-primary') as HTMLButtonElement | null)?.click();
    fixture.detectChanges();

    const form = compiled.querySelector('.rsvp-form');
    expect(form).not.toBeNull();
    expect(form?.querySelector('#rsvpPlusOneName')).toBeNull();
    expect(form?.textContent).not.toContain('Email Address');
    expect(form?.textContent).not.toContain('Your Name');
  });
});
