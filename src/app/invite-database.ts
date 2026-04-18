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

export interface ResolveInviteResult {
  invite: InviteRecord | null;
  source: 'token' | 'legacy' | 'default' | 'invalid';
  error?: string;
}

export interface AdminInviteEntry {
  invite: InviteRecord;
  submission: RsvpSubmission | null;
}

export interface DatabaseSnapshot {
  provider: 'sqlite' | 'postgres';
  connectionLabel: string;
  invites: InviteRecord[];
  rsvps: RsvpSubmission[];
}

export interface CreateInviteInput {
  displayName: string;
  inviteType: InviteType;
  active?: boolean;
  token?: string;
}

export interface UpdateInviteInput {
  active?: boolean;
  displayName?: string;
  inviteType?: InviteType;
}

interface WeddingInviteDatabaseOptions {
  apiBaseUrl?: string | null;
  fetchImpl?: typeof fetch;
}

interface InviteApiResponse {
  invite: InviteRecord | null;
}

interface SubmissionApiResponse {
  submission: RsvpSubmission | null;
}

interface AdminInviteListResponse {
  items: AdminInviteEntry[];
}

interface DatabaseSnapshotResponse {
  snapshot: DatabaseSnapshot;
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
    return runtimeOverride.trim() ? normalizeApiBaseUrl(runtimeOverride.trim()) : null;
  }

  if (
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
    window.location.port === '4200'
  ) {
    return 'http://localhost:3001';
  }

  return '';
}

function buildRequestUrl(apiBaseUrl: string, path: string): string {
  return apiBaseUrl === '' ? path : `${apiBaseUrl}${path}`;
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error ?? `Request failed with status ${response.status}`;
  } catch {
    return `Request failed with status ${response.status}`;
  }
}

export class WeddingInviteDatabase {
  private readonly apiBaseUrl: string | null;
  private readonly fetchImpl: typeof fetch;

  constructor(options: WeddingInviteDatabaseOptions = {}) {
    this.apiBaseUrl = options.apiBaseUrl !== undefined ? normalizeOptionalBaseUrl(options.apiBaseUrl) : resolveRuntimeApiBaseUrl();
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis);
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
    const payload = await this.fetchJson<InviteApiResponse>(`/api/invites/${encodeURIComponent(token)}`);
    return payload?.invite ?? null;
  }

  async getInviteByDisplayName(displayName: string): Promise<InviteRecord | null> {
    const payload = await this.fetchJson<InviteApiResponse>(`/api/invites?name=${encodeURIComponent(displayName)}`);
    return payload?.invite ?? null;
  }

  async getSubmission(token: string): Promise<RsvpSubmission | null> {
    const payload = await this.fetchJson<SubmissionApiResponse>(`/api/rsvps/${encodeURIComponent(token)}`);
    return payload?.submission ?? null;
  }

  async saveSubmission(
    token: string,
    submission: Omit<RsvpSubmission, 'inviteToken' | 'updatedAt'>
  ): Promise<RsvpSubmission> {
    const payload = await this.fetchJson<SubmissionApiResponse>(`/api/rsvps/${encodeURIComponent(token)}`, {
      method: 'PUT',
      body: JSON.stringify(submission),
    });

    if (!payload?.submission) {
      throw new Error('The backend did not return a saved RSVP.');
    }

    return payload.submission;
  }

  async listAdminInvites(adminGuid: string): Promise<AdminInviteEntry[]> {
    const payload = await this.fetchJson<AdminInviteListResponse>(`/api/admin/${encodeURIComponent(adminGuid)}/invites`);
    return payload?.items ?? [];
  }

  async getDatabaseSnapshot(adminGuid: string): Promise<DatabaseSnapshot | null> {
    const payload = await this.fetchJson<DatabaseSnapshotResponse>(`/api/admin/${encodeURIComponent(adminGuid)}/database`);
    return payload?.snapshot ?? null;
  }

  async createInvite(adminGuid: string, invite: CreateInviteInput): Promise<InviteRecord> {
    const payload = await this.fetchJson<{ invite: InviteRecord }>(`/api/admin/${encodeURIComponent(adminGuid)}/invites`, {
      method: 'POST',
      body: JSON.stringify(invite),
    });

    if (!payload?.invite) {
      throw new Error('The backend did not return a created invite.');
    }

    return payload.invite;
  }

  async updateInvite(adminGuid: string, token: string, updates: UpdateInviteInput): Promise<InviteRecord> {
    const payload = await this.fetchJson<{ invite: InviteRecord }>(
      `/api/admin/${encodeURIComponent(adminGuid)}/invites/${encodeURIComponent(token)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }
    );

    if (!payload?.invite) {
      throw new Error('The backend did not return an updated invite.');
    }

    return payload.invite;
  }

  private async fetchJson<T>(path: string, init: RequestInit = {}): Promise<T | null> {
    if (this.apiBaseUrl === null) {
      return null;
    }

    const response = await this.fetchImpl(buildRequestUrl(this.apiBaseUrl, path), {
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
      throw new Error(await readErrorMessage(response));
    }

    return (await response.json()) as T;
  }
}

function normalizeOptionalBaseUrl(baseUrl: string | null | undefined): string | null {
  if (!baseUrl?.trim()) {
    return null;
  }

  return normalizeApiBaseUrl(baseUrl.trim());
}
