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
  members: { [uid: string]: BoardRole }; // כל המשתמשים כולל הבעלים
  sharedWith: { [uid: string]: BoardRole }; // רק משתמשים שאינם הבעלים (תמיד קיים, יכול להיות ריק)
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
    senderUid: string;
    recipientEmail: string;
    recipientUid?: string; // נוסף לאימות גישה
    role: BoardRole;
    status: InvitationStatus;
    createdAt: Timestamp;
}

// טיפוס חדש לתוצאת אימות גישה
export interface BoardAccess {
  hasAccess: boolean;
  role: BoardRole | null;
  source: 'owner' | 'member' | 'sharedWith' | 'invitation' | 'none';
}

// טיפוס למשתמש (ללא boardMemberships כי זה תת-אוסף)
export interface User {
  id: string;
  email: string;
  displayName?: string;
  createdAt: Timestamp;
}

// טיפוס עבור מסמך בתת-אוסף boardMemberships
export interface BoardMembershipDoc {
  boardId: string;
  boardName: string;
  role: BoardRole;
  joinedAt: Timestamp;
  updatedAt?: Timestamp;
}
