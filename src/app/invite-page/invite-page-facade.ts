import { Injectable, inject } from '@angular/core';

import {
  InviteRecord,
  ResolveInviteResult,
  RsvpSubmission,
  WEDDING_INVITE_DATABASE,
} from '../invite-database';

interface InvitePageRuntimeContext {
  locationSearch?: string;
  inviteToken?: string;
  inviteeName?: string;
}

export interface InvitePageLoadState {
  invite: InviteRecord | null;
  inviteeName: string;
  inviteSource: ResolveInviteResult['source'];
  inviteError: string;
  savedSubmission: RsvpSubmission | null;
}

export interface InvitePageSubmissionInput {
  attending: 'yes' | 'no';
  dietaryRequirements: string;
  guestCount: number;
  plusOneName: string;
}

@Injectable({ providedIn: 'root' })
export class InvitePageFacade {
  private readonly inviteDatabase = inject(WEDDING_INVITE_DATABASE);

  async load(
    context: InvitePageRuntimeContext = this.readRuntimeContext(),
  ): Promise<InvitePageLoadState> {
    const params = new URLSearchParams(context.locationSearch ?? '');
    const token = params.get('token')?.trim() || context.inviteToken?.trim() || null;
    const inviteeName = params.get('name')?.trim() || context.inviteeName?.trim() || null;
    const resolvedInvite = await this.inviteDatabase.resolveInvite(token, inviteeName);
    const invite = resolvedInvite.invite;

    return {
      invite,
      inviteeName: invite?.displayName ?? inviteeName ?? 'friend',
      inviteSource: resolvedInvite.source,
      inviteError:
        resolvedInvite.source === 'invalid'
          ? (resolvedInvite.error ?? 'This invite link could not be found.')
          : '',
      savedSubmission:
        resolvedInvite.source === 'token' && invite
          ? await this.inviteDatabase.getSubmission(invite.token)
          : null,
    };
  }

  async save(
    invite: InviteRecord | null,
    submission: InvitePageSubmissionInput,
  ): Promise<RsvpSubmission> {
    if (!invite) {
      throw new Error('Open a valid invite link to save an RSVP.');
    }

    return this.inviteDatabase.saveSubmission(invite.token, {
      attending: submission.attending,
      dietaryRequirements: submission.dietaryRequirements.trim(),
      guestCount: submission.guestCount,
      plusOneName: submission.plusOneName.trim(),
    });
  }

  private readRuntimeContext(): InvitePageRuntimeContext {
    if (typeof window === 'undefined') {
      return {};
    }

    const runtime = window as Window & {
      __WEDDING_INVITE_TOKEN__?: string;
      __WEDDING_INVITEE_NAME__?: string;
    };

    return {
      locationSearch: window.location.search,
      inviteToken: runtime.__WEDDING_INVITE_TOKEN__,
      inviteeName: runtime.__WEDDING_INVITEE_NAME__,
    };
  }
}
