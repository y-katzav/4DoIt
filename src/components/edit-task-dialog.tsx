'use client';

import type { Task, Category, BoardMember } from '@/lib/types';
import { TaskFormDialog } from './task-form-dialog';

interface EditTaskDialogProps {
  task: Task;
  categories: Category[];
  boardMembers: BoardMember[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
}

export function EditTaskDialog({ task, categories, boardMembers, isOpen, onClose, onSave }: EditTaskDialogProps) {
  const handleSubmit = async (updatedTask: Omit<Task, 'id' | 'completed' | 'boardId'>) => {
    // Merge with existing task data
    const fullTask: Task = {
      ...task,
      ...updatedTask,
    };
    onSave(fullTask);
  };

  return (
    <TaskFormDialog
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      onSubmit={handleSubmit}
      categories={categories}
      boardMembers={boardMembers}
      user={null} // Not needed for edit mode
      mode="edit"
      task={task}
    />
  );
}
