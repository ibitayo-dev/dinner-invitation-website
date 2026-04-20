import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import type { IInviteRepository } from './create-invite-repository.js';
import type { SeedState } from './invite-store-shared.js';

const baseSeedState: SeedState = {
  invites: [
    {
      token: 'alpha-plus-one',
      displayName: 'Alpha Guest',
      inviteType: 'plus_one',
      plusOneAllowed: true,
      active: true,
      createdAt: '2026-04-18T00:00:00.000Z',
      updatedAt: '2026-04-18T00:00:00.000Z',
    },
  ],
  submissions: {
    'alpha-plus-one': {
      inviteToken: 'alpha-plus-one',
      attending: 'yes',
      guestCount: 2,
      dietaryRequirements: 'Vegetarian',
      plusOneName: 'Taylor',
      updatedAt: '2026-04-18T01:00:00.000Z',
    },
  },
};

const backfillSeedState: SeedState = {
  invites: [
    {
      token: 'shannon-plus-one',
      displayName: 'Shannon',
      inviteType: 'plus_one',
      plusOneAllowed: true,
      active: true,
      createdAt: '2026-04-18T00:00:00.000Z',
      updatedAt: '2026-04-18T00:00:00.000Z',
    },
  ],
  submissions: {
    'shannon-plus-one': {
      inviteToken: 'shannon-plus-one',
      attending: 'yes',
      guestCount: 2,
      dietaryRequirements: 'Vegetarian',
      plusOneName: 'Alex',
      updatedAt: '2026-04-18T01:00:00.000Z',
    },
  },
};

function writeSeedFile(seedFilePath: string, seedState: SeedState): void {
  writeFileSync(seedFilePath, JSON.stringify(seedState, null, 2));
}

function sanitizeLabel(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

async function closeRepository(repository: IInviteRepository): Promise<void> {
  await repository.close?.();
}

interface RepositoryContext {
  repository?: IInviteRepository;
  cleanup?: () => Promise<void>;
  close?: () => Promise<void>;
}

interface CreateRepositoryOptions {
  databasePath: string;
  seedFilePath?: string;
  tempDirectory: string;
  resetState?: boolean;
}

export function registerInviteRepositoryContract(
  label: string,
  createRepository: (options: CreateRepositoryOptions) => Promise<RepositoryContext | IInviteRepository>,
): void {
  const prefix = sanitizeLabel(label);

  test(`${label} repository contract seeds, reads, and writes invite state`, async () => {
    const tempDirectory = mkdtempSync(join(tmpdir(), `${prefix}-invite-repository-`));
    const databasePath = join(tempDirectory, 'wedding.sqlite');
    const seedFilePath = join(tempDirectory, 'seed.json');

    writeSeedFile(seedFilePath, baseSeedState);

    const context = await createRepository({
      databasePath,
      seedFilePath,
      tempDirectory,
      resetState: true,
    });
    const repository = (context as RepositoryContext).repository ?? (context as IInviteRepository);

    try {
      assert.equal(repository.getInviteByToken('alpha-plus-one') instanceof Promise, true);

      const seededInvite = await repository.getInviteByToken('alpha-plus-one');
      assert.equal(seededInvite?.displayName, 'Alpha Guest');
      assert.equal(seededInvite?.plusOneAllowed, true);

      const inviteByName = await repository.getInviteByDisplayName('  alpha   guest ');
      assert.equal(inviteByName?.token, 'alpha-plus-one');

      const seededSubmission = await repository.getRsvpByToken('alpha-plus-one');
      assert.equal(seededSubmission?.plusOneName, 'Taylor');

      const createdInvite = await repository.createInvite({
        displayName: 'Beta Guest',
        inviteType: 'solo',
        active: false,
        token: 'beta-guest-solo',
      });

      assert.equal(createdInvite?.displayName, 'Beta Guest');
      assert.equal(createdInvite?.active, false);
      assert.equal(await repository.getInviteByToken('beta-guest-solo'), null);
      assert.equal(
        (await repository.getInviteByToken('beta-guest-solo', { includeInactive: true }))?.active,
        false,
      );

      const updatedInvite = await repository.updateInvite('beta-guest-solo', {
        active: true,
        displayName: 'Beta Guest Updated',
        inviteType: 'plus_one',
      });

      assert.equal(updatedInvite?.displayName, 'Beta Guest Updated');
      assert.equal(updatedInvite?.plusOneAllowed, true);
      assert.equal(updatedInvite?.active, true);

      const updatedSubmission = await repository.upsertRsvp('alpha-plus-one', {
        attending: 'no',
        guestCount: 1,
        dietaryRequirements: '',
        plusOneName: '',
      });

      assert.equal(updatedSubmission?.attending, 'no');
      assert.equal(updatedSubmission?.guestCount, 1);

      const items = await repository.listInvitesWithSubmissions();
      assert.equal(
        items.some((item) => item.invite.token === 'beta-guest-solo'),
        true,
      );
      assert.equal(
        items.some(
          (item) => item.invite.token === 'alpha-plus-one' && item.submission?.attending === 'no',
        ),
        true,
      );

      const snapshot = await repository.listDatabaseSnapshot();
      assert.equal(snapshot.provider, repository.provider);
      assert.equal(
        snapshot.invites.some((invite) => invite.token === 'beta-guest-solo'),
        true,
      );
      assert.equal(
        snapshot.rsvps.some(
          (submission) =>
            submission.inviteToken === 'alpha-plus-one' && submission.attending === 'no',
        ),
        true,
      );
    } finally {
      await closeRepository(repository);
      await (context as RepositoryContext).cleanup?.();
      rmSync(tempDirectory, { force: true, recursive: true });
    }
  });

  test(`${label} repository contract backfills missing seed submissions`, async () => {
    const tempDirectory = mkdtempSync(join(tmpdir(), `${prefix}-invite-repository-`));
    const databasePath = join(tempDirectory, 'wedding.sqlite');
    const seedFilePath = join(tempDirectory, 'seed.json');

    writeSeedFile(seedFilePath, backfillSeedState);

    const initialContext = await createRepository({
      databasePath,
      tempDirectory,
      resetState: true,
    });
    const initialRepository =
      (initialContext as RepositoryContext).repository ?? (initialContext as IInviteRepository);

    try {
      await closeRepository(initialRepository);

      const reseededContext = await createRepository({
        databasePath,
        seedFilePath,
        tempDirectory,
        resetState: false,
      });
      const reseededRepository =
        (reseededContext as RepositoryContext).repository ?? (reseededContext as IInviteRepository);

      try {
        const seededInvite = await reseededRepository.getInviteByToken('shannon-plus-one');
        assert.equal(seededInvite?.displayName, 'Shannon');

        const seededSubmission = await reseededRepository.getRsvpByToken('shannon-plus-one');
        assert.equal(seededSubmission?.plusOneName, 'Alex');
        assert.equal(seededSubmission?.guestCount, 2);
      } finally {
        await closeRepository(reseededRepository);
        await (reseededContext as RepositoryContext).cleanup?.();
      }
    } finally {
      await (initialContext as RepositoryContext).cleanup?.();
      rmSync(tempDirectory, { force: true, recursive: true });
    }
  });
}
