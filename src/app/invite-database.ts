export type InviteType = 'solo' | 'plus_one';

export interface InviteRecord {
  token: string;
  displayName: string;
  inviteType: InviteType;
  plusOneAllowed: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RsvpSubmission {
  inviteToken: string;
  attending: 'yes' | 'no';
  guestCount: number;
  dietaryRequirements: string;
  plusOneName: string;
  updatedAt: string;
}

interface StoredInviteDatabase {
  invites: InviteRecord[];
}

interface StoredSubmissionDatabase {
  submissions: Record<string, RsvpSubmission>;
}

const INVITES_KEY = 'dinner-invitation.invites.v1';
const SUBMISSIONS_KEY = 'dinner-invitation.submissions.v1';

const SEED_INVITES: InviteRecord[] = [
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
];

export interface ResolveInviteResult {
  invite: InviteRecord | null;
  source: 'token' | 'legacy' | 'default' | 'invalid';
  error?: string;
}

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();

  return {
    get length(): number {
      return store.size;
    },
    clear(): void {
      store.clear();
    },
    getItem(key: string): string | null {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number): string | null {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string): void {
      store.delete(key);
    },
    setItem(key: string, value: string): void {
      store.set(key, value);
    },
  } as Storage;
}

function getDefaultStorage(): Storage {
  return typeof window !== 'undefined' && window.localStorage ? window.localStorage : createMemoryStorage();
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function nowIso(): string {
  return new Date().toISOString();
}

export class WeddingInviteDatabase {
  constructor(private readonly storage: Storage = getDefaultStorage()) {
    this.ensureSeedData();
  }

  resolveInvite(token: string | null | undefined, legacyName: string | null | undefined): ResolveInviteResult {
    if (token) {
      const invite = this.getInviteByToken(token);
      if (invite) {
        return { invite, source: 'token' };
      }

      return {
        invite: null,
        source: 'invalid',
        error: 'This invite link could not be found.',
      };
    }

    const legacyInvite = legacyName ? this.getInviteByDisplayName(legacyName) : null;
    if (legacyInvite) {
      return { invite: legacyInvite, source: 'legacy' };
    }

    return {
      invite: {
        token: 'guest',
        displayName: legacyName?.trim() || 'friend',
        inviteType: 'solo',
        plusOneAllowed: false,
        active: true,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      },
      source: 'default',
    };
  }

  getInviteByToken(token: string): InviteRecord | null {
    const database = this.readInviteDatabase();
    return database.invites.find((invite) => invite.token === token) ?? null;
  }

  getInviteByDisplayName(displayName: string): InviteRecord | null {
    const normalized = this.normalize(displayName);
    const database = this.readInviteDatabase();
    return database.invites.find((invite) => this.normalize(invite.displayName) === normalized) ?? null;
  }

  listInvites(): InviteRecord[] {
    return [...this.readInviteDatabase().invites];
  }

  getSubmission(token: string): RsvpSubmission | null {
    return this.readSubmissionDatabase().submissions[token] ?? null;
  }

  saveSubmission(
    token: string,
    submission: Omit<RsvpSubmission, 'inviteToken' | 'updatedAt'>
  ): RsvpSubmission {
    const database = this.readSubmissionDatabase();
    const record: RsvpSubmission = {
      inviteToken: token,
      attending: submission.attending,
      guestCount: submission.guestCount,
      dietaryRequirements: submission.dietaryRequirements,
      plusOneName: submission.plusOneName,
      updatedAt: nowIso(),
    };

    database.submissions[token] = record;
    this.writeJson(SUBMISSIONS_KEY, database);

    return record;
  }

  createInvite(displayName: string, inviteType: InviteType): InviteRecord {
    const token = this.generateToken(displayName, inviteType);
    const timestamp = nowIso();
    const invite: InviteRecord = {
      token,
      displayName,
      inviteType,
      plusOneAllowed: inviteType === 'plus_one',
      active: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const database = this.readInviteDatabase();
    database.invites = [invite, ...database.invites.filter((existing) => existing.token !== invite.token)];
    this.writeJson(INVITES_KEY, database);

    return invite;
  }

  resetToSeedData(): void {
    this.writeJson(INVITES_KEY, { invites: SEED_INVITES });
    this.writeJson(SUBMISSIONS_KEY, { submissions: {} });
  }

  private ensureSeedData(): void {
    if (!this.storage.getItem(INVITES_KEY)) {
      this.writeJson(INVITES_KEY, { invites: SEED_INVITES });
    }

    if (!this.storage.getItem(SUBMISSIONS_KEY)) {
      this.writeJson(SUBMISSIONS_KEY, { submissions: {} });
    }
  }

  private generateToken(displayName: string, inviteType: InviteType): string {
    const base = slugify(displayName) || 'guest';
    const suffix = inviteType === 'plus_one' ? 'plus-one' : 'solo';
    const randomPart = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);

    return `${base}-${suffix}-${randomPart}`;
  }

  private normalize(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private readInviteDatabase(): StoredInviteDatabase {
    return this.readJson(INVITES_KEY, { invites: SEED_INVITES });
  }

  private readSubmissionDatabase(): StoredSubmissionDatabase {
    return this.readJson(SUBMISSIONS_KEY, { submissions: {} });
  }

  private readJson<T>(key: string, fallback: T): T {
    const raw = this.storage.getItem(key);
    if (!raw) {
      return fallback;
    }

    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  private writeJson(key: string, value: unknown): void {
    this.storage.setItem(key, JSON.stringify(value));
  }
}
