import { existsSync } from 'node:fs';

import Database from 'better-sqlite3';
import { Pool } from 'pg';

import {
  buildSeedEntries,
  createToken,
  mapInviteRow,
  mapInviteSubmissionRow,
  mapSubmissionRow,
  normalizeDisplayName,
  nowIso,
  readSeedState,
  toIsoString,
} from './invite-store-shared.js';
import type {
  Invite,
  InviteType,
  InviteWithSubmission,
  DatabaseSnapshot,
  Submission,
  SeedState,
  InviteSubmissionRow,
} from './invite-store-shared.js';

interface UpsertRsvpInput {
  attending: string;
  guestCount: number;
  dietaryRequirements?: string;
  plusOneName?: string;
}

interface UpdateInviteInput {
  displayName?: string;
  inviteType?: InviteType;
  active?: boolean;
}

interface CreateInviteInput {
  displayName: string;
  inviteType: InviteType;
  active?: boolean;
  token?: string;
}

interface PostgresInviteRepositoryOptions {
  databaseUrl: string;
  seedFilePath?: string;
  sqliteMigrationPath?: string;
}

function summarizeDatabaseUrl(databaseUrl: string): string {
  try {
    const url = new URL(databaseUrl);
    return `${url.hostname}${url.pathname}`;
  } catch {
    return 'postgres';
  }
}

function readSqliteSnapshot(databasePath: string | undefined): SeedState | null {
  if (!databasePath || !existsSync(databasePath)) {
    return null;
  }

  const database = new Database(databasePath, { fileMustExist: true, readonly: true });

  try {
    const invites = database
      .prepare(
        `
          SELECT
            token,
            display_name AS "displayName",
            invite_type AS "inviteType",
            plus_one_allowed AS "plusOneAllowed",
            active,
            created_at AS "createdAt",
            updated_at AS "updatedAt"
          FROM invites
          ORDER BY active DESC, updated_at DESC, display_name ASC
        `,
      )
      .all() as Array<{
      token: string;
      displayName: string;
      inviteType: InviteType;
      plusOneAllowed: number;
      active: number;
      createdAt: string;
      updatedAt: string;
    }>;
    const submissions = database
      .prepare(
        `
          SELECT
            invite_token AS "inviteToken",
            attending,
            guest_count AS "guestCount",
            dietary_requirements AS "dietaryRequirements",
            plus_one_name AS "plusOneName",
            updated_at AS "updatedAt"
          FROM rsvps
          ORDER BY updated_at DESC, invite_token ASC
        `,
      )
      .all() as Array<{
      inviteToken: string;
      attending: string;
      guestCount: number;
      dietaryRequirements: string;
      plusOneName: string;
      updatedAt: string;
    }>;

    return {
      invites: invites.map((invite) => ({
        ...invite,
        plusOneAllowed: Boolean(invite.plusOneAllowed),
        active: Boolean(invite.active),
      })),
      submissions: Object.fromEntries(
        submissions.map((submission) => [submission.inviteToken, submission]),
      ),
    };
  } finally {
    database.close();
  }
}

export class PostgresInviteRepository {
  readonly provider = 'postgres';
  readonly connectionLabel: string;
  private readonly seedFilePath: string | undefined;
  private readonly sqliteMigrationPath: string | undefined;
  private readonly pool: Pool;

  constructor({ databaseUrl, seedFilePath, sqliteMigrationPath }: PostgresInviteRepositoryOptions) {
    this.connectionLabel = summarizeDatabaseUrl(databaseUrl);
    this.seedFilePath = seedFilePath;
    this.sqliteMigrationPath = sqliteMigrationPath;
    this.pool = new Pool({
      connectionString: databaseUrl,
      ssl:
        databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1')
          ? false
          : { rejectUnauthorized: false },
    });
  }

