import { InviteRepository } from './invite-repository.mjs';
import { PostgresInviteRepository } from './postgres-invite-repository.mjs';

function wrapAsyncInviteRepository(repository) {
  return Object.freeze({
    get provider() {
      return repository.provider;
    },
    get connectionLabel() {
      return repository.connectionLabel;
    },
    async getInviteByToken(...args) {
      return repository.getInviteByToken(...args);
    },
    async getInviteByDisplayName(...args) {
      return repository.getInviteByDisplayName(...args);
    },
    async listInvitesWithSubmissions(...args) {
      return repository.listInvitesWithSubmissions(...args);
    },
    async listDatabaseSnapshot(...args) {
      return repository.listDatabaseSnapshot(...args);
    },
    async createInvite(...args) {
      return repository.createInvite(...args);
    },
    async updateInvite(...args) {
      return repository.updateInvite(...args);
    },
    async getRsvpByToken(...args) {
      return repository.getRsvpByToken(...args);
    },
    async upsertRsvp(...args) {
      return repository.upsertRsvp(...args);
    },
    async close(...args) {
      return repository.close(...args);
    },
  });
}

export async function createInviteRepository({ databasePath, databaseUrl, seedFilePath }) {
  if (databaseUrl) {
    const repository = await new PostgresInviteRepository({
      databaseUrl,
      seedFilePath,
      sqliteMigrationPath: databasePath,
    }).initialize();

    return wrapAsyncInviteRepository(repository);
  }

  return wrapAsyncInviteRepository(new InviteRepository({ databasePath, seedFilePath }));
}
