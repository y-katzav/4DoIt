'use client';

import type { User } from 'firebase/auth';
import type { Category, BoardMember } from '@/lib/types';
import { TaskFormDialog } from './task-form-dialog';

export const availableColors = [
    'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500', 
    'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500', 
    'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500', 
    'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500', 
    'bg-rose-500', 'bg-slate-500'
];

interface AddTaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (task: any, newCategory?: any) => Promise<void>;
  categories: Category[];
  boardMembers: BoardMember[];
  user: User | null;
  defaultCategoryId?: string;
}

export function AddTaskDialog({ 
  isOpen, 
  onClose, 
  onSubmit, 
  categories, 
  boardMembers, 
  user, 
  defaultCategoryId 
}: AddTaskDialogProps) {
  return (
    <TaskFormDialog
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      onSubmit={onSubmit}
      categories={categories}
      boardMembers={boardMembers}
      user={user}
      mode="add"
      defaultCategoryId={defaultCategoryId}
    />
  );
}
