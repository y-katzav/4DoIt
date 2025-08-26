'use client';

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
import { useToast } from '@/hooks/use-toast';
import type { Board } from '@/lib/types';
import { boardIcons } from '@/lib/constants';

const formSchema = z.object({
  name: z.string().min(2, 'Board name must be at least 2 characters.'),
});

type FormValues = z.infer<typeof formSchema>;

interface AddBoardDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAddBoard: (board: Omit<Board, 'id' | 'createdAt' | 'ownerId'>) => Promise<void>;
  existingBoardCount: number;
}

export function AddBoardDialog({ isOpen, onOpenChange, onAddBoard, existingBoardCount }: AddBoardDialogProps) {
  const { toast } = useToast();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      const icon = boardIcons[existingBoardCount % boardIcons.length];
      await onAddBoard({ 
        ...values, 
        icon,
        members: {},
        sharedWith: {}
      });
      onOpenChange(false);
      form.reset();
    } catch (error) {
      let errorMessage = 'Failed to add board. Please try again.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create new board</DialogTitle>
          <DialogDescription>
            Boards help you organize your tasks into separate projects.
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
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Creating...' : 'Create Board'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