  async initialize(): Promise<this> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS invites (
        token TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        normalized_display_name TEXT NOT NULL,
        invite_type TEXT NOT NULL CHECK (invite_type IN ('solo', 'plus_one')),
        plus_one_allowed BOOLEAN NOT NULL,
        active BOOLEAN NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      );

      CREATE INDEX IF NOT EXISTS invites_normalized_display_name_idx ON invites(normalized_display_name);
      CREATE INDEX IF NOT EXISTS invites_active_idx ON invites(active);

      CREATE TABLE IF NOT EXISTS rsvps (
        invite_token TEXT PRIMARY KEY REFERENCES invites(token) ON DELETE CASCADE,
        attending TEXT NOT NULL CHECK (attending IN ('yes', 'no')),
        guest_count INTEGER NOT NULL,
        dietary_requirements TEXT NOT NULL DEFAULT '',
        plus_one_name TEXT NOT NULL DEFAULT '',
        updated_at TIMESTAMPTZ NOT NULL
      );
    `);

    await this.seed();
    return this;
  }

  private async seed(): Promise<void> {
    const sourceState =
      readSqliteSnapshot(this.sqliteMigrationPath) ?? readSeedState(this.seedFilePath);
    const { invites, submissions } = buildSeedEntries(sourceState);
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      for (const invite of invites) {
        await client.query(
          `
            INSERT INTO invites (
              token,
              display_name,
              normalized_display_name,
              invite_type,
              plus_one_allowed,
              active,
              created_at,
              updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (token) DO NOTHING
          `,
          [
            invite.token,
            invite.displayName,
            invite.normalizedDisplayName,
            invite.inviteType,
            invite.plusOneAllowed,
            invite.active,
            invite.createdAt,
            invite.updatedAt,
          ],
        );
      }

      for (const submission of submissions) {
        await client.query(
          `
            INSERT INTO rsvps (
              invite_token,
              attending,
              guest_count,
              dietary_requirements,
              plus_one_name,
              updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (invite_token) DO NOTHING
          `,
          [
            submission.inviteToken,
            submission.attending,
            submission.guestCount,
            submission.dietaryRequirements,
            submission.plusOneName,
            submission.updatedAt,
          ],
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getInviteByToken(
    token: string,
    { includeInactive = false } = {},
  ): Promise<Invite | null> {
    const result = await this.pool.query(
      `
        SELECT *
        FROM invites
        WHERE token = $1
          ${includeInactive ? '' : 'AND active = TRUE'}
      `,
      [token],
    );

    return mapInviteRow(result.rows[0] as Parameters<typeof mapInviteRow>[0], {
      dateSerializer: toIsoString,
    });
  }

  async getInviteByDisplayName(displayName: string): Promise<Invite | null> {
    const result = await this.pool.query(
      `
        SELECT *
        FROM invites
        WHERE normalized_display_name = $1
          AND active = TRUE
        ORDER BY updated_at DESC
        LIMIT 1
      `,
      [normalizeDisplayName(displayName)],
    );

    return mapInviteRow(result.rows[0] as Parameters<typeof mapInviteRow>[0], {
      dateSerializer: toIsoString,
    });
  }

  async listInvitesWithSubmissions(): Promise<InviteWithSubmission[]> {
    const result = await this.pool.query(`
      SELECT
        invites.token,
        invites.display_name,
        invites.invite_type,
        invites.plus_one_allowed,
        invites.active,
        invites.created_at,
        invites.updated_at,
        rsvps.invite_token AS rsvp_invite_token,
        rsvps.attending,
        rsvps.guest_count,
        rsvps.dietary_requirements,
        rsvps.plus_one_name,
        rsvps.updated_at AS rsvp_updated_at
      FROM invites
      LEFT JOIN rsvps ON rsvps.invite_token = invites.token
      ORDER BY invites.active DESC, invites.updated_at DESC, invites.display_name ASC
    `);

    return result.rows.map((row) =>
      mapInviteSubmissionRow(row as InviteSubmissionRow, { dateSerializer: toIsoString }),
    );
  }

  async listDatabaseSnapshot(): Promise<DatabaseSnapshot> {
    const [invitesResult, rsvpsResult] = await Promise.all([
      this.pool.query(`
        SELECT *
        FROM invites
        ORDER BY active DESC, updated_at DESC, display_name ASC
      `),
      this.pool.query(`
        SELECT *
        FROM rsvps
        ORDER BY updated_at DESC, invite_token ASC
      `),
    ]);

    return {
      provider: this.provider,
      connectionLabel: this.connectionLabel,
      invites: invitesResult.rows.map(
        (row) =>
          mapInviteRow(row as Parameters<typeof mapInviteRow>[0], {
            dateSerializer: toIsoString,
          }) as Invite,
      ),
      rsvps: rsvpsResult.rows.map(
        (row) =>
          mapSubmissionRow(row as Parameters<typeof mapSubmissionRow>[0], {
            dateSerializer: toIsoString,
          }) as Submission,
      ),
    };
  }

  async createInvite({
    displayName,
    inviteType,
    active = true,
    token,
  }: CreateInviteInput): Promise<Invite | null> {
    const inviteToken = token || createToken(displayName, inviteType);
    const timestamp = nowIso();

    await this.pool.query(
      `
        INSERT INTO invites (
          token,
          display_name,
          normalized_display_name,
          invite_type,
          plus_one_allowed,
          active,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        inviteToken,
        displayName,
        normalizeDisplayName(displayName),
        inviteType,
        inviteType === 'plus_one',
        active,
        timestamp,
        timestamp,
      ],
    );

    return this.getInviteByToken(inviteToken, { includeInactive: true });
  }

