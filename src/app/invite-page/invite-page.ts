import { NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

import { InviteRecord, RsvpSubmission } from '../invite-database';
import { getUiErrorMessage, normalizeGuestCountSelection } from '../invite-ui-helpers';
import { createInvitePageRevealObserver } from './invite-page-animations';
import {
  inviteAttireSection,
  inviteCalendarLinkLabel,
  inviteMapLinkLabel,
  invitePageDetailsIntro,
  invitePageFacts,
  invitePageHero,
  invitePageNavigationItems,
  invitePagePhotos,
  inviteRsvpSection,
  inviteTravelSection,
  inviteVenueSection,
} from './invite-page-content';
import { InvitePageFacade } from './invite-page-facade';

interface GuestCountOption {
  label: string;
  value: string;
}

const plusOneGuestCountOptions: GuestCountOption[] = [
  { label: '1 Guest', value: '1' },
  { label: '2 Guests', value: '2' },
];

@Component({
  selector: 'app-invite-page',
  imports: [NgOptimizedImage, ReactiveFormsModule],
  templateUrl: './invite-page.html',
  styleUrl: './invite-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvitePageComponent implements OnInit, OnDestroy {
  private observer?: IntersectionObserver;
  private readonly invitePageFacade = inject(InvitePageFacade);

  protected readonly activeInvite = signal<InviteRecord | null>(null);
  protected readonly inviteeName = signal('friend');
  protected readonly inviteSource = signal<'token' | 'legacy' | 'default' | 'invalid'>('default');
  protected readonly inviteError = signal('');
  protected readonly showRsvpForm = signal(false);
  protected readonly rsvpSubmitted = signal(false);
  protected readonly savedRsvpLoaded = signal(false);
  protected readonly attireSection = inviteAttireSection;
  protected readonly calendarLinkLabel = inviteCalendarLinkLabel;
  protected readonly details = invitePageFacts;
  protected readonly detailsIntro = invitePageDetailsIntro;
  protected readonly hero = invitePageHero;
  protected readonly mapHref = inviteVenueSection.mapHref;
  protected readonly mapLinkLabel = inviteMapLinkLabel;
  protected readonly navigationItems = invitePageNavigationItems;
  protected readonly photos = invitePagePhotos;
  protected readonly rsvpSection = inviteRsvpSection;
  protected readonly travelSection = inviteTravelSection;
  protected readonly venueSection = inviteVenueSection;

  protected readonly rsvpForm = new FormGroup({
    attending: new FormControl<'yes' | 'no'>('yes', { nonNullable: true }),
    dietaryRequirements: new FormControl('', { nonNullable: true }),
    guestCount: new FormControl('1', { nonNullable: true }),
    plusOneName: new FormControl('', { nonNullable: true }),
  });

  private readonly attendingValue = toSignal(this.rsvpForm.controls.attending.valueChanges, {
    initialValue: this.rsvpForm.controls.attending.value,
  });

  private readonly guestCountValue = toSignal(this.rsvpForm.controls.guestCount.valueChanges, {
    initialValue: this.rsvpForm.controls.guestCount.value,
  });

  protected readonly showGuestCountField = computed(() => {
    return Boolean(this.activeInvite()?.plusOneAllowed && this.attendingValue() === 'yes');
  });

  protected readonly guestCountOptions = computed(() => {
    return this.showGuestCountField()
      ? plusOneGuestCountOptions
      : plusOneGuestCountOptions.slice(0, 1);
  });

  protected readonly rsvpInviteeName = computed(() => {
    const value = this.inviteeName().trim();

    if (!value) {
      return 'Friend';
    }

    return value.charAt(0).toUpperCase() + value.slice(1);
  });

  protected readonly showPlusOneField = computed(() => {
    return Boolean(this.showGuestCountField() && this.guestCountValue() === '2');
  });

  private readonly guestCountConstraintEffect = effect(() => {
    const normalizedGuestCount = normalizeGuestCountSelection(
      this.guestCountValue(),
      this.showGuestCountField(),
    );

    if (this.rsvpForm.controls.guestCount.value !== normalizedGuestCount) {
      this.rsvpForm.controls.guestCount.setValue(normalizedGuestCount);
    }

    if (normalizedGuestCount !== '2' && this.rsvpForm.controls.plusOneName.value) {
      this.rsvpForm.controls.plusOneName.setValue('');
    }
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
    try {
      await this.invitePageFacade.save(this.activeInvite(), {
        attending: this.rsvpForm.controls.attending.getRawValue(),
        dietaryRequirements: this.rsvpForm.controls.dietaryRequirements.getRawValue(),
        guestCount: Number(this.rsvpForm.controls.guestCount.getRawValue()),
        plusOneName: this.rsvpForm.controls.plusOneName.getRawValue(),
      });

      this.rsvpSubmitted.set(true);
      this.showRsvpForm.set(false);
      this.savedRsvpLoaded.set(false);
      this.inviteError.set('');
    } catch (error) {
      this.inviteError.set(getUiErrorMessage(error));
    }
  }

  protected downloadCalendar(): void {
    const event = {
      description: 'Join us for an intimate post wedding dinner at The Coal Shed, One Tower Bridge.',
      end: '20261127T210000',
      location: 'The Coal Shed, One Tower Bridge, 4 Crown Square, London SE1 2SE',
      start: '20261127T180000',
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
    link.download = 'ibitayo-shannon-post-wedding-dinner.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(link.href);
  }

  private async loadInvite(): Promise<void> {
    const state = await this.invitePageFacade.load();

    this.activeInvite.set(state.invite);
    this.inviteeName.set(state.inviteeName);
    this.inviteSource.set(state.inviteSource);
    this.inviteError.set(state.inviteError);

    if (state.savedSubmission) {
      this.applySubmission(state.savedSubmission);
      this.showRsvpForm.set(true);
      this.savedRsvpLoaded.set(true);
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
    this.observer = createInvitePageRevealObserver();
  }
}
