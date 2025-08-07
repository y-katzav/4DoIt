'use client';

import { useEffect } from 'react';
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
import type { Category } from '@/lib/types';
import { ColorPicker } from './color-picker';

const formSchema = z.object({
  newCategoryName: z.string().min(2, 'Category name must be at least 2 characters.'),
  color: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditCategoryDialogProps {
  category: Category;
  isOpen: boolean;
  onClose: () => void;
  onSave: (categoryId: string, newName: string, newColor: string) => void;
  allCategoryNames: string[];
}

export function EditCategoryDialog({
  category,
  isOpen,
  onClose,
  onSave,
  allCategoryNames,
}: EditCategoryDialogProps) {
  const { toast } = useToast();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      newCategoryName: category.name,
      color: category.color,
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        newCategoryName: category.name,
        color: category.color,
      });
    }
  }, [isOpen, category, form]);

  const onSubmit = (values: FormValues) => {
    const isNameChanged = values.newCategoryName !== category.name;
    const isColorChanged = values.color !== category.color;

    if (isNameChanged && allCategoryNames.includes(values.newCategoryName)) {
      form.setError('newCategoryName', {
        type: 'manual',
        message: 'This category name already exists.',
      });
      return;
    }
    
    if (isNameChanged || isColorChanged) {
      onSave(category.id, values.newCategoryName, values.color);
      toast({
        title: 'Category Updated',
        description: `"${category.name}" has been updated.`,
      });
    }

    onClose();
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Category</DialogTitle>
          <DialogDescription>
            Change the name and color for the category &quot;{category.name}&quot;.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="newCategoryName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <ColorPicker value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
