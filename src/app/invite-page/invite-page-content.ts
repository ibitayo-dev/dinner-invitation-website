export interface InvitePageNavigationItem {
  label: string;
  href: string;
}

export interface InvitePageFact {
  label: string;
  value: string;
}

export interface InvitePageImage {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface InvitePagePhoto extends InvitePageImage {
  accent?: 'portrait' | 'landscape';
}

export interface InvitePageAttireLook {
  label: string;
  description: string;
  image: InvitePageImage;
}

export interface InvitePageAttireTrack {
  title: string;
  intro: string;
  looks: InvitePageAttireLook[];
}

export const invitePageNavigationItems: InvitePageNavigationItem[] = [
  { label: 'The Details', href: '#details' },
  { label: 'The Venue', href: '#venue' },
  { label: 'Travel', href: '#travel' },
  { label: 'Attire', href: '#attire' },
  { label: 'RSVP', href: '#rsvp' },
];

export const invitePageHero = {
  firstName: 'IBITAYO',
  secondName: 'SHANNON',
  eventLabel: 'Post Wedding Dinner',
  metadata: 'Tuesday, 24th November 2026 | The Coal Shed, London',
  location: 'The Coal Shed, One Tower Bridge',
  photo: {
    src: 'hero-portrait.jpeg',
    alt: 'Ibitayo and Shannon smiling together in formalwear by the waterfront',
    width: 900,
    height: 1200,
  },
} as const;

export const invitePageDetailsIntro =
  'After our wedding celebrations, we would love to gather for an intimate evening of dinner, conversation, and a beautiful moment with the people who mean the most to us.';

export const invitePageFacts: InvitePageFact[] = [
  { label: 'Date', value: 'Tuesday, 24th November 2026' },
  { label: 'Time', value: '6:00 PM - 9:00 PM' },
  { label: 'Venue', value: 'The Coal Shed, One Tower Bridge' },
  { label: 'Reply By', value: '31st August 2026' },
];

export const inviteVenueSection = {
  title: 'The Venue',
  description:
    'We will be celebrating at The Coal Shed at One Tower Bridge, a riverside dining room beside Tower Bridge. The Coal Shed specialises in expertly cooked steak and seafood.',
  addressLines: ['The Coal Shed', 'One Tower Bridge', '4 Crown Square', 'London SE1 2SE'],
  eveningLines: ['Welcome drinks from 6:00 PM', 'Dinner and celebration continue until 9:00 PM'],
  mapHref:
    'https://www.google.com/maps/search/?api=1&query=The+Coal+Shed+One+Tower+Bridge+London',
  illustration: {
    src: 'venue.png',
    alt: 'Illustrated venue facade',
    width: 1537,
    height: 1023,
  },
} as const;

export const inviteTravelSection = {
  title: 'Travel',
  lead:
    'London Bridge and Tower Hill are the easiest nearby stations, followed by a short riverside walk into the venue.',
  notes: [
    'If you are travelling across London after work, we recommend allowing a little extra time for evening traffic and station crowds.',
    'For the simplest arrival, open the map link before you set off and head for the One Tower Bridge entrance directly.',
  ],
  illustration: {
    src: 'train.png',
    alt: 'Illustrated train carriage',
    width: 1271,
    height: 832,
  },
} as const;

export const invitePagePhotos: InvitePagePhoto[] = [
  {
    src: 'couple-photo.jpeg',
    alt: 'Ibitayo and Shannon smiling together by the waterfront in colour',
    width: 1200,
    height: 1600,
    accent: 'portrait',
  },
  {
    src: 'IMG_4539.png',
    alt: 'Ibitayo and Shannon laughing together in formalwear by the waterfront',
    width: 3023,
    height: 3023,
    accent: 'landscape',
  },
];

export const inviteAttireSection = {
  title: 'Guest Attire',
  intro:
    'We would love the evening to feel dressed, joyful, and celebratory. Please choose the direction that feels most like you, whether that is polished formalwear or Nigerian traditional dress.',
  flourish: {
    src: 'flowers.png',
    alt: 'Illustrated floral arrangement',
    width: 1195,
    height: 896,
  },
  tracks: [
    {
      title: 'Formal',
      intro: 'Black tie optional, with elegant evening dressing encouraged.',
      looks: [
        {
          label: 'Ladies',
          description:
            'Floor-length gowns, cocktail dresses and other elegant eveningwear are great.',
          image: {
            src: 'formal_female.png',
            alt: 'Illustration of a formal evening gown',
            width: 1448,
            height: 1086,
          },
        },
        {
          label: 'Gentlemen',
          description:
            'Tuxedos, suits, dress shirts, and other elegant eveningwear are perfect.',
          image: {
            src: 'formal_male.png',
            alt: 'Illustration of a formal suit',
            width: 1448,
            height: 1086,
          },
        },
      ],
    },
    {
      title: 'Nigerian Traditional',
      intro: 'Traditional dress is equally welcomed and celebrated throughout the evening.',
      looks: [
        {
          label: 'Ladies',
          description:
            'Any celebratory Nigerian looks will feel at home here.',
          image: {
            src: 'traditional_female.png',
            alt: 'Illustration of Nigerian traditional womenswear',
            width: 1195,
            height: 896,
          },
        },
        {
          label: 'Gentlemen',
          description:
            'Any celebratory Nigerian looks will feel at home here.',
          image: {
            src: 'traditional-male.png',
            alt: 'Illustration of Nigerian traditional menswear',
            width: 1448,
            height: 1086,
          },
        },
      ],
    },
  ] satisfies InvitePageAttireTrack[],
} as const;

export const inviteRsvpSection = {
  title: 'RSVP',
  lead: 'Kindly reply by 31st August 2026 and share your meal choices.',
  sidesMessage:
    'You do not need to choose a side. Every main comes with all shared sides for the table: Beef Fat Chips, Mixed Salad Leaves, and Tenderstem Broccoli.',
  updateDisclaimer:
    'You can change your order any time by reopening this invite link, or by contacting a member of the wedding party.',
  editMessage: 'If you have already replied, you may review and update your response below.',
  submitLabel: 'Send Reply',
  openLabel: 'Reply',
  cancelLabel: 'Cancel',
} as const;

export const inviteCalendarLinkLabel = 'Add to calendar';
export const inviteMapLinkLabel = 'Open map';