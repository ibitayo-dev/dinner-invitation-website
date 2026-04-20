import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

import Database from 'better-sqlite3';

import {
  buildSeedEntries,
  createToken,
  mapInviteRow,
  mapInviteSubmissionRow,
  mapSubmissionRow,
  normalizeDisplayName,
  nowIso,
  readSeedState,
} from './invite-store-shared.js';
import type {
  Invite,
  InviteType,
  InviteWithSubmission,
  DatabaseSnapshot,
  Submission,
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

export class InviteRepository {
  readonly provider = 'sqlite';
  readonly connectionLabel: string;
  private readonly database: Database.Database;

  constructor({ databasePath, seedFilePath }: { databasePath: string; seedFilePath?: string }) {
    this.connectionLabel = databasePath;
    mkdirSync(dirname(databasePath), { recursive: true });
    this.database = new Database(databasePath);
    this.database.pragma('foreign_keys = ON');
    this.database.pragma('journal_mode = WAL');
    this.migrate();
    this.seed(seedFilePath);
  }

  private migrate(): void {
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

  private seed(seedFilePath?: string): void {
    const { invites, submissions } = buildSeedEntries(readSeedState(seedFilePath));
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
      for (const invite of invites) {
        insertInvite.run(
          invite.token,
          invite.displayName,
          invite.normalizedDisplayName,
          invite.inviteType,
          invite.plusOneAllowed ? 1 : 0,
          invite.active ? 1 : 0,
          invite.createdAt,
          invite.updatedAt,
        );
      }

      for (const submission of submissions) {
        insertRsvp.run(
          submission.inviteToken,
          submission.attending,
          submission.guestCount,
          submission.dietaryRequirements,
          submission.plusOneName,
          submission.updatedAt,
        );
      }
    });

    seedTransaction();
  }

  getInviteByToken(token: string, { includeInactive = false } = {}): Invite | null {
    const row = this.database
      .prepare(
        `
          SELECT *
          FROM invites
          WHERE token = ?
            ${includeInactive ? '' : 'AND active = 1'}
        `,
      )
      .get(token);

    return mapInviteRow(row as Parameters<typeof mapInviteRow>[0]);
  }

  getInviteByDisplayName(displayName: string): Invite | null {
    const row = this.database
      .prepare(
        `
          SELECT *
          FROM invites
          WHERE normalized_display_name = ?
            AND active = 1
          ORDER BY updated_at DESC
          LIMIT 1
        `,
      )
      .get(normalizeDisplayName(displayName));

    return mapInviteRow(row as Parameters<typeof mapInviteRow>[0]);
  }

  listInvitesWithSubmissions(): InviteWithSubmission[] {
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
        `,
      )
      .all();

    return rows.map((row) => mapInviteSubmissionRow(row as InviteSubmissionRow));
  }

  listDatabaseSnapshot(): DatabaseSnapshot {
    const invites = this.database
      .prepare(
        `
          SELECT *
          FROM invites
          ORDER BY active DESC, updated_at DESC, display_name ASC
        `,
      )
      .all()
      .map((row) => mapInviteRow(row as Parameters<typeof mapInviteRow>[0])) as Invite[];
    const rsvps = this.database
      .prepare(
        `
          SELECT *
          FROM rsvps
          ORDER BY updated_at DESC, invite_token ASC
        `,
      )
      .all()
      .map((row) =>
        mapSubmissionRow(row as Parameters<typeof mapSubmissionRow>[0]),
      ) as Submission[];

    return {
      provider: this.provider,
      connectionLabel: this.connectionLabel,
      invites,
      rsvps,
    };
  }

  createInvite({
    displayName,
    inviteType,
    active = true,
    token,
  }: CreateInviteInput): Invite | null {
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
        `,
      )
      .run(
        inviteToken,
        displayName,
        normalizeDisplayName(displayName),
        inviteType,
        inviteType === 'plus_one' ? 1 : 0,
        active ? 1 : 0,
        timestamp,
        timestamp,
      );

    return this.getInviteByToken(inviteToken, { includeInactive: true });
  }

  updateInvite(token: string, updates: UpdateInviteInput): Invite | null {
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
        `,
      )
      .run(
        displayName,
        normalizeDisplayName(displayName),
        inviteType,
        inviteType === 'plus_one' ? 1 : 0,
        active ? 1 : 0,
        nowIso(),
        token,
      );

    return this.getInviteByToken(token, { includeInactive: true });
  }

  getRsvpByToken(token: string): Submission | null {
    return mapSubmissionRow(
      this.database
        .prepare(
          `
            SELECT *
            FROM rsvps
            WHERE invite_token = ?
          `,
        )
        .get(token) as Parameters<typeof mapSubmissionRow>[0],
    );
  }

  upsertRsvp(token: string, submission: UpsertRsvpInput): Submission | null {
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
        `,
      )
      .run(
        token,
        submission.attending === 'no' ? 'no' : 'yes',
        submission.guestCount,
        submission.dietaryRequirements ?? '',
        submission.plusOneName ?? '',
        nowIso(),
      );

    return this.getRsvpByToken(token);
  }

  close(): void {
    this.database.close();
  }
}
