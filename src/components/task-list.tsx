'use client';

import { useMemo, useState } from 'react';
import type { Task, Category, BoardMember, Priority } from '@/lib/types';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
import { TaskItem } from '@/components/task-item';
import { Inbox, Pencil, Trash2, PlusCircle, Lock, Filter, User as UserIcon, Flag, X, Calendar as CalendarIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import Image from 'next/image';
import { Button } from './ui/button';
import { EditCategoryDialog } from './edit-category-dialog';
import { EditTaskDialog } from './edit-task-dialog';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from './ui/card';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { format, isSameDay } from 'date-fns';


interface TaskListProps {
  tasks: Task[];
  categories: Category[];
  boardMembers: BoardMember[];
  onToggleComplete: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onEditTask: (task: Task) => void;
  onEditCategory: (categoryId: string, newName: string, newColor: string) => void;
  onDeleteCategory: (category: string) => void;
  onAddTask: (categoryId: string) => void;
  isReadOnly?: boolean;
}

export function TaskList({ 
  tasks, 
  categories,
  boardMembers,
  onToggleComplete, 
  onDeleteTask, 
  onEditTask,
  onEditCategory,
  onDeleteCategory,
  onAddTask,
  isReadOnly = false,
}: TaskListProps) {
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
        const priorityMatch = priorityFilter === 'all' || task.priority === priorityFilter;
        const assigneeMatch = assigneeFilter === 'all' || task.assigneeUid === assigneeFilter;
        const dateMatch = !dateFilter || (task.dueDate && isSameDay(task.dueDate, dateFilter));
        return priorityMatch && assigneeMatch && dateMatch;
    });
  }, [tasks, priorityFilter, assigneeFilter, dateFilter]);
  

  const categoriesById = useMemo(() => {
    return categories.reduce((acc, cat) => {
      acc[cat.id] = cat;
      return acc;
    }, {} as Record<string, Category>);
  }, [categories]);

  const membersByUid = useMemo(() => {
    return boardMembers.reduce((acc, member) => {
      acc[member.uid] = member;
      return acc;
    }, {} as Record<string, BoardMember>);
  }, [boardMembers]);


  const uncategorizedId = 'uncategorized';

  const groupedTasks = useMemo(() => {
    return filteredTasks.reduce((acc, task) => {
      const categoryId = task.categoryId || uncategorizedId;
      if (!acc[categoryId]) {
        acc[categoryId] = [];
      }
      acc[categoryId].push(task);
      return acc;
    }, {} as Record<string, Task[]>);
  }, [filteredTasks]);

  const categoryIds = Object.keys(groupedTasks).sort((a,b) => {
      if(a === uncategorizedId) return 1;
      if(b === uncategorizedId) return -1;
      return (categoriesById[a]?.name || '').localeCompare(categoriesById[b]?.name || '')
  });
  
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  
  const handleOpenEditDialog = (category: Category) => {
      setEditingCategory(category);
  };

  const handleCloseEditDialog = () => {
    setEditingCategory(null);
  };
  
  const handleSaveCategory = (categoryId: string, newName: string, newColor: string) => {
    onEditCategory(categoryId, newName, newColor);
    setEditingCategory(null);
  };

  const handleOpenDeleteDialog = (category: Category) => {
      setDeletingCategory(category);
  };

  const handleCloseDeleteDialog = () => {
    setDeletingCategory(null);
  };

  const handleConfirmDelete = () => {
    if (deletingCategory) {
      onDeleteCategory(deletingCategory.id);
      setDeletingCategory(null);
    }
  };

  const handleEditTask = (task: Task) => {
    onEditTask(task);
    setEditingTask(null);
  }

  const handleAddTaskClick = (e: React.MouseEvent, categoryId: string) => {
    e.stopPropagation();
    onAddTask(categoryId);
  }

  const resetFilters = () => {
    setPriorityFilter('all');
    setAssigneeFilter('all');
    setDateFilter(undefined);
  }

  const isAnyFilterActive = priorityFilter !== 'all' || assigneeFilter !== 'all' || !!dateFilter;


  if (totalTasks === 0 && !isAnyFilterActive) {
    return (
      <div className="text-center py-16 px-4">
        <Image src="https://placehold.co/400x300.png" data-ai-hint="empty list" alt="An empty list illustration" width={400} height={300} className="mx-auto mb-6 rounded-lg shadow-sm" />
        <h2 className="text-2xl font-semibold font-headline mb-2">
            {isReadOnly ? "This board is empty" : "Your Task List is Empty"}
        </h2>
        {!isReadOnly && <p className="text-muted-foreground">Click &quot;Add Task&quot; to get started and organize your day.</p>}
        {isReadOnly && <p className="text-muted-foreground">The owner of this board has not added any tasks yet.</p>}
      </div>
    );
  }

  return (
    <div className='space-y-6'>
       {isReadOnly && (
        <div className='flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800/40 dark:text-yellow-300'>
            <Lock className='h-5 w-5' />
            <p className='text-sm font-medium'>You are in view-only mode. You cannot make any changes.</p>
        </div>
      )}
      <div className="bg-card p-4 rounded-lg shadow-sm">
        <div className='flex justify-between items-center mb-2'>
            <h3 className="text-lg font-semibold font-headline">Progress</h3>
            <p className='text-sm text-muted-foreground'>{completedTasks} of {totalTasks} completed</p>
        </div>
        <Progress value={progress} className="w-full h-2" />
      </div>

       <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Filter className="h-4 w-4" />
            <span>Filters:</span>
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap items-center gap-2 w-full sm:w-auto">
            <Select value={priorityFilter} onValueChange={(value) => setPriorityFilter(value as Priority | 'all')}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <Flag className="h-4 w-4 text-muted-foreground" />
                    <span>All Priorities</span>
                  </div>
                </SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-muted-foreground" />
                    <span>All Members</span>
                  </div>
                </SelectItem>
                {boardMembers.map(member => (
                  <SelectItem key={member.uid} value={member.uid}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback>{member.email.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span>{member.email}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={'outline'}
                  className={cn(
                    'w-full sm:w-[240px] justify-start text-left font-normal',
                    !dateFilter && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFilter ? format(dateFilter, 'PPP') : <span>Filter by due date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dateFilter}
                  onSelect={setDateFilter}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
             {isAnyFilterActive && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <X className="h-4 w-4 mr-2" />
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>


      <Accordion type="multiple" defaultValue={categoryIds} className="w-full space-y-4">
        {categoryIds.length > 0 ? categoryIds.map((categoryId) => {
          const category = categoryId === uncategorizedId ? {id: uncategorizedId, name: 'Uncategorized', color: 'bg-gray-400'} : categoriesById[categoryId];
          if (!category) return null;

          const categoryTasks = groupedTasks[categoryId];
          const completedInCategory = categoryTasks.filter(t => t.completed).length;
          
          const sortedTasks = [...categoryTasks].sort((a, b) => {
              if (a.completed !== b.completed) {
                  return a.completed ? 1 : -1;
              }
              return 0;
          });

          return (
            <AccordionItem value={categoryId} key={categoryId} className="border-none">
                <div className="bg-card rounded-lg shadow-sm group">
                  <div className="flex items-center pr-2">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline rounded-t-lg data-[state=open]:border-b flex-grow">
                        <div className="flex items-center gap-3">
                            {categoryId === uncategorizedId ? <Inbox className="h-5 w-5 text-muted-foreground" /> : <span className={cn('w-4 h-4 rounded-full', category.color)}></span>}
                            <span className="font-semibold text-foreground">{category.name}</span>
                            <Badge variant="secondary">{completedInCategory} / {categoryTasks.length}</Badge>
                        </div>
                    </AccordionTrigger>
                    {!isReadOnly && (
                      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        {categoryId !== uncategorizedId && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 rounded-full"
                              onClick={(e) => handleAddTaskClick(e, categoryId)}
                            >
                              <PlusCircle className="h-4 w-4 text-muted-foreground" />
                              <span className="sr-only">Add task to category</span>
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 rounded-full"
                              onClick={() => handleOpenEditDialog(category)}
                            >
                              <Pencil className="h-4 w-4 text-muted-foreground" />
                              <span className="sr-only">Edit category name</span>
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 rounded-full"
                              onClick={() => handleOpenDeleteDialog(category)}
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                              <span className="sr-only">Delete category</span>
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                    <AccordionContent className="p-4 pt-2">
                        <div className="space-y-3">
                        {sortedTasks.map((task) => (
                            <TaskItem
                                key={task.id}
                                task={task}
                                assignee={task.assigneeUid ? membersByUid[task.assigneeUid] : undefined}
                                onToggleComplete={onToggleComplete}
                                onDelete={onDeleteTask}
                                onEdit={() => setEditingTask(task)}
                                isReadOnly={isReadOnly}
                            />
                        ))}
                        </div>
                    </AccordionContent>
                </div>
            </AccordionItem>
          );
        }) : (
            <div className="text-center py-16 px-4">
                <h2 className="text-2xl font-semibold font-headline mb-2">No Tasks Found</h2>
                <p className="text-muted-foreground">No tasks match the current filters. Try clearing them to see all tasks.</p>
            </div>
        )}
      </Accordion>
      
      {!isReadOnly && editingCategory && (
        <EditCategoryDialog
          isOpen={!!editingCategory}
          onClose={handleCloseEditDialog}
          onSave={handleSaveCategory}
          category={editingCategory}
          allCategoryNames={categories.map(c => c.name)}
        />
      )}

      {!isReadOnly && editingTask && (
        <EditTaskDialog
            isOpen={!!editingTask}
            onClose={() => setEditingTask(null)}
            onSave={handleEditTask}
            task={editingTask}
            categories={categories}
            boardMembers={boardMembers}
        />
      )}

      <AlertDialog open={!!deletingCategory} onOpenChange={(open) => !open && handleCloseDeleteDialog()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the 
              <span className='font-bold'> &quot;{deletingCategory?.name}&quot; </span> 
              category and all tasks within it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCloseDeleteDialog}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
