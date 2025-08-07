'use client';

import { useState, useTransition, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CalendarIcon, Sparkles, Loader2, ChevronsUpDown, Check, UploadCloud, X, File as FileIcon, Pencil, User as UserIcon } from 'lucide-react';
import { format } from 'date-fns';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import type { User } from 'firebase/auth';


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
import { cn } from '@/lib/utils';
import type { Task, Category, BoardMember } from '@/lib/types';
import { suggestTaskCategory } from '@/ai/flows/suggest-task-category';
import { useToast } from '@/hooks/use-toast';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { ColorPicker } from './color-picker';
import { firebaseApp } from '@/lib/firebase';
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE } from '@/lib/constants';
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

interface AddTaskDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAddTask: (task: Omit<Task, 'id' | 'completed' | 'boardId'>, newCategory?: Omit<Category, 'id'>) => Promise<void>;
  categories: Category[];
  boardMembers: BoardMember[];
  defaultCategoryId?: string;
  user: User | null;
}

export const availableColors = [
    'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500', 
    'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500', 
    'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500', 
    'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500', 
    'bg-rose-500', 'bg-slate-500'
];


export function AddTaskDialog({ isOpen, onOpenChange, onAddTask, categories, boardMembers, defaultCategoryId, user }: AddTaskDialogProps) {
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [isSuggesting, startSuggestionTransition] = useTransition();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  
  const [categoryPopoverOpen, setCategoryPopoverOpen] = useState(false);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newCategoryColor, setNewCategoryColor] = useState(availableColors[0]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: '',
      categoryId: defaultCategoryId ?? '',
      priority: 'medium',
      dueDate: null,
      fileUrl: '',
      fileName: '',
      assigneeUid: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
        form.reset({
            description: '',
            categoryId: defaultCategoryId ?? '',
            priority: 'medium',
            dueDate: null,
            fileUrl: '',
            fileName: '',
            assigneeUid: '',
        });
        setCategorySearch(categories.find(c => c.id === defaultCategoryId)?.name || "");
        setIsCreatingNew(false);
        setSuggestion(null);
    }
  }, [isOpen, defaultCategoryId, categories, form]);

  const descriptionValue = form.watch('description');

  const handleGetSuggestion = useCallback(() => {
    if (descriptionValue && descriptionValue.length > 10) {
      startSuggestionTransition(async () => {
        try {
          const result = await suggestTaskCategory({ description: descriptionValue });
          const suggestedCatName = result.category;
          if (suggestedCatName && !categories.some(c => c.name.toLowerCase() === suggestedCatName.toLowerCase())) {
            setSuggestion(suggestedCatName);
          }
        } catch (error) {
          console.error('Failed to get suggestion:', error);
          toast({
            variant: 'destructive',
            title: 'AI Suggestion Error',
            description: 'Could not get an AI category suggestion.',
          });
        }
      });
    } else {
      setSuggestion(null);
    }
  }, [descriptionValue, toast, categories]);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleGetSuggestion();
    }, 1000);
    return () => clearTimeout(timer);
  }, [descriptionValue, handleGetSuggestion]);

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

  const onSubmit = async (values: FormValues) => {
    try {
      const finalValues = {
        ...values,
        assigneeUid: values.assigneeUid === 'unassigned' ? undefined : values.assigneeUid,
      };

      if (isCreatingNew) {
          if (!categorySearch) {
              form.setError('categoryId', { message: 'New category name cannot be empty.' });
              return;
          }
          await onAddTask({ ...finalValues, categoryId: '' }, { name: categorySearch, color: newCategoryColor });
      } else {
          await onAddTask(finalValues);
      }
      
      toast({
        title: 'Task created',
        description: `Successfully added task.`,
      });
      onOpenChange(false);
    } catch (error) {
       let errorMessage = 'Failed to add task. Please try again.';
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

  const handleCategorySelect = (categoryId: string) => {
    form.setValue("categoryId", categoryId, { shouldValidate: true });
    setIsCreatingNew(false);
    setCategorySearch(categories.find(c => c.id === categoryId)?.name || "");
    setCategoryPopoverOpen(false);
  };

  const handleCreateNewCategory = () => {
    if (categorySearch) {
        setIsCreatingNew(true);
        form.setValue("categoryId", categorySearch); // Temporary use name as ID for validation
        setCategoryPopoverOpen(false);
    }
  };

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(categorySearch.toLowerCase())
  );
  
  const showCreateNewButton = categorySearch.length > 0 && !categories.some(c => c.name.toLowerCase() === categorySearch.toLowerCase());
  const selectedCategory = categories.find(c => c.id === form.watch('categoryId'));

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Create a new task</DialogTitle>
          <DialogDescription>
            Fill in the details below to add a new task to your list.
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
                            {isCreatingNew ? (
                                <div className='flex items-center gap-2'>
                                    <span className={cn('w-4 h-4 rounded-full', newCategoryColor)}></span>
                                    <span>Create: &quot;{categorySearch}&quot;</span>
                                </div>
                            ) : (
                               selectedCategory ? (
                                <div className="flex items-center gap-2">
                                  <span className={cn('w-4 h-4 rounded-full', selectedCategory.color)}></span>
                                  {selectedCategory.name}
                                </div>
                              ) : "Select a category"
                            )}
                          
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[420px] p-0">
                      <Command>
                        <CommandInput
                          placeholder="Search category or create new..."
                          onValueChange={(search) => {
                            setCategorySearch(search);
                            setIsCreatingNew(false);
                            form.setValue('categoryId', '');
                          }}
                          value={categorySearch}
                        />
                        <CommandList>
                          <CommandEmpty>No results found.</CommandEmpty>
                          {showCreateNewButton && (
                             <div className='p-2'>
                                <p className='text-sm text-muted-foreground px-2 pb-1'>New Category</p>
                                <div className='flex items-center justify-between p-2 rounded-md bg-slate-50'>
                                    <span className='font-medium text-sm'>{`"${categorySearch}"`}</span>
                                    <div className='flex items-center gap-2'>
                                        <ColorPicker value={newCategoryColor} onChange={setNewCategoryColor} />
                                        <Button size='sm' onClick={handleCreateNewCategory}>Create</Button>
                                    </div>
                                </div>
                             </div>
                          )}
                           <CommandGroup>
                            {filteredCategories.map((category) => (
                              <CommandItem
                                value={category.name}
                                key={category.id}
                                onSelect={() => handleCategorySelect(category.id)}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    field.value === category.id ? "opacity-100" : "opacity-0"
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

                  {isSuggesting && (
                    <div className="flex items-center text-sm text-muted-foreground pt-1">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      <span>Generating AI suggestion...</span>
                    </div>
                  )}
                  {suggestion && !isSuggesting && (
                    <div className="flex items-center gap-2 pt-1">
                      <p className="text-sm text-muted-foreground">AI Suggestion:</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            setCategorySearch(suggestion);
                            handleCreateNewCategory();
                        }}
                        className="text-primary border-primary/50 hover:bg-primary/10"
                      >
                        <Sparkles className="mr-2 h-3 w-3" />
                        {`Create "${suggestion}"`}
                      </Button>
                    </div>
                  )}
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                            <span className="text-sm font-medium truncate">{form.watch('fileName')}</span>
                        </div>
                         <div className="flex items-center">
                            <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
                                <label htmlFor="file-upload-replace" className='cursor-pointer'>
                                    <Pencil className="h-4 w-4" />
                                </label>
                            </Button>
                             <Input 
                                id="file-upload-replace" 
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
                                id="file-upload" 
                                type="file" 
                                className="sr-only"
                                onChange={handleFileUpload}
                                accept={ALLOWED_FILE_TYPES.join(',')}
                            />
                             <label
                                htmlFor="file-upload"
                                className="flex items-center justify-center p-4 border-2 border-dashed rounded-md cursor-pointer hover:bg-accent/50"
                            >
                                <UploadCloud className="h-6 w-6 text-muted-foreground mr-2" />
                                <span className="text-sm text-muted-foreground">Click to upload a file</span>
                            </label>
                        </div>
                    </FormControl>
                )}
                <FormMessage />
            </FormItem>


            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Adding...' : 'Add Task'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