  async updateInvite(token: string, updates: UpdateInviteInput): Promise<Invite | null> {
    const existingInvite = await this.getInviteByToken(token, { includeInactive: true });
    if (!existingInvite) {
      return null;
    }

    const displayName = updates.displayName?.trim() || existingInvite.displayName;
    const inviteType = updates.inviteType ?? existingInvite.inviteType;
    const active = updates.active ?? existingInvite.active;

    await this.pool.query(
      `
        UPDATE invites
        SET
          display_name = $1,
          normalized_display_name = $2,
          invite_type = $3,
          plus_one_allowed = $4,
          active = $5,
          updated_at = $6
        WHERE token = $7
      `,
      [
        displayName,
        normalizeDisplayName(displayName),
        inviteType,
        inviteType === 'plus_one',
        active,
        nowIso(),
        token,
      ],
    );

    return this.getInviteByToken(token, { includeInactive: true });
  }

  async getRsvpByToken(token: string): Promise<Submission | null> {
    const result = await this.pool.query(
      `
        SELECT *
        FROM rsvps
        WHERE invite_token = $1
      `,
      [token],
    );

    return mapSubmissionRow(result.rows[0] as Parameters<typeof mapSubmissionRow>[0], {
      dateSerializer: toIsoString,
    });
  }

  async upsertRsvp(token: string, submission: UpsertRsvpInput): Promise<Submission | null> {
    const result = await this.pool.query(
      `
        INSERT INTO rsvps (
          invite_token,
          attending,
          guest_count,
          dietary_requirements,
          plus_one_name,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT(invite_token) DO UPDATE SET
          attending = excluded.attending,
          guest_count = excluded.guest_count,
          dietary_requirements = excluded.dietary_requirements,
          plus_one_name = excluded.plus_one_name,
          updated_at = excluded.updated_at
        RETURNING *
      `,
      [
        token,
        submission.attending === 'no' ? 'no' : 'yes',
        submission.guestCount,
        submission.dietaryRequirements ?? '',
        submission.plusOneName ?? '',
        nowIso(),
      ],
    );

    return mapSubmissionRow(result.rows[0] as Parameters<typeof mapSubmissionRow>[0], {
      dateSerializer: toIsoString,
    });
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
