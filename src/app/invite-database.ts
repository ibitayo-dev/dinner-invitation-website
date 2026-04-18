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

interface WeddingInviteDatabaseOptions {
  apiBaseUrl?: string | null;
  storage?: Storage;
  fetchImpl?: typeof fetch;
}

interface InviteApiResponse {
  invite: InviteRecord | null;
}

interface SubmissionApiResponse {
  submission: RsvpSubmission | null;
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

function normalizeApiBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}

function resolveRuntimeApiBaseUrl(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const runtimeOverride = (window as Window & { __WEDDING_API_BASE_URL__?: string }).__WEDDING_API_BASE_URL__;
  if (runtimeOverride !== undefined) {
    const trimmedOverride = runtimeOverride.trim();
    return trimmedOverride ? normalizeApiBaseUrl(trimmedOverride) : null;
  }

  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3001';
  }

  return null;
}

export class WeddingInviteDatabase {
  private readonly apiBaseUrl: string | null;

  constructor(
    private readonly storage: Storage = getDefaultStorage(),
    options: WeddingInviteDatabaseOptions = {}
  ) {
    this.apiBaseUrl = normalizeOptionalBaseUrl(options.apiBaseUrl ?? resolveRuntimeApiBaseUrl());
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis);
    this.ensureSeedData();
  }

  async resolveInvite(token: string | null | undefined, legacyName: string | null | undefined): Promise<ResolveInviteResult> {
    if (token) {
      const invite = await this.getInviteByToken(token);
      if (invite) {
        return { invite, source: 'token' };
      }

      return {
        invite: null,
        source: 'invalid',
        error: 'This invite link could not be found.',
      };
    }

    const legacyInvite = legacyName ? await this.getInviteByDisplayName(legacyName) : null;
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

  async getInviteByToken(token: string): Promise<InviteRecord | null> {
    const remote = await this.getRemoteInviteByToken(token);
    if (remote !== undefined) {
      return remote;
    }

    return this.getLocalInviteByToken(token);
  }

  async getInviteByDisplayName(displayName: string): Promise<InviteRecord | null> {
    const remote = await this.getRemoteInviteByDisplayName(displayName);
    if (remote !== undefined) {
      return remote;
    }

    return this.getLocalInviteByDisplayName(displayName);
  }

  listInvites(): InviteRecord[] {
    return [...this.readInviteDatabase().invites];
  }

  async getSubmission(token: string): Promise<RsvpSubmission | null> {
    const remote = await this.getRemoteSubmission(token);
    if (remote !== undefined) {
      return remote;
    }

    return this.readSubmissionDatabase().submissions[token] ?? null;
  }

  async saveSubmission(
    token: string,
    submission: Omit<RsvpSubmission, 'inviteToken' | 'updatedAt'>
  ): Promise<RsvpSubmission> {
    const record: RsvpSubmission = {
      inviteToken: token,
      attending: submission.attending,
      guestCount: submission.guestCount,
      dietaryRequirements: submission.dietaryRequirements,
      plusOneName: submission.plusOneName,
      updatedAt: nowIso(),
    };

    if (this.apiBaseUrl) {
      const remote = await this.writeRemoteSubmission(token, record);
      if (remote) {
        return remote;
      }
      console.warn('Wedding backend unavailable, saving RSVP locally.');
    }

    const database = this.readSubmissionDatabase();
    database.submissions[token] = record;
    this.writeJson(SUBMISSIONS_KEY, database);

    return record;
  }

  async createInvite(displayName: string, inviteType: InviteType): Promise<InviteRecord> {
    const invite: InviteRecord = {
      token: this.generateToken(displayName, inviteType),
      displayName,
      inviteType,
      plusOneAllowed: inviteType === 'plus_one',
      active: true,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    if (this.apiBaseUrl) {
      const remote = await this.writeRemoteInvite(invite);
      if (remote) {
        return remote;
      }
      console.warn('Wedding backend unavailable, creating invite locally.');
    }

    const database = this.readInviteDatabase();
    database.invites = [invite, ...database.invites.filter((existing) => existing.token !== invite.token)];
    this.writeJson(INVITES_KEY, database);

    return invite;
  }

  resetToSeedData(): void {
    this.writeJson(INVITES_KEY, { invites: SEED_INVITES });
    this.writeJson(SUBMISSIONS_KEY, { submissions: {} });
  }

  private readonly fetchImpl: typeof fetch;

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

  private getLocalInviteByToken(token: string): InviteRecord | null {
    const database = this.readInviteDatabase();
    return database.invites.find((invite) => invite.token === token) ?? null;
  }

  private getLocalInviteByDisplayName(displayName: string): InviteRecord | null {
    const normalized = this.normalize(displayName);
    const database = this.readInviteDatabase();
    return database.invites.find((invite) => this.normalize(invite.displayName) === normalized) ?? null;
  }

  private async getRemoteInviteByToken(token: string): Promise<InviteRecord | null | undefined> {
    if (!this.apiBaseUrl) {
      return undefined;
    }

    try {
      const payload = await this.fetchJson<InviteApiResponse>(`/api/invites/${encodeURIComponent(token)}`);
      return payload?.invite ?? null;
    } catch (error) {
      console.warn('Wedding backend invite lookup failed, using local storage.', error);
      return undefined;
    }
  }

  private async getRemoteInviteByDisplayName(displayName: string): Promise<InviteRecord | null | undefined> {
    if (!this.apiBaseUrl) {
      return undefined;
    }

    try {
      const payload = await this.fetchJson<InviteApiResponse>(`/api/invites?name=${encodeURIComponent(displayName)}`);
      return payload?.invite ?? null;
    } catch (error) {
      console.warn('Wedding backend invite lookup failed, using local storage.', error);
      return undefined;
    }
  }

  private async getRemoteSubmission(token: string): Promise<RsvpSubmission | null | undefined> {
    if (!this.apiBaseUrl) {
      return undefined;
    }

    try {
      const payload = await this.fetchJson<SubmissionApiResponse>(`/api/rsvps/${encodeURIComponent(token)}`);
      return payload?.submission ?? null;
    } catch (error) {
      console.warn('Wedding backend RSVP lookup failed, using local storage.', error);
      return undefined;
    }
  }

  private async writeRemoteSubmission(
    token: string,
    submission: RsvpSubmission
  ): Promise<RsvpSubmission | null> {
    if (!this.apiBaseUrl) {
      return null;
    }

    try {
      const payload = await this.fetchJson<SubmissionApiResponse>(`/api/rsvps/${encodeURIComponent(token)}`, {
        method: 'PUT',
        body: JSON.stringify(submission),
      });
      return payload?.submission ?? submission;
    } catch (error) {
      console.warn('Wedding backend RSVP save failed, using local storage.', error);
      return null;
    }
  }

  private async writeRemoteInvite(invite: InviteRecord): Promise<InviteRecord | null> {
    if (!this.apiBaseUrl) {
      return null;
    }

    try {
      const payload = await this.fetchJson<{ invite: InviteRecord }>('/api/invites', {
        method: 'POST',
        body: JSON.stringify({
          displayName: invite.displayName,
          inviteType: invite.inviteType,
          token: invite.token,
          active: invite.active,
        }),
      });
      return payload?.invite ?? invite;
    } catch (error) {
      console.warn('Wedding backend invite creation failed, using local storage.', error);
      return null;
    }
  }

  private async fetchJson<T>(path: string, init: RequestInit = {}): Promise<T | null> {
    if (!this.apiBaseUrl) {
      return null;
    }

    const response = await this.fetchImpl(`${this.apiBaseUrl}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
      ...init,
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    return (await response.json()) as T;
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

function normalizeOptionalBaseUrl(baseUrl: string | null | undefined): string | null {
  if (!baseUrl?.trim()) {
    return null;
  }

  return normalizeApiBaseUrl(baseUrl.trim());
}
