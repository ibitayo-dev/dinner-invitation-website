function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeBoolean(value: unknown, fallback = true): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function normalizeInviteType(value: unknown): 'solo' | 'plus_one' | null {
  return value === 'plus_one' || value === 'solo' ? value : null;
}

function normalizeGuestCount(
  value: unknown,
  plusOneAllowed: boolean,
  attending: string,
): number {
  const guestCount = Number.parseInt(String(value ?? '1'), 10);
  if (!plusOneAllowed || attending !== 'yes') {
    return 1;
  }

  return Number.isInteger(guestCount) && guestCount > 1 ? 2 : 1;
}

function normalizePlusOneName(value: unknown, guestCount: number): string {
  return guestCount > 1 ? normalizeString(value) : '';
}

export {
  normalizeBoolean,
  normalizeGuestCount,
  normalizeInviteType,
  normalizePlusOneName,
  normalizeString,
};
