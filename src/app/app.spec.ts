import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('creates the invitation shell', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the simplified invitation experience', async () => {
    window.history.replaceState({}, '', '/?name=Sarah');
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Ibitayo');
    expect(compiled.querySelector('h1')?.textContent).toContain('Shannon');
    expect(compiled.querySelector('.rsvp-title')?.textContent).toContain('Sarah');
    expect(compiled.querySelector('.highlights-section')).toBeNull();
    expect(compiled.querySelector('.venue-section')).toBeNull();
    expect(compiled.querySelectorAll('.timeline-item').length).toBe(3);
    expect(compiled.querySelectorAll('.detail-card').length).toBeGreaterThan(0);

    (compiled.querySelector('.btn-primary') as HTMLButtonElement | null)?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const form = compiled.querySelector('.rsvp-form');
    expect(form?.textContent).not.toContain('Email Address');
    expect(form?.textContent).not.toContain('Your Name');
  });
});
