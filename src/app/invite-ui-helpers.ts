export function getUiErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

export function buildInviteLink(origin: string, token: string): string {
  return `${origin.replace(/\/+$/, '')}/?token=${encodeURIComponent(token)}`;
}

export function normalizeGuestCountSelection(value: string, canBringPlusOne: boolean): string {
  const guestCount = Number.parseInt(value, 10);
  if (!canBringPlusOne) {
    return '1';
  }

  return Number.isInteger(guestCount) && guestCount > 1 ? '2' : '1';
}
