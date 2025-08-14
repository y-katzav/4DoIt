import { Timestamp } from 'firebase/firestore';

export type Priority = 'low' | 'medium' | 'high';

export type BoardRole = 'owner' | 'editor' | 'viewer';

export interface BoardMember {
  uid: string;
  email: string; // Store email for display purposes
  role: BoardRole;
}

export interface Board {
  id: string;
  name: string;
  icon: string;
  createdAt: Timestamp;
  ownerId: string;
  members: { [uid: string]: 'owner' | 'editor' | 'viewer' }; // הוסף שורה זו
}

export interface SharedBoard {
    id: string;
    name: string;
    icon: string;
    role: BoardRole;
    ownerEmail: string;
}

export interface Category {
  id: string;
  name: string;
  color: string; // Tailwind CSS color class e.g., 'bg-blue-500'
}

export interface Task {
  id: string;
  description: string;
  dueDate: Date | null;
  priority: Priority;
  categoryId: string;
  boardId: string;
  completed: boolean;
  fileUrl?: string;
  fileName?: string;
  assigneeUid?: string;
}

export type InvitationStatus = 'pending' | 'accepted' | 'declined';

export interface BoardInvitation {
    id: string;
    boardId: string;
    boardName: string;
    senderEmail: string;
    recipientEmail: string;
    role: BoardRole;
    status: InvitationStatus;
    createdAt: Timestamp;
}
