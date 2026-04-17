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
      title: 'Welcome drinks',
      body: 'Join us from 6:00 PM for a relaxed welcome drink before everyone sits down for dinner.',
    },
    {
      title: 'Dinner and toasts',
      body: 'We will share dinner together under the glasshouse followed by speeches and a joyful toast.',
    },
    {
      title: 'Music and celebration',
      body: 'After dinner, stay with us for music, conversation, and a warm evening with family and friends.',
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
      body: 'The Greenhouses in Marylebone is a short walk from Bond Street and Baker Street stations.',
    },
    {
      title: 'Dietary needs',
      body: 'Please share any dietary requirements when you RSVP so we can plan the menu with care.',
    },
    {
      title: 'Gifts',
      body: 'Your presence is the best gift, but if you would like registry details, we will gladly share them.',
    },
  ];

  protected readonly heroQuote =
    'We would love for you to join us for an evening of dinner, music, and celebration at The Greenhouses in Marylebone.';

  protected readonly photoSrc = 'couple-photo.jpeg';
  protected readonly photoAlt = 'A smiling couple standing together by the water in front of a brick building';
  protected readonly rsvpHref = '#rsvp';
  protected readonly mapHref =
    'https://www.google.com/maps/search/?api=1&query=The%20Greenhouses%20Marylebone';
  protected readonly calendarHref = '#details';
}
