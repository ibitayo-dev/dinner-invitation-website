import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { AdminInviteEntry, InviteType, WeddingInviteDatabase } from '../invite-database';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

@Component({
  selector: 'app-admin-page',
  imports: [ReactiveFormsModule],
  templateUrl: './admin-page.html',
  styleUrl: './admin-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly inviteDatabase = new WeddingInviteDatabase();

  protected readonly adminGuid = signal(this.route.snapshot.paramMap.get('guid') ?? '');
  protected readonly dashboardError = signal('');
  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly inviteItems = signal<AdminInviteEntry[]>([]);
  protected readonly copiedToken = signal<string | null>(null);

  protected readonly createInviteForm = new FormGroup({
    displayName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    inviteType: new FormControl<InviteType>('solo', { nonNullable: true }),
  });

  protected readonly activeInviteCount = computed(() => {
    return this.inviteItems().filter((item) => item.invite.active).length;
  });

  protected readonly responseCount = computed(() => {
    return this.inviteItems().filter((item) => item.submission !== null).length;
  });

  constructor() {
    void this.loadDashboard();
  }

  protected async createInvite(): Promise<void> {
    if (this.createInviteForm.invalid || !this.adminGuid()) {
      this.createInviteForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.dashboardError.set('');

    try {
      const invite = await this.inviteDatabase.createInvite(this.adminGuid(), {
        displayName: this.createInviteForm.controls.displayName.getRawValue().trim(),
        inviteType: this.createInviteForm.controls.inviteType.getRawValue(),
      });

      this.createInviteForm.reset({
        displayName: '',
        inviteType: 'solo',
      });
      this.inviteItems.update((items) => [{ invite, submission: null }, ...items]);
    } catch (error) {
      this.dashboardError.set(getErrorMessage(error));
    } finally {
      this.isSaving.set(false);
    }
  }

  protected async toggleInviteState(entry: AdminInviteEntry): Promise<void> {
    this.dashboardError.set('');

    try {
      const updatedInvite = await this.inviteDatabase.updateInvite(this.adminGuid(), entry.invite.token, {
        active: !entry.invite.active,
      });

      this.inviteItems.update((items) =>
        items.map((item) => (item.invite.token === updatedInvite.token ? { ...item, invite: updatedInvite } : item))
      );
    } catch (error) {
      this.dashboardError.set(getErrorMessage(error));
    }
  }

  protected async copyInviteLink(token: string): Promise<void> {
    const inviteLink = `${window.location.origin}/?token=${encodeURIComponent(token)}`;

    try {
      await navigator.clipboard.writeText(inviteLink);
      this.copiedToken.set(token);
      setTimeout(() => this.copiedToken.set(null), 1800);
    } catch (error) {
      this.dashboardError.set(getErrorMessage(error));
    }
  }

  protected buildInviteLink(token: string): string {
    return `${window.location.origin}/?token=${encodeURIComponent(token)}`;
  }

  protected formatTimestamp(timestamp: string): string {
    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(timestamp));
  }

  private async loadDashboard(): Promise<void> {
    if (!this.adminGuid()) {
      this.dashboardError.set('The admin link is missing a valid GUID.');
      this.isLoading.set(false);
      return;
    }

    try {
      this.inviteItems.set(await this.inviteDatabase.listAdminInvites(this.adminGuid()));
    } catch (error) {
      this.dashboardError.set(getErrorMessage(error));
    } finally {
      this.isLoading.set(false);
    }
  }
}