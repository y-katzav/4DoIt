'use client';

import { useState, Fragment } from 'react';
import { ChevronDown, ChevronRight, Calendar, User, Paperclip, MoreVertical, PlusCircle } from 'lucide-react';
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

interface TableViewProps {
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

export function TableView({ 
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
}: TableViewProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
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

  const handleDeleteCategoryWithConfirmation = (categoryId: string) => {
    if (isReadOnly) {
      showPermissionDeniedMessage();
      return;
    }
    onDeleteCategory(categoryId);
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const getTasksByCategory = (categoryId: string) => {
    return tasks.filter(task => task.categoryId === categoryId);
  };

  const getMemberByUid = (uid?: string) => {
    if (!uid) return null;
    return boardMembers.find(member => member.uid === uid);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
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
            <TableHead className="w-[300px]">Task</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Assignee</TableHead>
            <TableHead>Attachment</TableHead>
            <TableHead className="w-[50px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map(category => {
            const categoryTasks = getTasksByCategory(category.id);
            const isExpanded = expandedCategories.has(category.id);
            
            return (
              <Fragment key={category.id}>
                {/* Category Header Row */}
                <TableRow className="bg-muted/50 hover:bg-muted">
                  <TableCell colSpan={6}>
                    <div className="flex items-center justify-between">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleCategory(category.id)}
                        className="flex items-center gap-2 p-0 h-auto font-medium"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <span className={cn('w-3 h-3 rounded-full', category.color)}></span>
                        <span>{category.name}</span>
                        <Badge variant="secondary" className="ml-2">
                          {categoryTasks.length}
                        </Badge>
                      </Button>
                      
                      <div className="flex items-center gap-2">
                        {!isReadOnly && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddTask(category.id);
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <PlusCircle className="h-4 w-4 text-muted-foreground" />
                            <span className="sr-only">Add task to category</span>
                          </Button>
                        )}
                        {!isReadOnly && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => handleOpenEditCategoryDialog(category)}>
                                Edit Category
                              </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteCategoryWithConfirmation(category.id)}
                              className="text-destructive"
                            >
                              Delete Category
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        )}
                      </div>
                    </div>
                  </TableCell>
                </TableRow>

                {/* Tasks Rows */}
                {isExpanded && categoryTasks.map(task => {
                  const assignee = getMemberByUid(task.assigneeUid);
                  
                  return (
                    <TableRow key={task.id} className="border-l-4 border-l-transparent hover:border-l-primary/50">
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

                {/* Empty state for category */}
                {isExpanded && categoryTasks.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No tasks in this category
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}

          {/* Empty state for no categories */}
          {categories.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                No categories found
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
