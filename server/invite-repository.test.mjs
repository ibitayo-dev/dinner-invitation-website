import { createInviteRepository } from './create-invite-repository.mjs';
import { registerInviteRepositoryContract } from './invite-repository-contract.mjs';

registerInviteRepositoryContract('SQLite', async ({ databasePath, seedFilePath }) => ({
  repository: await createInviteRepository({
    databasePath,
    databaseUrl: null,
    seedFilePath,
  }),
}));
