'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import type { Board } from '@/lib/types';
import { boardIcons } from '@/lib/constants';
import { DynamicIcon } from './dynamic-icon';
import { ChevronsUpDown, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
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


const formSchema = z.object({
  name: z.string().min(2, 'Board name must be at least 2 characters.'),
  icon: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditBoardDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onEditBoard: (boardId: string, newName: string, newIcon: string) => Promise<void>;
  onDeleteBoard: (boardId: string) => Promise<void>;
  board: Board;
}

export function EditBoardDialog({ isOpen, onOpenChange, onEditBoard, onDeleteBoard, board }: EditBoardDialogProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: board.name,
      icon: board.icon,
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        name: board.name,
        icon: board.icon,
      });
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }, [isOpen, board, form]);

  const onSubmit = async (values: FormValues) => {
    await onEditBoard(board.id, values.name, values.icon);
    onOpenChange(false);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDeleteBoard(board.id);
    setIsDeleting(false);
    setShowDeleteConfirm(false);
    onOpenChange(false);
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit board</DialogTitle>
            <DialogDescription>
              Change the name and icon for your board.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Board Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Work Projects" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                  control={form.control}
                  name="icon"
                  render={({ field }) => (
                      <FormItem className="flex flex-col">
                          <FormLabel>Icon</FormLabel>
                          <Popover>
                              <PopoverTrigger asChild>
                                  <FormControl>
                                      <Button
                                          variant="outline"
                                          role="combobox"
                                          className={cn("w-full justify-between")}
                                      >
                                          <div className='flex items-center gap-2'>
                                              <DynamicIcon name={field.value} />
                                              <span>{field.value}</span>
                                          </div>
                                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                      </Button>
                                  </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-[375px] p-2">
                                  <div className="grid grid-cols-6 gap-2">
                                  {boardIcons.map((icon) => (
                                      <Button
                                      key={icon}
                                      variant="outline"
                                      className="h-10 w-10 p-0 flex items-center justify-center"
                                      onClick={(e) => {
                                          e.preventDefault();
                                          field.onChange(icon);
                                      }}
                                      >
                                          <DynamicIcon name={icon} />
                                      </Button>
                                  ))}
                                  </div>
                              </PopoverContent>
                          </Popover>
                          <FormMessage />
                      </FormItem>
                  )}
              />
              <DialogFooter className='!justify-between'>
                <Button 
                    type="button" 
                    variant="destructive" 
                    className='mr-auto'
                    onClick={() => setShowDeleteConfirm(true)}
                >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Board
                </Button>
                <div className='flex gap-2'>
                    <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the board
              <span className='font-bold'> &quot;{board.name}&quot; </span> 
              and all of its associated data, including categories and tasks.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isDeleting ? 'Deleting...' : 'Delete Board'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
