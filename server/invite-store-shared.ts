import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';

export type InviteType = 'solo' | 'plus_one';
export type Attending = 'yes' | 'no';

export interface Invite {
  token: string;
  displayName: string;
  inviteType: InviteType;
  plusOneAllowed: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Submission {
  inviteToken: string;
  attending: Attending;
  guestCount: number;
  dietaryRequirements: string;
  plusOneName: string;
  updatedAt: string;
}

export interface InviteWithSubmission {
  invite: Invite;
  submission: Submission | null;
}

export interface DatabaseSnapshot {
  provider: string;
  connectionLabel: string;
  invites: Invite[];
  rsvps: Submission[];
}

export interface SeedInvite {
  token: string;
  displayName: string;
  inviteType: InviteType;
  plusOneAllowed?: boolean;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SeedSubmission {
  inviteToken: string;
  attending: string;
  guestCount: number | string;
  dietaryRequirements?: string;
  plusOneName?: string;
  updatedAt?: string;
}

export interface SeedState {
  invites?: SeedInvite[];
  submissions?: Record<string, SeedSubmission>;
}

export interface NormalizedSeedInvite {
  token: string;
  displayName: string;
  normalizedDisplayName: string;
  inviteType: InviteType;
  plusOneAllowed: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NormalizedSeedSubmission {
  inviteToken: string;
  attending: Attending;
  guestCount: number;
  dietaryRequirements: string;
  plusOneName: string;
  updatedAt: string;
}

export interface InviteRow {
  token: string;
  display_name: string;
  invite_type: string;
  plus_one_allowed: number | boolean;
  active: number | boolean;
  created_at: string | Date;
  updated_at: string | Date;
  normalized_display_name?: string;
}

export interface SubmissionRow {
  invite_token: string;
  attending: string;
  guest_count: number | string;
  dietary_requirements: string;
  plus_one_name: string;
  updated_at: string | Date;
  [key: string]: unknown;
}

export interface InviteSubmissionRow extends InviteRow {
  rsvp_invite_token: string | null;
  rsvp_updated_at: string | Date | null;
  guest_count: number | string;
  dietary_requirements: string;
  plus_one_name: string;
  attending: string;
}

export type DateSerializer = (value: string | Date) => string;

export const fallbackSeedState: SeedState = {
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

export function normalizeDisplayName(displayName: string): string {
  return displayName.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function nowIso(): string {
  return new Date().toISOString();
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function createToken(displayName: string, inviteType: InviteType): string {
  const base = slugify(displayName) || 'guest';
  const suffix = inviteType === 'plus_one' ? 'plus-one' : 'solo';
  return `${base}-${suffix}-${randomUUID().slice(0, 8)}`;
}

export function readSeedState(seedFilePath: string | null | undefined): SeedState {
  if (seedFilePath && existsSync(seedFilePath)) {
    try {
      return JSON.parse(readFileSync(seedFilePath, 'utf8')) as SeedState;
    } catch {
      return structuredClone(fallbackSeedState);
    }
  }

  return structuredClone(fallbackSeedState);
}

export function toIsoString(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function identity(value: string | Date): string | Date {
  return value;
}

export function mapInviteRow(
  row: InviteRow | null | undefined,
  { dateSerializer = identity }: { dateSerializer?: DateSerializer } = {},
): Invite | null {
  if (!row) {
    return null;
  }

  return {
    token: row.token,
    displayName: row.display_name,
    inviteType: row.invite_type as InviteType,
    plusOneAllowed: Boolean(row.plus_one_allowed),
    active: Boolean(row.active),
    createdAt: dateSerializer(row.created_at),
    updatedAt: dateSerializer(row.updated_at),
  };
}

export function mapSubmissionRow(
  row: SubmissionRow | null | undefined,
  {
    updatedAtField = 'updated_at',
    dateSerializer = identity,
  }: { updatedAtField?: string; dateSerializer?: DateSerializer } = {},
): Submission | null {
  if (!row) {
    return null;
  }

  return {
    inviteToken: row.invite_token,
    attending: row.attending as Attending,
    guestCount: Number(row.guest_count),
    dietaryRequirements: row.dietary_requirements,
    plusOneName: row.plus_one_name,
    updatedAt: dateSerializer(row[updatedAtField] as string | Date),
  };
}

export function mapInviteSubmissionRow(
  row: InviteSubmissionRow,
  { dateSerializer = identity }: { dateSerializer?: DateSerializer } = {},
): InviteWithSubmission {
  return {
    invite: mapInviteRow(row, { dateSerializer }) as Invite,
    submission: row?.rsvp_invite_token
      ? {
          inviteToken: row.rsvp_invite_token,
          attending: row.attending as Attending,
          guestCount: Number(row.guest_count),
          dietaryRequirements: row.dietary_requirements,
          plusOneName: row.plus_one_name,
          updatedAt: dateSerializer(row.rsvp_updated_at as string | Date),
        }
      : null,
  };
}

export function normalizeSeedInvite(invite: SeedInvite): NormalizedSeedInvite {
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

export function normalizeSeedSubmission(submission: SeedSubmission): NormalizedSeedSubmission {
  return {
    inviteToken: submission.inviteToken,
    attending: submission.attending === 'no' ? 'no' : 'yes',
    guestCount: Number.isInteger(Number(submission.guestCount))
      ? Number(submission.guestCount)
      : 1,
    dietaryRequirements: submission.dietaryRequirements ?? '',
    plusOneName: submission.plusOneName ?? '',
    updatedAt: submission.updatedAt ?? nowIso(),
  };
}

export function buildSeedEntries(seedState: SeedState): {
  invites: NormalizedSeedInvite[];
  submissions: NormalizedSeedSubmission[];
} {
  return {
    invites: (seedState.invites ?? []).map(normalizeSeedInvite),
    submissions: Object.values(seedState.submissions ?? {}).map(normalizeSeedSubmission),
  };
}
