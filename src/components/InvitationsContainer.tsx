// ✅ Updated with typesafety and debug messages
import { useEffect, useState } from 'react';
import { getPendingInvitations, acceptBoardInvitation, declineBoardInvitation } from '@/lib/firestore';
import { useAuth } from './auth-provider';
import { InvitationsPopover } from './invitations-popover';
import type { BoardInvitation } from '@/lib/types';

export function InvitationsContainer() {
  const { user, loading } = useAuth();
  const [invitations, setInvitations] = useState<BoardInvitation[]>([]);
  const [error, setError] = useState<Error | null>(null);

  const fetchInvitations = async () => {
    if (!user?.email) {
      console.log("⛔ No user email, skipping invitation fetch.");
      return;
    }

    console.log("📨 Fetching invitations for:", user.email);

    try {
      const inv = await getPendingInvitations(user.email);
      console.log("✅ Invitations fetched:", inv);
      setInvitations(inv);
    } catch (err) {
      console.error('❌ Error fetching invitations:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    }
  };

  const handleAction = async (
    action: 'accept' | 'decline',
    invitation: BoardInvitation
  ) => {
    console.log(`🛠 Handling invitation action: ${action} for invitation ID: ${invitation.id}`);
    try {
      if (action === 'accept') {
        await acceptBoardInvitation({ invitationId: invitation.id });
        console.log("✅ Invitation accepted:", invitation.id);
      }
      if (action === 'decline') {
        await declineBoardInvitation({ invitationId: invitation.id });
        console.log("✅ Invitation declined:", invitation.id);
      }
      fetchInvitations();
    } catch (err) {
      console.error(`❌ Error handling invitation ${action}:`, err);
    }
  };

  useEffect(() => {
    console.log("🌀 useEffect triggered - loading:", loading, "email:", user?.email);
    if (!loading && user?.email) {
      fetchInvitations();
    }
  }, [loading, user?.email]);

  if (error) {
    return <p className="text-red-500">Permission error: {error.message}</p>;
  }

  return <InvitationsPopover invitations={invitations} onInvitationAction={handleAction} />;
}
