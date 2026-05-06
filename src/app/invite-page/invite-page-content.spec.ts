import {
  inviteAttireSection,
  invitePageNavigationItems,
  invitePagePhotos,
} from './invite-page-content';

describe('invite-page-content', () => {
  it('defines the expected guest-facing navigation order', () => {
    expect(invitePageNavigationItems.map((item) => item.label)).toEqual([
      'The Details',
      'The Venue',
      'Travel',
      'Attire',
      'RSVP',
    ]);
  });

  it('includes both formal and Nigerian traditional attire tracks and real photo assets', () => {
    expect(inviteAttireSection.tracks.map((track) => track.title)).toEqual([
      'Formal',
      'Nigerian Traditional',
    ]);
    expect(inviteAttireSection.tracks.every((track) => track.looks.length === 2)).toBe(true);
    expect(invitePagePhotos.length).toBe(2);
  });
});