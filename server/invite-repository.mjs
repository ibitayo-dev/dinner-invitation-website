import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

import Database from 'better-sqlite3';

import { createToken, normalizeDisplayName, nowIso, readSeedState } from './invite-store-shared.mjs';

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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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
    updatedAt: row.updated_at,
  };
}

export class InviteRepository {
  constructor({ databasePath, seedFilePath }) {
    this.provider = 'sqlite';
    this.connectionLabel = databasePath;
    mkdirSync(dirname(databasePath), { recursive: true });
    this.database = new Database(databasePath);
    this.database.pragma('foreign_keys = ON');
    this.database.pragma('journal_mode = WAL');
    this.migrate();
    this.seed(seedFilePath);
  }

  migrate() {
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS invites (
        token TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        normalized_display_name TEXT NOT NULL,
        invite_type TEXT NOT NULL CHECK (invite_type IN ('solo', 'plus_one')),
        plus_one_allowed INTEGER NOT NULL CHECK (plus_one_allowed IN (0, 1)),
        active INTEGER NOT NULL CHECK (active IN (0, 1)),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS invites_normalized_display_name_idx ON invites(normalized_display_name);
      CREATE INDEX IF NOT EXISTS invites_active_idx ON invites(active);

      CREATE TABLE IF NOT EXISTS rsvps (
        invite_token TEXT PRIMARY KEY,
        attending TEXT NOT NULL CHECK (attending IN ('yes', 'no')),
        guest_count INTEGER NOT NULL,
        dietary_requirements TEXT NOT NULL DEFAULT '',
        plus_one_name TEXT NOT NULL DEFAULT '',
        updated_at TEXT NOT NULL,
        FOREIGN KEY(invite_token) REFERENCES invites(token) ON DELETE CASCADE
      );
    `);
  }

  seed(seedFilePath) {
    const seedState = readSeedState(seedFilePath);
    const insertInvite = this.database.prepare(`
      INSERT OR IGNORE INTO invites (
        token,
        display_name,
        normalized_display_name,
        invite_type,
        plus_one_allowed,
        active,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertRsvp = this.database.prepare(`
      INSERT OR IGNORE INTO rsvps (
        invite_token,
        attending,
        guest_count,
        dietary_requirements,
        plus_one_name,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    const seedTransaction = this.database.transaction(() => {
      for (const invite of seedState.invites ?? []) {
        insertInvite.run(
          invite.token,
          invite.displayName,
          normalizeDisplayName(invite.displayName),
          invite.inviteType,
          invite.plusOneAllowed ? 1 : 0,
          invite.active === false ? 0 : 1,
          invite.createdAt ?? nowIso(),
          invite.updatedAt ?? nowIso()
        );
      }

      for (const submission of Object.values(seedState.submissions ?? {})) {
        insertRsvp.run(
          submission.inviteToken,
          submission.attending === 'no' ? 'no' : 'yes',
          Number.isInteger(Number(submission.guestCount)) ? Number(submission.guestCount) : 1,
          submission.dietaryRequirements ?? '',
          submission.plusOneName ?? '',
          submission.updatedAt ?? nowIso()
        );
      }
    });

    seedTransaction();
  }

  getInviteByToken(token, { includeInactive = false } = {}) {
    const row = this.database
      .prepare(
        `
          SELECT *
          FROM invites
          WHERE token = ?
            ${includeInactive ? '' : 'AND active = 1'}
        `
      )
      .get(token);

    return mapInvite(row);
  }

  getInviteByDisplayName(displayName) {
    const row = this.database
      .prepare(
        `
          SELECT *
          FROM invites
          WHERE normalized_display_name = ?
            AND active = 1
          ORDER BY updated_at DESC
          LIMIT 1
        `
      )
      .get(normalizeDisplayName(displayName));

    return mapInvite(row);
  }

  listInvitesWithSubmissions() {
    const rows = this.database
      .prepare(
        `
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
        `
      )
      .all();

    return rows.map((row) => ({
      invite: mapInvite(row),
      submission: row.rsvp_invite_token
        ? {
            inviteToken: row.rsvp_invite_token,
            attending: row.attending,
            guestCount: Number(row.guest_count),
            dietaryRequirements: row.dietary_requirements,
            plusOneName: row.plus_one_name,
            updatedAt: row.rsvp_updated_at,
          }
        : null,
    }));
  }

  listDatabaseSnapshot() {
    const invites = this.database
      .prepare(
        `
          SELECT *
          FROM invites
          ORDER BY active DESC, updated_at DESC, display_name ASC
        `
      )
      .all()
      .map(mapInvite);
    const rsvps = this.database
      .prepare(
        `
          SELECT *
          FROM rsvps
          ORDER BY updated_at DESC, invite_token ASC
        `
      )
      .all()
      .map(mapSubmission);

    return {
      provider: this.provider,
      connectionLabel: this.connectionLabel,
      invites,
      rsvps,
    };
  }

  createInvite({ displayName, inviteType, active = true, token }) {
    const inviteToken = token || createToken(displayName, inviteType);
    const timestamp = nowIso();

    this.database
      .prepare(
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
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        inviteToken,
        displayName,
        normalizeDisplayName(displayName),
        inviteType,
        inviteType === 'plus_one' ? 1 : 0,
        active ? 1 : 0,
        timestamp,
        timestamp
      );

    return this.getInviteByToken(inviteToken, { includeInactive: true });
  }

  updateInvite(token, updates) {
    const existingInvite = this.getInviteByToken(token, { includeInactive: true });
    if (!existingInvite) {
      return null;
    }

    const displayName = updates.displayName?.trim() || existingInvite.displayName;
    const inviteType = updates.inviteType ?? existingInvite.inviteType;
    const active = updates.active ?? existingInvite.active;

    this.database
      .prepare(
        `
          UPDATE invites
          SET
            display_name = ?,
            normalized_display_name = ?,
            invite_type = ?,
            plus_one_allowed = ?,
            active = ?,
            updated_at = ?
          WHERE token = ?
        `
      )
      .run(
        displayName,
        normalizeDisplayName(displayName),
        inviteType,
        inviteType === 'plus_one' ? 1 : 0,
        active ? 1 : 0,
        nowIso(),
        token
      );

    return this.getInviteByToken(token, { includeInactive: true });
  }

  getRsvpByToken(token) {
    return mapSubmission(
      this.database
        .prepare(
          `
            SELECT *
            FROM rsvps
            WHERE invite_token = ?
          `
        )
        .get(token)
    );
  }

  upsertRsvp(token, submission) {
    this.database
      .prepare(
        `
          INSERT INTO rsvps (
            invite_token,
            attending,
            guest_count,
            dietary_requirements,
            plus_one_name,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(invite_token) DO UPDATE SET
            attending = excluded.attending,
            guest_count = excluded.guest_count,
            dietary_requirements = excluded.dietary_requirements,
            plus_one_name = excluded.plus_one_name,
            updated_at = excluded.updated_at
        `
      )
      .run(
        token,
        submission.attending === 'no' ? 'no' : 'yes',
        submission.guestCount,
        submission.dietaryRequirements ?? '',
        submission.plusOneName ?? '',
        nowIso()
      );

    return this.getRsvpByToken(token);
  }

  close() {
    this.database.close();
  }
}