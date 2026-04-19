import { Pool } from 'pg';
import test from 'node:test';

import { createInviteRepository } from './create-invite-repository.mjs';
import { registerInviteRepositoryContract } from './invite-repository-contract.mjs';

const testDatabaseUrl = process.env.TEST_DATABASE_URL?.trim() ?? '';

function buildPoolOptions(databaseUrl) {
  return {
    connectionString: databaseUrl,
    ssl:
      databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1')
        ? false
        : { rejectUnauthorized: false },
  };
}

async function resetPostgresState() {
  const pool = new Pool(buildPoolOptions(testDatabaseUrl));

  try {
    await pool.query(`
      DROP TABLE IF EXISTS rsvps;
      DROP TABLE IF EXISTS invites;
    `);
  } finally {
    await pool.end();
  }
}

if (!testDatabaseUrl) {
  test('Postgres repository contract requires TEST_DATABASE_URL', { skip: true }, () => {});
} else {
  registerInviteRepositoryContract(
    'Postgres',
    async ({ databasePath, seedFilePath, resetState }) => {
      if (resetState) {
        await resetPostgresState();
      }

      return {
        repository: await createInviteRepository({
          databasePath,
          databaseUrl: testDatabaseUrl,
          seedFilePath,
        }),
        cleanup: async () => {
          await resetPostgresState();
        },
      };
    },
  );
}
