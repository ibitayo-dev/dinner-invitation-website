import { Component } from '@angular/core';

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
export class App {
  protected readonly details: Detail[] = [
    { label: 'Date', value: 'Saturday, 27 November 2026' },
    { label: 'Time', value: '6:00 PM' },
    { label: 'Venue', value: 'The Greenhouses, Marylebone' },
    { label: 'Dress', value: 'Pressed florals and garden-party evening wear' },
    { label: 'RSVP by', value: '1 October 2026' },
  ];

  protected readonly highlights: Highlight[] = [
    {
      title: 'Dinner under glass',
      body: 'A softly lit room with layered greenery, candlelight, and a layout that reads well on mobile.',
    },
    {
      title: 'Minted-inspired mood',
      body: 'Pressed-botanical stationery energy translated into a cleaner, more modern invitation.',
    },
    {
      title: 'Easy to skim',
      body: 'Clear hierarchy, quick access to the essentials, and a calmer RSVP path for guests.',
    },
  ];

  protected readonly timeline: TimelineItem[] = [
    {
      time: '6:00',
      title: 'Arrive under the glass',
      body: 'Guests arrive to drinks, soft music, and the first look at the room in the evening light.',
    },
    {
      time: '7:00',
      title: 'Dinner begins',
      body: 'Dinner, speeches, and a slower pace that lets the evening feel long, warm, and relaxed.',
    },
    {
      time: '9:00',
      title: 'Toasts and music',
      body: 'The room softens into candlelight with music, dancing, and a gentle end to the night.',
    },
  ];

  protected readonly venueNotes: VenueNote[] = [
    {
      title: 'Travel',
      body: 'Marylebone is a short walk from Bond Street and Baker Street. Add exact arrival notes if needed.',
    },
    {
      title: 'Flowers',
      body: 'The palette leans into soft greens, pale neutrals, and a few blush or apricot accents.',
    },
    {
      title: 'Gifts',
      body: 'If you want a registry, keep it behind one clear link so the page stays calm and uncluttered.',
    },
  ];

  protected readonly heroQuote =
    'Think Minted-style botanical stationery, translated into a mobile-first invitation that feels softer, warmer, and more intentional.';

  protected readonly photoSrc = 'couple-photo.jpeg';
  protected readonly photoAlt = 'A smiling couple standing together by the water in front of a brick building';
  protected readonly rsvpHref = '#rsvp';
  protected readonly mapHref =
    'https://www.google.com/maps/search/?api=1&query=The%20Greenhouses%20Marylebone';
  protected readonly calendarHref = '#details';
}
