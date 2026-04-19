import {
  buildInviteLink,
  getUiErrorMessage,
  normalizeGuestCountSelection,
} from './invite-ui-helpers';

describe('invite-ui-helpers', () => {
  it('returns the original error message when possible', () => {
    expect(getUiErrorMessage(new Error('Broken request'))).toBe('Broken request');
    expect(getUiErrorMessage('unknown')).toBe('Something went wrong. Please try again.');
  });

  it('builds encoded invite links from an origin and token', () => {
    expect(buildInviteLink('https://example.com/', 'guest token')).toBe(
      'https://example.com/?token=guest%20token',
    );
  });

  it('normalizes guest count selection to supported values', () => {
    expect(normalizeGuestCountSelection('4', true)).toBe('2');
    expect(normalizeGuestCountSelection('2', false)).toBe('1');
  });
});
