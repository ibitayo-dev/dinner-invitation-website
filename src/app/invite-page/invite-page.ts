import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

import { InviteRecord, RsvpSubmission, WeddingInviteDatabase } from '../invite-database';

interface Detail {
  label: string;
  value: string;
}

interface TimelineItem {
  body: string;
  time: string;
  title: string;
}

const invitationDetails: Detail[] = [
  { label: 'Date', value: 'Friday, 27th November 2026' },
  { label: 'Time', value: '6:00 PM - 9:00 PM' },
  { label: 'Venue', value: 'The Coal Shed, One Tower Bridge' },
  { label: 'Dress', value: 'Formal' },
  { label: 'RSVP by', value: '1 October 2026' },
];

const invitationTimeline: TimelineItem[] = [
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

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

@Component({
  selector: 'app-invite-page',
  imports: [NgOptimizedImage, ReactiveFormsModule],
  templateUrl: './invite-page.html',
  styleUrl: './invite-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvitePageComponent implements OnInit, OnDestroy {
  private observer?: IntersectionObserver;
  private readonly inviteDatabase = new WeddingInviteDatabase();

  protected readonly activeInvite = signal<InviteRecord | null>(null);
  protected readonly inviteeName = signal('friend');
  protected readonly inviteSource = signal<'token' | 'legacy' | 'default' | 'invalid'>('default');
  protected readonly inviteError = signal('');
  protected readonly showRsvpForm = signal(false);
  protected readonly rsvpSubmitted = signal(false);
  protected readonly savedRsvpLoaded = signal(false);
  protected readonly details = invitationDetails;
  protected readonly timeline = invitationTimeline;
  protected readonly heroQuote =
    'Join us for an evening of exceptional dining and celebration overlooking the Thames at The Coal Shed, One Tower Bridge.';
  protected readonly photoAlt = 'A smiling couple standing together by the water in front of a brick building';
  protected readonly photoSrc = 'couple-photo.jpeg';
  protected readonly mapHref =
    'https://www.google.com/maps/search/?api=1&query=The+Coal+Shed+One+Tower+Bridge+London';

  protected readonly rsvpForm = new FormGroup({
    attending: new FormControl<'yes' | 'no'>('yes', { nonNullable: true }),
    dietaryRequirements: new FormControl('', { nonNullable: true }),
    guestCount: new FormControl('1', { nonNullable: true }),
    plusOneName: new FormControl('', { nonNullable: true }),
  });

  private readonly attendingValue = toSignal(this.rsvpForm.controls.attending.valueChanges, {
    initialValue: this.rsvpForm.controls.attending.value,
  });

  protected readonly showPlusOneField = computed(() => {
    return Boolean(this.activeInvite()?.plusOneAllowed && this.attendingValue() === 'yes');
  });

  async ngOnInit(): Promise<void> {
    await this.loadInvite();
    this.initializeAnimations();
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  protected toggleRsvpForm(): void {
    this.showRsvpForm.update((isVisible) => !isVisible);
    this.rsvpSubmitted.set(false);
    this.savedRsvpLoaded.set(false);

    if (this.activeInvite()) {
      this.inviteError.set('');
    }
  }

  protected async submitRsvp(): Promise<void> {
    const invite = this.activeInvite();
    if (!invite) {
      this.inviteError.set('Open a valid invite link to save an RSVP.');
      return;
    }

    try {
      await this.inviteDatabase.saveSubmission(invite.token, {
        attending: this.rsvpForm.controls.attending.getRawValue(),
        dietaryRequirements: this.rsvpForm.controls.dietaryRequirements.getRawValue().trim(),
        guestCount: Number(this.rsvpForm.controls.guestCount.getRawValue()),
        plusOneName: this.rsvpForm.controls.plusOneName.getRawValue().trim(),
      });

      this.rsvpSubmitted.set(true);
      this.showRsvpForm.set(false);
      this.savedRsvpLoaded.set(false);
      this.inviteError.set('');
    } catch (error) {
      this.inviteError.set(getErrorMessage(error));
    }
  }

  protected downloadCalendar(): void {
    const event = {
      description: 'Join us for an evening of exceptional dining and celebration overlooking the Thames.',
      end: '20261127T180000',
      location: 'The Coal Shed, One Tower Bridge, 4 Crown Square, London SE1 2SE',
      start: '20261127T150000',
      title: 'Ibitayo and Shannon - Post Wedding Dinner',
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

  private async loadInvite(): Promise<void> {
    const params = new URLSearchParams(window.location.search);
    const runtime = window as Window & { __WEDDING_INVITE_TOKEN__?: string; __WEDDING_INVITEE_NAME__?: string };
    const token = params.get('token')?.trim() || runtime.__WEDDING_INVITE_TOKEN__?.trim() || null;
    const inviteeName = params.get('name')?.trim() || runtime.__WEDDING_INVITEE_NAME__?.trim() || null;
    const resolvedInvite = await this.inviteDatabase.resolveInvite(token, inviteeName);
    const invite = resolvedInvite.invite;

    this.activeInvite.set(invite);
    this.inviteeName.set(invite?.displayName ?? inviteeName ?? 'friend');
    this.inviteSource.set(resolvedInvite.source);

    if (resolvedInvite.source === 'token' && invite) {
      const savedSubmission = await this.inviteDatabase.getSubmission(invite.token);
      if (savedSubmission) {
        this.applySubmission(savedSubmission);
        this.showRsvpForm.set(true);
        this.savedRsvpLoaded.set(true);
      }
      return;
    }

    if (resolvedInvite.source === 'invalid') {
      this.inviteError.set(resolvedInvite.error ?? 'This invite link could not be found.');
      return;
    }

    if (inviteeName) {
      this.inviteeName.set(inviteeName);
    }
  }

  private applySubmission(submission: RsvpSubmission): void {
    this.rsvpForm.setValue({
      attending: submission.attending,
      dietaryRequirements: submission.dietaryRequirements,
      guestCount: String(submission.guestCount),
      plusOneName: submission.plusOneName,
    });
  }

  private initializeAnimations(): void {
    if (typeof IntersectionObserver === 'undefined') {
      return;
    }

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

    queueMicrotask(() => {
      document.querySelectorAll('[data-animate]').forEach((element) => this.observer?.observe(element));
    });
  }
}