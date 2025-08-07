
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Bell, Check, Loader2, Mail, X } from 'lucide-react';
import type { BoardInvitation } from '@/lib/types';

interface InvitationsPopoverProps {
  invitations: BoardInvitation[];
  onInvitationAction: (action: 'accept' | 'decline', invitation: BoardInvitation) => void;
}

export function InvitationsPopover({ invitations, onInvitationAction }: InvitationsPopoverProps) {
  const [handlingInvitation, setHandlingInvitation] = useState<string | null>(null);

  const handleAction = async (action: 'accept' | 'decline', invitation: BoardInvitation) => {
    setHandlingInvitation(invitation.id);
    await onInvitationAction(action, invitation);
    setHandlingInvitation(null);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {invitations.length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
              {invitations.length}
            </span>
          )}
          <span className="sr-only">View invitations</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Invitations</h4>
            <p className="text-sm text-muted-foreground">
              You have {invitations.length} pending invitation{invitations.length === 1 ? '' : 's'}.
            </p>
          </div>
          <div className="grid gap-2">
            {invitations.length > 0 ? (
              invitations.map(invitation => (
                <div key={invitation.id} className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-md border p-2">
                  <div>
                    <p className="text-sm font-medium">
                      Join <span className="font-bold">{invitation.boardName}</span>
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      From: {invitation.senderEmail}
                    </p>
                  </div>
                  {handlingInvitation === invitation.id ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <div className="flex items-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-green-600 hover:text-green-600 hover:bg-green-100"
                        onClick={() => handleAction('accept', invitation)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-600 hover:text-red-600 hover:bg-red-100"
                        onClick={() => handleAction('decline', invitation)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-center text-muted-foreground py-4">No new invitations.</p>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
