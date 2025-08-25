'use client';

import { useState } from 'react';
import { MoreVertical, User, Paperclip, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { EditCategoryDialog } from '@/components/edit-category-dialog';
import { EditTaskDialog } from '@/components/edit-task-dialog';
import { cn } from '@/lib/utils';
import type { Task, Category, BoardMember } from '@/lib/types';

interface MergedViewProps {
  categories: Category[];
  tasks: Task[];
  boardMembers: BoardMember[];
  onToggleComplete: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onEditCategory: (categoryId: string, newName: string, newColor: string) => void;
  onDeleteCategory: (categoryId: string) => void;
  onAddTask: (categoryId?: string) => void;
  isReadOnly?: boolean;
}

export function MergedView({ 
  categories, 
  tasks, 
  boardMembers, 
  onToggleComplete, 
  onEditTask, 
  onDeleteTask,
  onEditCategory,
  onDeleteCategory,
  onAddTask,
  isReadOnly = false
}: MergedViewProps) {
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const { toast } = useToast();

  const showPermissionDeniedMessage = () => {
    toast({
      title: "אין הרשאות",
      description: "אין לך הרשאות לעריכה בלוח זה. אתה יכול רק לצפות בתוכן.",
      variant: "destructive",
    });
  };

  const handleOpenEditCategoryDialog = (category: Category) => {
    if (isReadOnly) {
      showPermissionDeniedMessage();
      return;
    }
    setEditingCategory(category);
  };

  const handleCloseEditCategoryDialog = () => {
    setEditingCategory(null);
  };

  const handleSaveCategory = (categoryId: string, newName: string, newColor: string) => {
    onEditCategory(categoryId, newName, newColor);
    setEditingCategory(null);
  };

  const handleOpenEditTaskDialog = (task: Task) => {
    if (isReadOnly) {
      showPermissionDeniedMessage();
      return;
    }
    setEditingTask(task);
  };

  const handleCloseEditTaskDialog = () => {
    setEditingTask(null);
  };

  const handleSaveTask = (updatedTask: Task) => {
    onEditTask(updatedTask);
    setEditingTask(null);
  };

  const handleDeleteTaskWithConfirmation = (taskId: string) => {
    if (isReadOnly) {
      showPermissionDeniedMessage();
      return;
    }
    onDeleteTask(taskId);
  };

  const getMemberByUid = (uid: string | undefined): BoardMember | undefined => {
    if (!uid) return undefined;
    return boardMembers.find(member => member.uid === uid);
  };

  const getCategoryById = (categoryId: string): Category | undefined => {
    return categories.find(cat => cat.id === categoryId);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Category</TableHead>
            <TableHead className="w-[300px]">Task</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Assignee</TableHead>
            <TableHead>Attachment</TableHead>
            <TableHead className="w-[50px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map(task => {
            const category = getCategoryById(task.categoryId);
            const assignee = getMemberByUid(task.assigneeUid);
            
            return (
              <TableRow key={task.id} className="hover:bg-muted/50">
                <TableCell>
                  {category ? (
                    <div className="flex items-center gap-2">
                      <span className={cn('w-3 h-3 rounded-full', category.color)}></span>
                      <span className="font-medium">{category.name}</span>
                      {!isReadOnly && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => handleOpenEditCategoryDialog(category)}>
                              Edit Category
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">No category</span>
                  )}
                </TableCell>
                
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={() => {
                        if (isReadOnly) {
                          showPermissionDeniedMessage();
                          return;
                        }
                        onToggleComplete(task.id);
                      }}
                      disabled={isReadOnly}
                    />
                    <div className="flex-1">
                      <p className={cn(
                        "font-medium",
                        task.completed && "line-through text-muted-foreground"
                      )}>
                        {task.description}
                      </p>
                    </div>
                  </div>
                </TableCell>
                
                <TableCell>
                  <Badge className={cn("text-xs", getPriorityColor(task.priority))}>
                    {task.priority}
                  </Badge>
                </TableCell>
                
                <TableCell>
                  {task.dueDate ? (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{format(new Date(task.dueDate), 'MMM dd, yyyy')}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">No due date</span>
                  )}
                </TableCell>
                
                <TableCell>
                  {assignee ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {assignee.email.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{assignee.email}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span className="text-sm">Unassigned</span>
                    </div>
                  )}
                </TableCell>
                
                <TableCell>
                  {task.fileUrl ? (
                    <div className="flex items-center gap-2">
                      <Paperclip className="h-4 w-4 text-muted-foreground" />
                      <a 
                        href={task.fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline truncate max-w-[100px]"
                      >
                        {task.fileName || 'Attachment'}
                      </a>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
                
                <TableCell>
                  {!isReadOnly ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleOpenEditTaskDialog(task)}>
                          Edit Task
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteTaskWithConfirmation(task.id)}
                          className="text-destructive"
                        >
                          Delete Task
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <span className="text-muted-foreground text-sm">View only</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}

          {/* Empty state */}
          {tasks.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                No tasks found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Edit Category Dialog */}
      {editingCategory && (
        <EditCategoryDialog
          category={editingCategory}
          isOpen={true}
          onClose={handleCloseEditCategoryDialog}
          onSave={handleSaveCategory}
          allCategoryNames={categories.map(c => c.name)}
        />
      )}

      {/* Edit Task Dialog */}
      {editingTask && (
        <EditTaskDialog
          task={editingTask}
          categories={categories}
          boardMembers={boardMembers}
          isOpen={true}
          onClose={handleCloseEditTaskDialog}
          onSave={handleSaveTask}
        />
      )}
    </div>
  );
}
