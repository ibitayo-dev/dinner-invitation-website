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
    { label: 'Dress', value: 'Garden party evening wear' },
    { label: 'RSVP by', value: '1 October 2026' },
  ];

  protected readonly timeline: TimelineItem[] = [
    {
      time: '6:00',
      title: 'Arrive under the glass',
      body: 'Guests are welcomed with drinks, foliage-filled tables, and a first look at the room in the evening light.',
    },
    {
      time: '7:00',
      title: 'Dinner begins',
      body: 'A slower, warmer pace with good food, speeches, and the kind of conversation that stretches out naturally.',
    },
    {
      time: '9:00',
      title: 'Toasts and music',
      body: 'The room softens into candlelight, with music, dancing, and a relaxed end to the night.',
    },
  ];

  protected readonly venueNotes: VenueNote[] = [
    {
      title: 'Travel',
      body: 'Marylebone is a short walk from Bond Street and Baker Street. Add your exact arrival notes here if needed.',
    },
    {
      title: 'Flowers',
      body: 'The greenhouse idea works best with loose seasonal florals, soft greens, and a few peach or blush accents.',
    },
    {
      title: 'Gifts',
      body: 'If you want a registry, place it behind one clear link so the page still feels calm and uncluttered.',
    },
  ];

  protected readonly heroQuote =
    'We wanted the dinner to feel like stepping into a warm conservatory at dusk: light, green, and quietly celebratory.';

  protected readonly photoSrc = 'couple-photo.jpeg';
  protected readonly photoAlt = 'A smiling couple standing together by the water in front of a brick building';
  protected readonly rsvpHref = '#rsvp';
  protected readonly mapHref =
    'https://www.google.com/maps/search/?api=1&query=The%20Greenhouses%20Marylebone';
  protected readonly calendarHref = '#details';
}
