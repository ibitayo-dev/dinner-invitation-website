import { createInviteRepository } from './create-invite-repository.js';
import { registerInviteRepositoryContract } from './invite-repository-contract.js';

registerInviteRepositoryContract('SQLite', async ({ databasePath, seedFilePath }) => ({
  repository: await createInviteRepository({
    databasePath,
    databaseUrl: null,
    seedFilePath: seedFilePath ?? '',
  }),
}));
