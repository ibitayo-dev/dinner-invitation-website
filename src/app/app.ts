import { Component } from '@angular/core';

interface Detail {
  label: string;
  value: string;
}

interface NoteItem {
  title: string;
  body: string;
}

interface HighlightItem {
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

  protected readonly highlights: HighlightItem[] = [
    {
      title: 'Photo-led layout',
      body: 'The couple photo becomes the anchor of the page instead of a generic hero block.',
    },
    {
      title: 'Daytime energy',
      body: 'Copy and layout shift toward a bright midday celebration with a lighter pacing and feel.',
    },
    {
      title: 'Editorial composition',
      body: 'A magazine-like spread with a framed photo, stacked cards, and stronger contrast.',
    },
    {
      title: 'Simple RSVP path',
      body: 'The reply flow stays obvious and easy to swap for a form, email, or message link.',
    },
  ];

  protected readonly notes: NoteItem[] = [
    {
      title: 'Venue',
      body: 'Keep the venue card linked to directions so guests can open the new location quickly.',
    },
    {
      title: 'Reply',
      body: 'Replace the placeholder with your preferred RSVP form, email address, or WhatsApp link.',
    },
    {
      title: 'Extras',
      body: 'Add registry links, transport notes, or a short note about the colour dress code.',
    },
  ];

  protected readonly photoSrc = 'couple-photo.jpeg';
  protected readonly photoAlt = 'A smiling couple standing together by the water in front of a brick building';
  protected readonly rsvpHref = '#rsvp';
  protected readonly mapHref =
    'https://www.google.com/maps/search/?api=1&query=The%20Greenhouses%20Marylebone';
}
