import { existsSync } from 'node:fs';

import Database from 'better-sqlite3';
import { Pool } from 'pg';

import { createToken, normalizeDisplayName, nowIso, readSeedState, toIsoString } from './invite-store-shared.mjs';

function mapInvite(row) {
  if (!row) {
    return null;
  }

  return {
    token: row.token,
    displayName: row.display_name,
    inviteType: row.invite_type,
    plusOneAllowed: Boolean(row.plus_one_allowed),
    active: Boolean(row.active),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

function mapSubmission(row) {
  if (!row) {
    return null;
  }

  return {
    inviteToken: row.invite_token,
    attending: row.attending,
    guestCount: Number(row.guest_count),
    dietaryRequirements: row.dietary_requirements,
    plusOneName: row.plus_one_name,
    updatedAt: toIsoString(row.updated_at),
  };
}

function summarizeDatabaseUrl(databaseUrl) {
  try {
    const url = new URL(databaseUrl);
    return `${url.hostname}${url.pathname}`;
  } catch {
    return 'postgres';
  }
}

function readSqliteSnapshot(databasePath) {
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
        `
      )
      .all();
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
        `
      )
      .all();

    return {
      invites: invites.map((invite) => ({
        ...invite,
        plusOneAllowed: Boolean(invite.plusOneAllowed),
        active: Boolean(invite.active),
      })),
      submissions: Object.fromEntries(submissions.map((submission) => [submission.inviteToken, submission])),
    };
  } finally {
    database.close();
  }
}

export class PostgresInviteRepository {
  constructor({ databaseUrl, seedFilePath, sqliteMigrationPath }) {
    this.provider = 'postgres';
    this.connectionLabel = summarizeDatabaseUrl(databaseUrl);
    this.seedFilePath = seedFilePath;
    this.sqliteMigrationPath = sqliteMigrationPath;
    this.pool = new Pool({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1') ? false : { rejectUnauthorized: false },
    });
  }

  async initialize() {
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

  async seed() {
    const sourceState = readSqliteSnapshot(this.sqliteMigrationPath) ?? readSeedState(this.seedFilePath);
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      for (const invite of sourceState.invites ?? []) {
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
            normalizeDisplayName(invite.displayName),
            invite.inviteType,
            Boolean(invite.plusOneAllowed),
            invite.active !== false,
            invite.createdAt ?? nowIso(),
            invite.updatedAt ?? nowIso(),
          ]
        );
      }

      for (const submission of Object.values(sourceState.submissions ?? {})) {
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
            submission.attending === 'no' ? 'no' : 'yes',
            Number.isInteger(Number(submission.guestCount)) ? Number(submission.guestCount) : 1,
            submission.dietaryRequirements ?? '',
            submission.plusOneName ?? '',
            submission.updatedAt ?? nowIso(),
          ]
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

  async getInviteByToken(token, { includeInactive = false } = {}) {
    const result = await this.pool.query(
      `
        SELECT *
        FROM invites
        WHERE token = $1
          ${includeInactive ? '' : 'AND active = TRUE'}
      `,
      [token]
    );

    return mapInvite(result.rows[0]);
  }

  async getInviteByDisplayName(displayName) {
    const result = await this.pool.query(
      `
        SELECT *
        FROM invites
        WHERE normalized_display_name = $1
          AND active = TRUE
        ORDER BY updated_at DESC
        LIMIT 1
      `,
      [normalizeDisplayName(displayName)]
    );

    return mapInvite(result.rows[0]);
  }

  async listInvitesWithSubmissions() {
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

    return result.rows.map((row) => ({
      invite: mapInvite(row),
      submission: row.rsvp_invite_token
        ? {
            inviteToken: row.rsvp_invite_token,
            attending: row.attending,
            guestCount: Number(row.guest_count),
            dietaryRequirements: row.dietary_requirements,
            plusOneName: row.plus_one_name,
            updatedAt: toIsoString(row.rsvp_updated_at),
          }
        : null,
    }));
  }

  async listDatabaseSnapshot() {
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
      invites: invitesResult.rows.map(mapInvite),
      rsvps: rsvpsResult.rows.map(mapSubmission),
    };
  }

  async createInvite({ displayName, inviteType, active = true, token }) {
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
      ]
    );

    return this.getInviteByToken(inviteToken, { includeInactive: true });
  }

  async updateInvite(token, updates) {
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
      [displayName, normalizeDisplayName(displayName), inviteType, inviteType === 'plus_one', active, nowIso(), token]
    );

    return this.getInviteByToken(token, { includeInactive: true });
  }

  async getRsvpByToken(token) {
    const result = await this.pool.query(
      `
        SELECT *
        FROM rsvps
        WHERE invite_token = $1
      `,
      [token]
    );

    return mapSubmission(result.rows[0]);
  }

  async upsertRsvp(token, submission) {
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
      ]
    );

    return mapSubmission(result.rows[0]);
  }

  async close() {
    await this.pool.end();
  }
}