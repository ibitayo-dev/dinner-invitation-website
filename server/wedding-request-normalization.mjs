function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeBoolean(value, fallback = true) {
  return typeof value === 'boolean' ? value : fallback;
}

function normalizeInviteType(value) {
  return value === 'plus_one' || value === 'solo' ? value : null;
}

function normalizeGuestCount(value, plusOneAllowed, attending) {
  const guestCount = Number.parseInt(String(value ?? '1'), 10);
  if (!plusOneAllowed || attending !== 'yes') {
    return 1;
  }

  return Number.isInteger(guestCount) && guestCount > 1 ? 2 : 1;
}

function normalizePlusOneName(value, guestCount) {
  return guestCount > 1 ? normalizeString(value) : '';
}

export {
  normalizeBoolean,
  normalizeGuestCount,
  normalizeInviteType,
  normalizePlusOneName,
  normalizeString,
};
