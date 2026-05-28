import { TestBed } from '@angular/core/testing';
import { convertToParamMap, ActivatedRoute } from '@angular/router';

import { AdminInviteEntry, WEDDING_INVITE_DATABASE } from '../invite-database';
import { AdminPageComponent } from './admin-page';

function cloneValue<T>(value: T): T {
  return structuredClone(value);
}

function createAdminGateway() {
  const entries: AdminInviteEntry[] = [
    {
      invite: {
        token: 'alpha-plus-one',
        displayName: 'Alpha Guest',
        inviteType: 'plus_one' as const,
        plusOneAllowed: true,
        active: true,
        createdAt: '2026-04-18T00:00:00.000Z',
        updatedAt: '2026-04-18T00:00:00.000Z',
      },
      submission: null,
    },
  ];

  const gateway = {
    listAdminInvites: vi.fn(async () => cloneValue(entries)),
    getDatabaseSnapshot: vi.fn(async () => ({
      provider: 'sqlite' as const,
      connectionLabel: 'memory://admin-tests',
      invites: entries.map((entry) => cloneValue(entry.invite)),
      rsvps: entries.flatMap((entry) => (entry.submission ? [cloneValue(entry.submission)] : [])),
    })),
    createInvite: vi.fn(
      async (
        _adminGuid: string,
        invite: { displayName: string; inviteType: 'solo' | 'plus_one' },
      ) => {
        const createdInvite = {
          token: `${invite.displayName.toLowerCase().replace(/\s+/g, '-')}-${invite.inviteType}`,
          displayName: invite.displayName,
          inviteType: invite.inviteType,
          plusOneAllowed: invite.inviteType === 'plus_one',
          active: true,
          createdAt: '2026-04-19T00:00:00.000Z',
          updatedAt: '2026-04-19T00:00:00.000Z',
        };

        entries.unshift({ invite: createdInvite, submission: null });
        return cloneValue(createdInvite);
      },
    ),
    updateInvite: vi.fn(
      async (
        _adminGuid: string,
        token: string,
        updates: { active?: boolean; displayName?: string; inviteType?: 'solo' | 'plus_one' },
      ) => {
        const entry = entries.find((item) => item.invite.token === token);
        if (!entry) {
          throw new Error('Invite not found.');
        }

        entry.invite = {
          ...entry.invite,
          active: updates.active ?? entry.invite.active,
          displayName: updates.displayName ?? entry.invite.displayName,
          inviteType: updates.inviteType ?? entry.invite.inviteType,
          plusOneAllowed:
            (updates.inviteType ?? entry.invite.inviteType) === 'plus_one',
          updatedAt: '2026-04-19T01:00:00.000Z',
        };

        return cloneValue(entry.invite);
      },
    ),
  };

  return gateway;
}

async function renderAdminPage(gateway: ReturnType<typeof createAdminGateway>) {
  await TestBed.configureTestingModule({
    imports: [AdminPageComponent],
    providers: [
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            paramMap: convertToParamMap({ guid: 'admin-guid' }),
          },
        },
      },
      {
        provide: WEDDING_INVITE_DATABASE,
        useValue: gateway,
      },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(AdminPageComponent);
  fixture.detectChanges();
  await vi.waitFor(() => {
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain(
      'Loading invite dashboard...',
    );
  });
  return fixture;
}

describe('AdminPageComponent', () => {
  it('renders dashboard data from the injected gateway', async () => {
    const gateway = createAdminGateway();
    const fixture = await renderAdminPage(gateway);
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('Invite management');
    expect(compiled.textContent).toContain('Alpha Guest');
    expect(compiled.textContent).toContain('memory://admin-tests');
    expect(gateway.listAdminInvites).toHaveBeenCalledWith('admin-guid');
    expect(gateway.getDatabaseSnapshot).toHaveBeenCalledWith('admin-guid');
  });

  it('creates invites through the form and updates the rendered list', async () => {
    const gateway = createAdminGateway();
    const fixture = await renderAdminPage(gateway);
    const compiled = fixture.nativeElement as HTMLElement;

    const nameInput = compiled.querySelector(
      'input[formcontrolname="displayName"]',
    ) as HTMLInputElement | null;
    const typeSelect = compiled.querySelector(
      'select[formcontrolname="inviteType"]',
    ) as HTMLSelectElement | null;
    const submitButton = compiled.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement | null;

    expect(nameInput).not.toBeNull();
    expect(typeSelect).not.toBeNull();
    expect(submitButton).not.toBeNull();

    nameInput!.value = 'Gamma Guest';
    nameInput!.dispatchEvent(new Event('input'));
    typeSelect!.value = 'plus_one';
    typeSelect!.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    submitButton!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(compiled.textContent).toContain('Gamma Guest');
    });

    expect(gateway.createInvite).toHaveBeenCalledWith('admin-guid', {
      displayName: 'Gamma Guest',
      inviteType: 'plus_one',
    });
  });

  it('toggles invite state through the rendered action button', async () => {
    const gateway = createAdminGateway();
    const fixture = await renderAdminPage(gateway);
    const compiled = fixture.nativeElement as HTMLElement;

    const toggleButton = Array.from(compiled.querySelectorAll('.invite-card button')).find(
      (button) => button.textContent?.includes('Deactivate'),
    ) as HTMLButtonElement | undefined;
    expect(toggleButton?.textContent).toContain('Deactivate');

    toggleButton?.click();
    await fixture.whenStable();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(compiled.textContent).toContain('Inactive');
    });

    expect(gateway.updateInvite).toHaveBeenCalledWith('admin-guid', 'alpha-plus-one', {
      active: false,
    });
    expect(
      Array.from(compiled.querySelectorAll('.invite-card button')).some((button) =>
        button.textContent?.includes('Reactivate'),
      ),
    ).toBe(true);
  });

  it('edits an invite name and type through the rendered invite card form', async () => {
    const gateway = createAdminGateway();
    const fixture = await renderAdminPage(gateway);
    const compiled = fixture.nativeElement as HTMLElement;

    const editButton = Array.from(compiled.querySelectorAll('.invite-card button')).find((button) =>
      button.textContent?.includes('Edit'),
    ) as HTMLButtonElement | undefined;

    expect(editButton).toBeDefined();

    editButton?.click();
    fixture.detectChanges();

    const editNameInput = compiled.querySelector(
      'input[aria-label="Edit display name"]',
    ) as HTMLInputElement | null;
    const editTypeSelect = compiled.querySelector(
      'select[aria-label="Edit invite type"]',
    ) as HTMLSelectElement | null;
    const saveButton = Array.from(compiled.querySelectorAll('.invite-card button')).find((button) =>
      button.textContent?.includes('Save changes'),
    ) as HTMLButtonElement | undefined;

    expect(editNameInput).not.toBeNull();
    expect(editTypeSelect).not.toBeNull();
    expect(saveButton).toBeDefined();

    editNameInput!.value = 'Alpha Solo';
    editNameInput!.dispatchEvent(new Event('input'));
    editTypeSelect!.value = 'solo';
    editTypeSelect!.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    saveButton?.click();
    await fixture.whenStable();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(compiled.textContent).toContain('Alpha Solo');
      expect(compiled.textContent).toContain('Solo');
    });

    expect(gateway.updateInvite).toHaveBeenCalledWith('admin-guid', 'alpha-plus-one', {
      displayName: 'Alpha Solo',
      inviteType: 'solo',
    });
  });
});
