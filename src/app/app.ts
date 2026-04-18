import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InviteRecord, WeddingInviteDatabase } from './invite-database';

interface Detail {
  label: string;
  value: string;
}

interface TimelineItem {
  time: string;
  title: string;
  body: string;
}

@Component({
  selector: 'app-root',
  imports: [FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit, OnDestroy {
  private observer?: IntersectionObserver;
  private readonly inviteDatabase = new WeddingInviteDatabase();
  private readonly cdr = inject(ChangeDetectorRef);

  protected activeInvite: InviteRecord | null = null;
  protected inviteeName = 'friend';
  protected inviteSource = 'default';
  protected inviteError = '';
  protected readonly details: Detail[] = [
    { label: 'Date', value: 'Friday, 27th November 2026' },
    { label: 'Time', value: '6:00 PM - 9:00 PM' },
    { label: 'Venue', value: 'The Coal Shed, One Tower Bridge' },
    { label: 'Dress', value: 'Formal' },
    { label: 'RSVP by', value: '1 October 2026' },
  ];

  protected readonly timeline: TimelineItem[] = [
    {
      time: '3:00',
      title: 'Welcome Reception',
      body: 'Arrive at The Coal Shed for welcome drinks and canapés with panoramic riverside views.',
    },
    {
      time: '4:00',
      title: 'Dinner Service',
      body: 'Enjoy a carefully curated three-course dining experience with premium wine pairings.',
    },
    {
      time: '5:30',
      title: 'Speeches & Toasts',
      body: 'Celebrate with heartfelt speeches, champagne toasts, and cherished moments together.',
    },
  ];

  protected readonly heroQuote =
    'Join us for an evening of exceptional dining and celebration overlooking the Thames at The Coal Shed, One Tower Bridge.';

  protected readonly photoSrc = 'couple-photo.jpeg';
  protected readonly photoAlt = 'A smiling couple standing together by the water in front of a brick building';
  protected readonly rsvpHref = '#rsvp';
  protected readonly mapHref =
    'https://www.google.com/maps/search/?api=1&query=The+Coal+Shed+One+Tower+Bridge+London';

  protected rsvpAttending: 'yes' | 'no' = 'yes';
  protected rsvpGuests = '1';
  protected rsvpDietary = '';
  protected rsvpPlusOneName = '';
  protected showRsvpForm = false;
  protected rsvpSubmitted = false;
  protected savedRsvpLoaded = false;

  ngOnInit(): void {
    void this.loadInvite();
  }

  private async loadInvite(): Promise<void> {
    const params = new URLSearchParams(window.location.search);
    const runtime = window as Window & { __WEDDING_INVITE_TOKEN__?: string; __WEDDING_INVITEE_NAME__?: string };
    const token = params.get('token')?.trim() || runtime.__WEDDING_INVITE_TOKEN__?.trim() || null;
    const inviteeName = params.get('name')?.trim() || runtime.__WEDDING_INVITEE_NAME__?.trim() || null;
    const resolvedInvite = await this.inviteDatabase.resolveInvite(token, inviteeName);
    const invite = resolvedInvite.invite;

    this.activeInvite = invite;
    this.inviteeName = invite?.displayName ?? inviteeName ?? 'friend';
    this.inviteSource = resolvedInvite.source;

    if (resolvedInvite.source === 'token' && invite) {
      const savedSubmission = await this.inviteDatabase.getSubmission(invite.token);
      if (savedSubmission) {
        this.applySubmission(
          savedSubmission.attending,
          savedSubmission.guestCount,
          savedSubmission.dietaryRequirements,
          savedSubmission.plusOneName
        );
        this.showRsvpForm = true;
        this.savedRsvpLoaded = true;
      }
    } else if (resolvedInvite.source === 'invalid') {
      this.inviteError = resolvedInvite.error ?? 'This invite link could not be found.';
    } else if (inviteeName) {
      this.inviteeName = inviteeName;
    }

    // Set up intersection observer for scroll animations
    if (typeof IntersectionObserver !== 'undefined') {
      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('visible');
            }
          });
        },
        {
          threshold: 0.1,
          rootMargin: '0px 0px -50px 0px',
        }
      );

      // Observe all elements with data-animate attribute
      setTimeout(() => {
        const elements = document.querySelectorAll('[data-animate]');
        elements.forEach((el) => this.observer?.observe(el));
      }, 100);
    }

    this.cdr.detectChanges();
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  // Generate .ics calendar file for the event
  protected downloadCalendar(): void {
    const event = {
      title: 'Ibitayo and Shannon - Post Wedding Dinner',
      location: 'The Coal Shed, One Tower Bridge, 4 Crown Square, London SE1 2SE',
      description: 'Join us for an evening of exceptional dining and celebration overlooking the Thames.',
      start: '20261127T150000', // November 27, 2026, 3:00 PM
      end: '20261127T180000', // November 27, 2026, 6:00 PM
    };

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Wedding Celebration//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `DTSTART:${event.start}`,
      `DTEND:${event.end}`,
      `SUMMARY:${event.title}`,
      `DESCRIPTION:${event.description}`,
      `LOCATION:${event.location}`,
      'STATUS:CONFIRMED',
      'SEQUENCE:0',
      'BEGIN:VALARM',
      'TRIGGER:-P1D',
      'ACTION:DISPLAY',
      'DESCRIPTION:Reminder: Post Wedding Dinner tomorrow',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = 'ibitayo-shannon-dinner.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(link.href);
  }

  protected toggleRsvpForm(): void {
    this.showRsvpForm = !this.showRsvpForm;
    this.rsvpSubmitted = false;
    this.savedRsvpLoaded = false;
    if (this.activeInvite) {
      this.inviteError = '';
    }
  }

  protected async submitRsvp(): Promise<void> {
    if (!this.activeInvite) {
      this.inviteError = 'Open a valid invite link to save an RSVP.';
      return;
    }

    await this.inviteDatabase.saveSubmission(this.activeInvite.token, {
      attending: this.rsvpAttending,
      guestCount: Number(this.rsvpGuests),
      dietaryRequirements: this.rsvpDietary.trim(),
      plusOneName: this.rsvpPlusOneName.trim(),
    });

    this.rsvpSubmitted = true;
    this.showRsvpForm = false;
    this.savedRsvpLoaded = false;
    this.inviteError = '';
    this.cdr.detectChanges();
  }

  protected get showPlusOneField(): boolean {
    return Boolean(this.activeInvite?.plusOneAllowed && this.rsvpAttending === 'yes');
  }

  private applySubmission(attending: 'yes' | 'no', guestCount: number, dietaryRequirements: string, plusOneName: string): void {
    this.rsvpAttending = attending;
    this.rsvpGuests = String(guestCount);
    this.rsvpDietary = dietaryRequirements;
    this.rsvpPlusOneName = plusOneName;
  }
}
