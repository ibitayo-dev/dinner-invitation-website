import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface Detail {
  label: string;
  value: string;
}

interface TimelineItem {
  time: string;
  title: string;
  body: string;
}

interface VenueNote {
  title: string;
  body: string;
}

interface Highlight {
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
  protected readonly details: Detail[] = [
    { label: 'Date', value: 'Saturday, 27 November 2026' },
    { label: 'Time', value: '3:00 PM - 6:00 PM' },
    { label: 'Venue', value: 'The Coal Shed, One Tower Bridge' },
    { label: 'Dress', value: 'Formal' },
    { label: 'RSVP by', value: '1 October 2026' },
  ];

  protected readonly highlights: Highlight[] = [
    {
      title: 'Arrival & Drinks',
      body: 'Join us at 3:00 PM for welcome cocktails and canapés with stunning views of Tower Bridge.',
    },
    {
      title: 'Dining Experience',
      body: 'Indulge in an exquisite three-course meal featuring the finest cuts and seasonal ingredients.',
    },
    {
      title: 'Celebration',
      body: 'Share in heartfelt speeches, toasts, and celebration as we mark this special occasion together.',
    },
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

  protected readonly venueNotes: VenueNote[] = [
    {
      title: 'Location',
      body: 'The Coal Shed is at One Tower Bridge, 4 Crown Square, SE1 2SE. A short walk from London Bridge station with stunning Thames views.',
    },
    {
      title: 'Dietary Requirements',
      body: 'Please inform us of any dietary restrictions or allergies when you RSVP so we can accommodate your needs.',
    },
    {
      title: 'Parking & Transport',
      body: 'Limited parking available nearby. We recommend using London Bridge or Tower Hill stations, both within walking distance.',
    },
  ];

  protected readonly heroQuote =
    'Join us for an evening of exceptional dining and celebration overlooking the Thames at The Coal Shed, One Tower Bridge.';

  protected readonly photoSrc = 'couple-photo.jpeg';
  protected readonly photoAlt = 'A smiling couple standing together by the water in front of a brick building';
  protected readonly rsvpHref = '#rsvp';
  protected readonly mapHref =
    'https://www.google.com/maps/search/?api=1&query=The+Coal+Shed+One+Tower+Bridge+London';

  ngOnInit(): void {
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
      end: '20261127T180000',   // November 27, 2026, 6:00 PM
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

  // Handle RSVP form submission
  protected rsvpName = '';
  protected rsvpEmail = '';
  protected rsvpAttending = 'yes';
  protected rsvpGuests = '1';
  protected rsvpDietary = '';
  protected showRsvpForm = false;
  protected rsvpSubmitted = false;

  protected toggleRsvpForm(): void {
    this.showRsvpForm = !this.showRsvpForm;
    this.rsvpSubmitted = false;
  }

  protected submitRsvp(): void {
    // Validate form
    if (!this.rsvpName || !this.rsvpEmail) {
      alert('Please fill in your name and email address.');
      return;
    }

    // Construct mailto link with form data
    const subject = `RSVP: ${this.rsvpAttending === 'yes' ? 'Attending' : 'Unable to Attend'} - Ibitayo and Shannon Dinner`;
    const body = `Name: ${this.rsvpName}
Email: ${this.rsvpEmail}
Attending: ${this.rsvpAttending === 'yes' ? 'Yes' : 'No'}
Number of Guests: ${this.rsvpGuests}
Dietary Requirements: ${this.rsvpDietary || 'None'}

---
This RSVP was submitted for the Post Wedding Dinner on Saturday, 27 November 2026.`;

    const mailtoLink = `mailto:rsvp@example.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    // Open default email client
    window.location.href = mailtoLink;

    // Show success message
    this.rsvpSubmitted = true;
    this.showRsvpForm = false;
  }
}
