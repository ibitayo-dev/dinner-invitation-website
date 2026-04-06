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

interface NoteItem {
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
    { label: 'Date', value: 'Friday, 27 November 2026' },
    { label: 'Time', value: '12:00 PM' },
    { label: 'Venue', value: 'The Greenhouses, Marylebone' },
    { label: 'Dress code', value: 'Colourful' },
  ];

  protected readonly timeline: TimelineItem[] = [
    {
      time: '6:30 PM',
      title: 'Arrival & welcome drinks',
      body: 'Guests arrive, settle in, and ease into the evening with a first toast.',
    },
    {
      time: '7:15 PM',
      title: 'Dinner is served',
      body: 'A seated meal with a few courses, good conversation, and a calm pace.',
    },
    {
      time: '9:00 PM',
      title: 'Speeches & dessert',
      body: 'A handful of heartfelt words, then something sweet to close the dinner.',
    },
    {
      time: '9:45 PM',
      title: 'Music & mingling',
      body: 'Music, photos, and the easy part of the night where everyone stays a while.',
    },
  ];

  protected readonly notes: NoteItem[] = [
    {
      title: 'RSVP',
      body: 'Link this card to your RSVP form, guest list, or email reply address.',
    },
    {
      title: 'Registry',
      body: 'Swap in gift registry links or remove this section if you want a simpler invite.',
    },
    {
      title: 'Travel',
      body: 'Add nearby hotels, transport notes, or parking guidance for guests coming in from outside London.',
    },
  ];

  protected readonly rsvpHref = '#rsvp';
  protected readonly mapHref =
    'https://www.google.com/maps/search/?api=1&query=The%20Greenhouses%20Marylebone';
  protected readonly registryHref = '#registry';
}
