'use client';

import { format } from 'date-fns';
import { Calendar, Flag, Pencil, Trash2, Paperclip } from 'lucide-react';
import type { Task, BoardMember } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Avatar, AvatarFallback } from './ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TaskItemProps {
  task: Task;
  assignee?: BoardMember;
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
  isReadOnly?: boolean;
}

const priorityMap = {
  low: { label: 'Low', variant: 'outline' as const },
  medium: { label: 'Medium', variant: 'secondary' as const },
  high: { label: 'High', variant: 'destructive' as const },
};


export function TaskItem({ task, assignee, onToggleComplete, onDelete, onEdit, isReadOnly = false }: TaskItemProps) {
    const priority = priorityMap[task.priority];
    return (
        <Card className={cn(
            "transition-all group",
            !isReadOnly && "hover:shadow-md",
            task.completed ? "bg-card/60" : "bg-card"
        )}>
            <CardContent className="p-4 flex items-start gap-4">
                <div className="flex-none pt-1">
                    <Checkbox
                        id={`task-${task.id}`}
                        checked={task.completed}
                        onCheckedChange={() => onToggleComplete(task.id)}
                        aria-label={`Mark task as ${task.completed ? 'incomplete' : 'complete'}`}
                        disabled={isReadOnly}
                    />
                </div>
                <div className="flex-grow space-y-2">
                    <label
                        htmlFor={`task-${task.id}`}
                        className={cn(
                            "font-medium leading-snug",
                            !isReadOnly && "cursor-pointer",
                            task.completed && "line-through text-muted-foreground"
                        )}
                    >
                        {task.description}
                    </label>
                    <div className="flex items-center flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                        {task.dueDate && (
                            <div className="flex items-center gap-1.5">
                                <Calendar className="h-4 w-4" />
                                <span>{format(task.dueDate, 'MMM d')}</span>
                            </div>
                        )}
                        <Badge variant={priority.variant} className="capitalize"><Flag className="h-3 w-3 mr-1" />{task.priority}</Badge>
                         {task.fileUrl && (
                            <Link href={task.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:underline text-primary">
                                <Paperclip className="h-4 w-4" />
                                <span>{task.fileName}</span>
                            </Link>
                        )}
                    </div>
                </div>
                 <div className="flex-none flex items-center gap-2">
                    {assignee && (
                      <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger>
                                <Avatar className="h-7 w-7">
                                    <AvatarFallback>{assignee.email.charAt(0).toUpperCase()}</AvatarFallback>
                                </Avatar>
                            </TooltipTrigger>
                            <TooltipContent>
                               <p>{assignee.email}</p>
                            </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    {!isReadOnly && (
                        <div className="flex items-center md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => onEdit(task)}>
                                <Pencil className="h-4 w-4" />
                                <span className="sr-only">Edit task</span>
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => onDelete(task.id)}>
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Delete task</span>
                            </Button>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
