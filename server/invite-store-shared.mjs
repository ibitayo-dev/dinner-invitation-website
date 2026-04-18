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