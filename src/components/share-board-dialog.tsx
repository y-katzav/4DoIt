'use client';

import { useState } from 'react';
import type { Board, BoardMember, BoardRole } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './auth-provider';
import { Loader2, Send, Trash2 } from 'lucide-react';
import {
  removeMemberFromBoard,
  updateUserRole,
  shareBoardViaFunction,
} from '@/lib/firestore';
import { Avatar, AvatarFallback } from './ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ShareBoardDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  board: Board;
  members: BoardMember[];
  onBoardUpdate: (board: Board) => void;
  onMemberLeft: (boardId: string) => void;
}

export function ShareBoardDialog({
  isOpen,
  onOpenChange,
  board,
  members,
  onBoardUpdate,
  onMemberLeft,
}: ShareBoardDialogProps) {
  const { user } = useAuth();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<BoardRole>('viewer');
  const [isInviting, setIsInviting] = useState(false);
  const [isUpdatingRole, setIsUpdatingRole] = useState<string | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const { toast } = useToast();

  const handleInvite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inviteEmail || !user?.email) return;

    if (members.some((m) => m.email === inviteEmail)) {
      toast({
        variant: 'destructive',
        title: 'User already a member',
        description:
          'This user has already been invited or is a member of the board.',
      });
      return;
    }

    setIsInviting(true);
    try {
      await shareBoardViaFunction(board.id, inviteEmail, inviteRole);
      setInviteEmail('');
      toast({
        title: 'Invitation Sent',
        description: `An invitation to join as ${inviteRole} has been sent to ${inviteEmail}.`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
      toast({
        variant: 'destructive',
        title: 'Invitation Failed',
        description: errorMessage,
      });
    } finally {
      setIsInviting(false);
    }
  };

  const handleRoleChange = async (memberUid: string, newRole: BoardRole) => {
    setIsUpdatingRole(memberUid);
    try {
      await updateUserRole(board.id, memberUid, newRole);
      onBoardUpdate(board);
      toast({ title: 'Role Updated', description: 'Permissions have been updated.' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: errorMessage,
      });
    } finally {
      setIsUpdatingRole(null);
    }
  };

  const handleRemoveMember = async (memberUid: string) => {
    try {
      await removeMemberFromBoard(board.id, memberUid);
      onBoardUpdate(board);
      toast({
        title: 'Member Removed',
        description: 'The user has been removed from the board.',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
      toast({
        variant: 'destructive',
        title: 'Removal Failed',
        description: errorMessage,
      });
    }
  };

  const handleLeaveBoard = async () => {
    if (!user) return;
    setIsLeaving(true);
    try {
      await removeMemberFromBoard(board.id, user.uid);
      toast({
        title: "You've left the board",
        description: `You have been removed from "${board.name}".`,
      });
      onMemberLeft(board.id);
      onOpenChange(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
      toast({
        variant: 'destructive',
        title: 'Failed to leave board',
        description: errorMessage,
      });
    } finally {
      setIsLeaving(false);
      setShowLeaveConfirm(false);
    }
  };

  const isOwner = board.ownerId === user?.uid;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share &quot;{board.name}&quot;</DialogTitle>
            <DialogDescription>
              Invite others to collaborate on this board.
            </DialogDescription>
          </DialogHeader>

          {isOwner && (
            <form onSubmit={handleInvite} className="space-y-4 py-4">
              <div>
                <Label htmlFor="invite-email" className="mb-2 block">
                  Invite new member
                </Label>
                <div className="flex space-x-2">
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="person@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />
                  <Select
                    value={inviteRole}
                    onValueChange={(value) => setInviteRole(value as BoardRole)}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Select Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isInviting || !inviteEmail}>
                {isInviting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                {isInviting ? 'Sending...' : 'Send Invitation'}
              </Button>
            </form>
          )}

          <div className="space-y-2">
            <Label>Board Members</Label>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {members.map((member) => (
                <div
                  key={member.uid}
                  className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{member.email.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{member.email}</span>
                      {member.uid === user?.uid && (
                        <span className="text-xs text-muted-foreground">You</span>
                      )}
                    </div>
                  </div>

                  {isUpdatingRole === member.uid ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : member.uid === board.ownerId ? (
                    <span className="text-sm text-muted-foreground">Owner</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Select
                        value={member.role}
                        onValueChange={(value) =>
                          handleRoleChange(member.uid, value as BoardRole)
                        }
                        disabled={!isOwner}
                      >
                        <SelectTrigger className="w-[110px] h-8">
                          <SelectValue placeholder="Role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                      {isOwner && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground"
                          onClick={() => handleRemoveMember(member.uid)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="sm:justify-between items-center pt-4">
            {!isOwner && user?.uid && (
              <Button
                variant="destructive"
                onClick={() => setShowLeaveConfirm(true)}
                disabled={isLeaving}
              >
                {isLeaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Leave Board
              </Button>
            )}
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation dialog */}
      <AlertDialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to leave this board?</AlertDialogTitle>
            <AlertDialogDescription>
              You will lose access to this board and its tasks. If you want to rejoin, you’ll need
              to be invited again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveBoard}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Leave Board
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
