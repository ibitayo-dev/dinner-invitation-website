import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeGuestCount, normalizePlusOneName } from './wedding-backend.mjs';

test('solo invites always normalize guest count to one attendee', () => {
  assert.equal(normalizeGuestCount(4, false, 'yes'), 1);
  assert.equal(normalizeGuestCount(2, false, 'no'), 1);
});

test('plus-one invites clamp guest count to at most two attendees', () => {
  assert.equal(normalizeGuestCount(1, true, 'yes'), 1);
  assert.equal(normalizeGuestCount(2, true, 'yes'), 2);
  assert.equal(normalizeGuestCount(4, true, 'yes'), 2);
  assert.equal(normalizeGuestCount(2, true, 'no'), 1);
});

test('plus-one names are only kept when a second guest is attending', () => {
  assert.equal(normalizePlusOneName(' Alex ', 2), 'Alex');
  assert.equal(normalizePlusOneName(' Alex ', 1), '');
});