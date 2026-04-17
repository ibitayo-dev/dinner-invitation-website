import { Component, OnInit, OnDestroy } from '@angular/core';

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
  imports: [],
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
    'Join us for an afternoon of exceptional dining and celebration overlooking the Thames at The Coal Shed, One Tower Bridge.';

  protected readonly photoSrc = 'couple-photo.jpeg';
  protected readonly photoAlt = 'A smiling couple standing together by the water in front of a brick building';
  protected readonly rsvpHref = '#rsvp';
  protected readonly mapHref =
    'https://www.google.com/maps/search/?api=1&query=The+Coal+Shed+One+Tower+Bridge+London';
  protected readonly calendarHref = '#details';

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
}
