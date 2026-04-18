import { InviteRepository } from './invite-repository.mjs';
import { PostgresInviteRepository } from './postgres-invite-repository.mjs';

export async function createInviteRepository({ databasePath, databaseUrl, seedFilePath }) {
  if (databaseUrl) {
    return new PostgresInviteRepository({
      databaseUrl,
      seedFilePath,
      sqliteMigrationPath: databasePath,
    }).initialize();
  }

  return new InviteRepository({ databasePath, seedFilePath });
}