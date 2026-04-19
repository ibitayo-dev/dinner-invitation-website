import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';

export const fallbackSeedState = {
  invites: [
    {
      token: 'shannon-plus-one',
      displayName: 'Shannon',
      inviteType: 'plus_one',
      plusOneAllowed: true,
      active: true,
      createdAt: '2026-04-18T00:00:00.000Z',
      updatedAt: '2026-04-18T00:00:00.000Z',
    },
    {
      token: 'ibitayo-solo',
      displayName: 'Ibitayo',
      inviteType: 'solo',
      plusOneAllowed: false,
      active: true,
      createdAt: '2026-04-18T00:00:00.000Z',
      updatedAt: '2026-04-18T00:00:00.000Z',
    },
  ],
  submissions: {},
};

export function normalizeDisplayName(displayName) {
  return displayName.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function nowIso() {
  return new Date().toISOString();
}

function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function createToken(displayName, inviteType) {
  const base = slugify(displayName) || 'guest';
  const suffix = inviteType === 'plus_one' ? 'plus-one' : 'solo';
  return `${base}-${suffix}-${randomUUID().slice(0, 8)}`;
}

export function readSeedState(seedFilePath) {
  if (seedFilePath && existsSync(seedFilePath)) {
    try {
      return JSON.parse(readFileSync(seedFilePath, 'utf8'));
    } catch {
      return structuredClone(fallbackSeedState);
    }
  }

  return structuredClone(fallbackSeedState);
}

export function toIsoString(value) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function identity(value) {
  return value;
}

export function mapInviteRow(row, { dateSerializer = identity } = {}) {
  if (!row) {
    return null;
  }

  return {
    token: row.token,
    displayName: row.display_name,
    inviteType: row.invite_type,
    plusOneAllowed: Boolean(row.plus_one_allowed),
    active: Boolean(row.active),
    createdAt: dateSerializer(row.created_at),
    updatedAt: dateSerializer(row.updated_at),
  };
}

export function mapSubmissionRow(
  row,
  { updatedAtField = 'updated_at', dateSerializer = identity } = {},
) {
  if (!row) {
    return null;
  }

  return {
    inviteToken: row.invite_token,
    attending: row.attending,
    guestCount: Number(row.guest_count),
    dietaryRequirements: row.dietary_requirements,
    plusOneName: row.plus_one_name,
    updatedAt: dateSerializer(row[updatedAtField]),
  };
}

export function mapInviteSubmissionRow(row, { dateSerializer = identity } = {}) {
  return {
    invite: mapInviteRow(row, { dateSerializer }),
    submission: row?.rsvp_invite_token
      ? {
          inviteToken: row.rsvp_invite_token,
          attending: row.attending,
          guestCount: Number(row.guest_count),
          dietaryRequirements: row.dietary_requirements,
          plusOneName: row.plus_one_name,
          updatedAt: dateSerializer(row.rsvp_updated_at),
        }
      : null,
  };
}

export function normalizeSeedInvite(invite) {
  return {
    token: invite.token,
    displayName: invite.displayName,
    normalizedDisplayName: normalizeDisplayName(invite.displayName),
    inviteType: invite.inviteType,
    plusOneAllowed: Boolean(invite.plusOneAllowed),
    active: invite.active !== false,
    createdAt: invite.createdAt ?? nowIso(),
    updatedAt: invite.updatedAt ?? nowIso(),
  };
}

export function normalizeSeedSubmission(submission) {
  return {
    inviteToken: submission.inviteToken,
    attending: submission.attending === 'no' ? 'no' : 'yes',
    guestCount: Number.isInteger(Number(submission.guestCount)) ? Number(submission.guestCount) : 1,
    dietaryRequirements: submission.dietaryRequirements ?? '',
    plusOneName: submission.plusOneName ?? '',
    updatedAt: submission.updatedAt ?? nowIso(),
  };
}

export function buildSeedEntries(seedState) {
  return {
    invites: (seedState.invites ?? []).map(normalizeSeedInvite),
    submissions: Object.values(seedState.submissions ?? {}).map(normalizeSeedSubmission),
  };
}
