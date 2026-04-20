import { InviteRepository } from './invite-repository.js';
import { PostgresInviteRepository } from './postgres-invite-repository.js';
import type {
  Invite,
  InviteType,
  InviteWithSubmission,
  DatabaseSnapshot,
  Submission,
} from './invite-store-shared.js';

export interface IInviteRepository {
  readonly provider: string;
  readonly connectionLabel: string;
  getInviteByToken(token: string, options?: { includeInactive?: boolean }): Promise<Invite | null>;
  getInviteByDisplayName(displayName: string): Promise<Invite | null>;
  listInvitesWithSubmissions(): Promise<InviteWithSubmission[]>;
  listDatabaseSnapshot(): Promise<DatabaseSnapshot>;
  createInvite(input: {
    displayName: string;
    inviteType: InviteType;
    active?: boolean;
    token?: string;
  }): Promise<Invite | null>;
  updateInvite(
    token: string,
    updates: { displayName?: string; inviteType?: InviteType; active?: boolean },
  ): Promise<Invite | null>;
  getRsvpByToken(token: string): Promise<Submission | null>;
  upsertRsvp(
    token: string,
    submission: {
      attending: string;
      guestCount: number;
      dietaryRequirements?: string;
      plusOneName?: string;
    },
  ): Promise<Submission | null>;
  close?(): Promise<void> | void;
}

function wrapAsyncInviteRepository(repository: InviteRepository): IInviteRepository {
  return Object.freeze({
    get provider() {
      return repository.provider;
    },
    get connectionLabel() {
      return repository.connectionLabel;
    },
    async getInviteByToken(...args: Parameters<InviteRepository['getInviteByToken']>) {
      return repository.getInviteByToken(...args);
    },
    async getInviteByDisplayName(...args: Parameters<InviteRepository['getInviteByDisplayName']>) {
      return repository.getInviteByDisplayName(...args);
    },
    async listInvitesWithSubmissions(...args: Parameters<InviteRepository['listInvitesWithSubmissions']>) {
      return repository.listInvitesWithSubmissions(...args);
    },
    async listDatabaseSnapshot(...args: Parameters<InviteRepository['listDatabaseSnapshot']>) {
      return repository.listDatabaseSnapshot(...args);
    },
    async createInvite(...args: Parameters<InviteRepository['createInvite']>) {
      return repository.createInvite(...args);
    },
    async updateInvite(...args: Parameters<InviteRepository['updateInvite']>) {
      return repository.updateInvite(...args);
    },
    async getRsvpByToken(...args: Parameters<InviteRepository['getRsvpByToken']>) {
      return repository.getRsvpByToken(...args);
    },
    async upsertRsvp(...args: Parameters<InviteRepository['upsertRsvp']>) {
      return repository.upsertRsvp(...args);
    },
    async close(...args: Parameters<InviteRepository['close']>) {
      return repository.close(...args);
    },
  });
}

export async function createInviteRepository({
  databasePath,
  databaseUrl,
  seedFilePath,
}: {
  databasePath: string;
  databaseUrl: string | null;
  seedFilePath: string;
}): Promise<IInviteRepository> {
  if (databaseUrl) {
    const repository = await new PostgresInviteRepository({
      databaseUrl,
      seedFilePath,
      sqliteMigrationPath: databasePath,
    }).initialize();

    return repository as IInviteRepository;
  }

  const repository = new InviteRepository({ databasePath, seedFilePath });
  return wrapAsyncInviteRepository(repository);
}
