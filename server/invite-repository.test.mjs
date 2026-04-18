import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { InviteRepository } from './invite-repository.mjs';

test('InviteRepository seeds from json and supports invite and RSVP updates', () => {
  const tempDirectory = mkdtempSync(join(tmpdir(), 'invite-repository-'));
  const databasePath = join(tempDirectory, 'wedding.sqlite');
  const seedFilePath = join(tempDirectory, 'seed.json');

  writeFileSync(
    seedFilePath,
    JSON.stringify(
      {
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
      },
      null,
      2
    )
  );

  const repository = new InviteRepository({ databasePath, seedFilePath });

  try {
    const seededInvite = repository.getInviteByToken('alpha-plus-one');
    assert.equal(seededInvite?.displayName, 'Alpha Guest');
    assert.equal(seededInvite?.plusOneAllowed, true);

    const seededSubmission = repository.getRsvpByToken('alpha-plus-one');
    assert.equal(seededSubmission?.plusOneName, 'Taylor');

    const createdInvite = repository.createInvite({
      displayName: 'Beta Guest',
      inviteType: 'solo',
    });

    assert.equal(createdInvite?.displayName, 'Beta Guest');
    assert.ok(createdInvite?.token.startsWith('beta-guest-solo-'));

    const updatedInvite = repository.updateInvite(createdInvite.token, { active: false });
    assert.equal(updatedInvite?.active, false);
    assert.equal(repository.getInviteByToken(createdInvite.token), null);
    assert.equal(repository.getInviteByToken(createdInvite.token, { includeInactive: true })?.active, false);

    const updatedSubmission = repository.upsertRsvp('alpha-plus-one', {
      attending: 'no',
      guestCount: 1,
      dietaryRequirements: '',
      plusOneName: '',
    });

    assert.equal(updatedSubmission?.attending, 'no');
    assert.equal(updatedSubmission?.guestCount, 1);
    assert.equal(repository.listInvitesWithSubmissions().length, 2);
  } finally {
    repository.close();
    rmSync(tempDirectory, { force: true, recursive: true });
  }
});