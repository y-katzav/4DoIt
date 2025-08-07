'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CalendarIcon, Check, ChevronsUpDown, UploadCloud, Loader2, File as FileIcon, X, Pencil, User as UserIcon } from 'lucide-react';
import { format } from 'date-fns';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import type { Task, Category, BoardMember } from '@/lib/types';
import { firebaseApp } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './auth-provider';
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE } from '@/lib/constants';
import { Timestamp } from 'firebase/firestore';
import { Avatar, AvatarFallback } from './ui/avatar';

const formSchema = z.object({
  description: z.string().min(3, 'Description must be at least 3 characters.'),
  categoryId: z.string().min(1, 'Please select a category.'),
  priority: z.enum(['low', 'medium', 'high']),
  dueDate: z.date().nullable(),
  fileUrl: z.string().optional(),
  fileName: z.string().optional(),
  assigneeUid: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditTaskDialogProps {
  task: Task;
  categories: Category[];
  boardMembers: BoardMember[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
}

export function EditTaskDialog({ task, categories, boardMembers, isOpen, onClose, onSave }: EditTaskDialogProps) {
  const [categoryPopoverOpen, setCategoryPopoverOpen] = useState(false);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: task.description,
      categoryId: task.categoryId,
      priority: task.priority,
      dueDate: task.dueDate ? (task.dueDate instanceof Timestamp ? task.dueDate.toDate() : task.dueDate) : null,
      fileUrl: task.fileUrl,
      fileName: task.fileName,
      assigneeUid: task.assigneeUid,
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        description: task.description,
        categoryId: task.categoryId,
        priority: task.priority,
        dueDate: task.dueDate ? (task.dueDate instanceof Timestamp ? task.dueDate.toDate() : task.dueDate) : null,
        fileUrl: task.fileUrl,
        fileName: task.fileName,
        assigneeUid: task.assigneeUid || undefined,
      });
    }
  }, [isOpen, task, form]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user) {
        if (file.size > MAX_FILE_SIZE) {
            toast({
                variant: 'destructive',
                title: "File is too large",
                description: `Please select a file smaller than ${MAX_FILE_SIZE / 1024 / 1024}MB.`,
            });
            return;
        }

        if (!ALLOWED_FILE_TYPES.includes(file.type)) {
             toast({
                variant: 'destructive',
                title: "Invalid file type",
                description: "Please select a valid file type (e.g., image, PDF, document).",
            });
            return;
        }

        setIsUploading(true);
        try {
            // If there's an existing file, delete it first
            const currentFileUrl = form.getValues('fileUrl');
            if (currentFileUrl) {
                const storage = getStorage(firebaseApp);
                const oldFileRef = ref(storage, currentFileUrl);
                await deleteObject(oldFileRef);
            }

            const storage = getStorage(firebaseApp);
            const storageRef = ref(storage, `attachments/${user.uid}/${Date.now()}-${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            form.setValue('fileUrl', downloadURL);
            form.setValue('fileName', file.name);
            toast({
                title: "File Uploaded",
                description: `${file.name} has been uploaded successfully.`,
            });
        } catch (error) {
            console.error("Error uploading file:", error);
            toast({
                variant: 'destructive',
                title: "Upload Failed",
                description: "There was an error uploading your file.",
            });
        } finally {
            setIsUploading(false);
        }
    }
  };

  const removeFile = async () => {
    const fileUrl = form.getValues('fileUrl');
    if (fileUrl) {
      try {
        const storage = getStorage(firebaseApp);
        const fileRef = ref(storage, fileUrl);
        await deleteObject(fileRef);
        form.setValue('fileUrl', '');
        form.setValue('fileName', '');
        toast({
          title: "File Removed",
          description: `The attached file has been removed.`,
        });
      } catch (error) {
        console.error("Error removing file:", error);
        toast({
            variant: 'destructive',
            title: "Removal Failed",
            description: "There was an error removing your file.",
        });
      }
    }
  }

  const onSubmit = (values: FormValues) => {
    onSave({
      ...task,
      ...values,
      assigneeUid: values.assigneeUid === 'unassigned' ? undefined : values.assigneeUid,
    });
    onClose();
  };

  const handleCategorySelect = (categoryId: string) => {
    form.setValue("categoryId", categoryId);
    setCategoryPopoverOpen(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Edit task</DialogTitle>
          <DialogDescription>
            Update the details of your task below.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g. Finalize the project report"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Category</FormLabel>
                  <Popover open={categoryPopoverOpen} onOpenChange={setCategoryPopoverOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value
                            ? (
                                <div className="flex items-center gap-2">
                                  <span className={cn('w-4 h-4 rounded-full', categories.find(c => c.id === field.value)?.color)}></span>
                                  {categories.find(c => c.id === field.value)?.name}
                                </div>
                              )
                            : "Select a category"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[420px] p-0">
                      <Command>
                        <CommandInput placeholder="Search category..." />
                        <CommandList>
                          <CommandEmpty>No category found.</CommandEmpty>
                          <CommandGroup>
                            {categories.map((category) => (
                              <CommandItem
                                value={category.name}
                                key={category.id}
                                onSelect={() => handleCategorySelect(category.id)}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    category.id === field.value
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                 <div className='flex items-center gap-2'>
                                  <span className={cn('w-4 h-4 rounded-full', category.color)}></span>
                                  {category.name}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className='mb-2'>Due Date</FormLabel>
                    <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={'outline'}
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP')
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ?? undefined}
                          onSelect={(date) => {
                            field.onChange(date);
                            setDatePopoverOpen(false);
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

             <FormField
              control={form.control}
              name="assigneeUid"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assign To</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || 'unassigned'}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                       <SelectItem value="unassigned">
                         <div className="flex items-center gap-2">
                           <UserIcon className="h-4 w-4 text-muted-foreground" />
                           <span>Unassigned</span>
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
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormItem>
                <FormLabel>Attachment</FormLabel>
                {isUploading ? (
                     <div className="flex items-center justify-center p-4 border-2 border-dashed rounded-md">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        <span>Uploading...</span>
                    </div>
                ) : form.watch('fileUrl') ? (
                     <div className="flex items-center justify-between p-2 border rounded-md">
                        <div className="flex items-center gap-2">
                            <FileIcon className="h-4 w-4 text-muted-foreground" />
                            <a href={form.watch('fileUrl')!} target="_blank" rel="noopener noreferrer" className="text-sm font-medium truncate hover:underline">{form.watch('fileName')}</a>
                        </div>
                        <div className="flex items-center">
                            <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
                                <label htmlFor="file-upload-edit-replace" className='cursor-pointer'>
                                    <Pencil className="h-4 w-4" />
                                </label>
                            </Button>
                             <Input 
                                id="file-upload-edit-replace" 
                                type="file" 
                                className="sr-only"
                                onChange={handleFileUpload}
                                accept={ALLOWED_FILE_TYPES.join(',')}
                             />
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={removeFile}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                ) : (
                    <FormControl>
                         <div className="relative">
                            <Input 
                                id="file-upload-edit" 
                                type="file" 
                                className="sr-only"
                                onChange={handleFileUpload}
                                accept={ALLOWED_FILE_TYPES.join(',')}
                             />
                             <label
                                htmlFor="file-upload-edit"
                                className="flex items-center justify-center p-4 border-2 border-dashed rounded-md cursor-pointer hover:bg-accent/50"
                            >
                                <UploadCloud className="h-6 w-6 text-muted-foreground mr-2" />
                                <span className="text-sm text-muted-foreground">Click to upload or replace file</span>
                            </label>
                        </div>
                    </FormControl>
                )}
                <FormMessage />
            </FormItem>

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
