import { Component } from '@angular/core';

interface Detail {
  label: string;
  value: string;
}

interface MoodItem {
  title: string;
  body: string;
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

interface Swatch {
  label: string;
  value: string;
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

  protected readonly moods: MoodItem[] = [
    {
      title: 'Glasshouse glow',
      body: 'Soft highlights, warm cream surfaces, and deep green shadows make the page feel like dusk in a greenhouse.',
    },
    {
      title: 'Botanical layering',
      body: 'Leaves, florals, and brass-like accents are handled with restraint so the page feels rich rather than busy.',
    },
    {
      title: 'Romantic structure',
      body: 'The layout stays modern and airy, but the composition carries enough drama to feel like an event.',
    },
    {
      title: 'Invitation pacing',
      body: 'Hero, detail band, and supporting cards guide guests through the experience without feeling formal or stiff.',
    },
  ];

  protected readonly timeline: TimelineItem[] = [
    {
      time: '12:00',
      title: 'Arrival under the glass',
      body: 'Guests arrive into a bright, leafy room with time to settle in before dinner begins.',
    },
    {
      time: '12:30',
      title: 'Dinner is served',
      body: 'The table takes centre stage with flowers, layered glassware, and a calm, celebratory rhythm.',
    },
    {
      time: '14:00',
      title: 'Toasts and speeches',
      body: 'The room shifts into something warmer and more intimate as the speeches begin.',
    },
    {
      time: '15:00',
      title: 'Afternoon ease',
      body: 'Coffee, conversation, and that last golden stretch of the day close the invitation beautifully.',
    },
  ];

  protected readonly notes: NoteItem[] = [
    {
      title: 'Arrival',
      body: 'Keep the opening simple so guests can find the room quickly and settle in without fuss.',
    },
    {
      title: 'Flowers',
      body: 'This design works best when the floral palette is echoed in the actual table styling too.',
    },
    {
      title: 'Dress code',
      body: 'Colourful works well here; it keeps the page feeling joyful rather than overly formal.',
    },
  ];

  protected readonly swatches: Swatch[] = [
    { label: 'Moss', value: '#4f6a55' },
    { label: 'Cream', value: '#f7f0e7' },
    { label: 'Rose', value: '#c88c79' },
    { label: 'Brass', value: '#b99657' },
  ];

  protected readonly photoSrc = 'couple-photo.jpeg';
  protected readonly photoAlt = 'A smiling couple standing together by the water in front of a brick building';
  protected readonly mapHref =
    'https://www.google.com/maps/search/?api=1&query=The%20Greenhouses%20Marylebone';
}
