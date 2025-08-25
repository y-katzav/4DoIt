'use client';

import { useState, useTransition, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CalendarIcon, Sparkles, Loader2, ChevronsUpDown, Check, UploadCloud, X, File as FileIcon, Pencil, User as UserIcon } from 'lucide-react';
import { format } from 'date-fns';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
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
import { availableColors } from './add-task-dialog';
import { firebaseApp } from '@/lib/firebase';
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE } from '@/lib/constants';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from './auth-provider';

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

interface TaskFormDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmit: (task: Omit<Task, 'id' | 'completed' | 'boardId'>, newCategory?: Omit<Category, 'id'>) => Promise<void>;
  categories: Category[];
  boardMembers: BoardMember[];
  user: User | null;
  // For edit mode
  task?: Task;
  mode: 'add' | 'edit';
  defaultCategoryId?: string;
}

export function TaskFormDialog({ 
  isOpen, 
  onOpenChange, 
  onSubmit, 
  categories, 
  boardMembers, 
  user, 
  task,
  mode = 'add',
  defaultCategoryId 
}: TaskFormDialogProps) {
  const { user: authUser } = useAuth(); // השתמש ב-useAuth ישירות
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [isSuggesting, startSuggestionTransition] = useTransition();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  
  const [categoryPopoverOpen, setCategoryPopoverOpen] = useState(false);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('bg-blue-500');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: task?.description || '',
      categoryId: task?.categoryId || defaultCategoryId || '',
      priority: task?.priority || 'medium',
      dueDate: task?.dueDate ? (task.dueDate instanceof Timestamp ? task.dueDate.toDate() : task.dueDate) : null,
      fileUrl: task?.fileUrl || '',
      fileName: task?.fileName || '',
      assigneeUid: task?.assigneeUid || undefined,
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        description: task?.description || '',
        categoryId: task?.categoryId || defaultCategoryId || '',
        priority: task?.priority || 'medium',
        dueDate: task?.dueDate ? (task.dueDate instanceof Timestamp ? task.dueDate.toDate() : task.dueDate) : null,
        fileUrl: task?.fileUrl || '',
        fileName: task?.fileName || '',
        assigneeUid: task?.assigneeUid || undefined,
      });
      setSuggestion(null);
      setIsCreatingCategory(false);
      setNewCategoryName('');
      setNewCategoryColor('bg-blue-500');
    }
  }, [isOpen, task, defaultCategoryId, form]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    // השתמש ב-authUser במקום user prop
    if (file && authUser) {
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
            const storagePath = `attachments/${authUser.uid}/${Date.now()}-${file.name}`;
            const storageRef = ref(storage, storagePath);
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
  };

  const handleCategorySelect = (categoryId: string) => {
    console.log('handleCategorySelect called with:', categoryId);
    if (categoryId === 'create-new') {
      setIsCreatingCategory(true);
      return;
    }
    form.setValue("categoryId", categoryId);
    console.log('Form value set to:', categoryId);
    setCategoryPopoverOpen(false);
  };

  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) {
      toast({
        variant: 'destructive',
        title: "Invalid Category Name",
        description: "Please enter a category name.",
      });
      return;
    }

    if (categories.some(cat => cat.name.toLowerCase() === newCategoryName.toLowerCase())) {
      toast({
        variant: 'destructive',
        title: "Category Already Exists",
        description: "A category with this name already exists.",
      });
      return;
    }

    // We'll handle this in the onSubmit function
    form.setValue("categoryId", "new-category");
    setIsCreatingCategory(false);
    setCategoryPopoverOpen(false);
  };

  const handleCancelCreateCategory = () => {
    setIsCreatingCategory(false);
    setNewCategoryName('');
    setNewCategoryColor('bg-blue-500');
  };

  const requestCategorySuggestion = useCallback(async () => {
    const description = form.getValues('description');
    if (!description.trim()) {
      toast({
        variant: 'destructive',
        title: "No Description",
        description: "Please enter a task description first.",
      });
      return;
    }

    if (description.trim().length < 10) {
      toast({
        variant: 'destructive',
        title: "Description Too Short",
        description: "Please enter at least 10 characters to get an AI suggestion.",
      });
      return;
    }

    console.log('Client: Requesting AI suggestion for:', description.substring(0, 50));

    startSuggestionTransition(async () => {
      try {
        const response = await fetch('/api/ai/suggest-category', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            description,
            existingCategories: categories.map(c => c.name)
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('API Error:', response.status, errorData);
          throw new Error(errorData.error || `API Error: ${response.status}`);
        }

        const data = await response.json();
        setSuggestion(data.category);
      } catch (error) {
        console.error('Error getting AI suggestion:', error);
        toast({
          variant: 'destructive',
          title: "AI Suggestion Failed",
          description: error instanceof Error ? error.message : "Could not get AI category suggestion. Please try again.",
        });
      }
    });
  }, [form, categories, toast]);

  const handleFormSubmit = async (values: FormValues) => {
    try {
      let newCategory: Omit<Category, 'id'> | undefined;
      
      if (values.categoryId === "new-category") {
        newCategory = {
          name: newCategoryName,
          color: newCategoryColor,
        };
      }

      const taskData = {
        ...values,
        assigneeUid: values.assigneeUid === 'unassigned' ? undefined : values.assigneeUid,
      };

      if (mode === 'edit' && task) {
        // For edit mode, merge with existing task data
        await onSubmit({ ...task, ...taskData }, newCategory);
      } else {
        // For add mode
        await onSubmit(taskData, newCategory);
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting task:', error);
      toast({
        variant: 'destructive',
        title: mode === 'edit' ? "Update Failed" : "Creation Failed",
        description: `There was an error ${mode === 'edit' ? 'updating' : 'creating'} your task.`,
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'Edit task' : 'Add a new task'}</DialogTitle>
          <DialogDescription>
            {mode === 'edit' ? 'Update the details of your task below.' : 'Fill in the details for your new task below.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="grid gap-4 py-4">
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
                  <div className="flex gap-2">
                    <Popover open={categoryPopoverOpen} onOpenChange={setCategoryPopoverOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "flex-1 justify-between",
                              !field.value && "text-muted-foreground"
                            )}
                            onClick={() => {
                              console.log('Popover button clicked, current open state:', categoryPopoverOpen);
                            }}
                          >
                            {field.value === "new-category" ? (
                              <div className="flex items-center gap-2">
                                <span className={cn('w-4 h-4 rounded-full', newCategoryColor)}></span>
                                {newCategoryName}
                              </div>
                            ) : field.value ? (
                              <div className="flex items-center gap-2">
                                <span className={cn('w-4 h-4 rounded-full', categories.find(c => c.id === field.value)?.color)}></span>
                                {categories.find(c => c.id === field.value)?.name}
                              </div>
                            ) : "Select a category"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[420px] p-0">
                        {isCreatingCategory ? (
                          <div className="p-4 space-y-4">
                            <h4 className="font-medium">Create New Category</h4>
                            <div className="space-y-2">
                              <Input
                                placeholder="Category name"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                              />
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Color</label>
                                <ColorPicker
                                  value={newCategoryColor}
                                  onChange={setNewCategoryColor}
                                />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={handleCreateCategory}>
                                Create
                              </Button>
                              <Button size="sm" variant="outline" onClick={handleCancelCreateCategory}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="w-[420px] max-h-60 overflow-auto border rounded-md bg-popover">
                            <div className="p-1">
                              {categories.map((category) => (
                                <div
                                  key={category.id}
                                  className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-sm"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    console.log('Category clicked:', category.id, category.name);
                                    handleCategorySelect(category.id);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "h-4 w-4",
                                      category.id === field.value
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  <span className={cn('w-4 h-4 rounded-full', category.color)}></span>
                                  <span>{category.name}</span>
                                </div>
                              ))}
                              <div
                                className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-sm"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log('Create new category clicked');
                                  handleCategorySelect('create-new');
                                }}
                              >
                                <Check className="h-4 w-4 opacity-0" />
                                <span className="w-4 h-4 rounded-full bg-gray-300"></span>
                                <span>Create new category...</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
                    
                    {mode === 'add' && (
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={requestCategorySuggestion}
                        disabled={isSuggesting}
                        className="shrink-0"
                      >
                        {isSuggesting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                  
                  {suggestion && mode === 'add' && (
                    <div className="mt-2 p-3 bg-muted rounded-md">
                      <p className="text-sm font-medium mb-2">AI suggests:</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const existingCategory = categories.find(c => c.name.toLowerCase() === suggestion.toLowerCase());
                          if (existingCategory) {
                            form.setValue("categoryId", existingCategory.id);
                          } else {
                            setNewCategoryName(suggestion);
                            form.setValue("categoryId", "new-category");
                          }
                          setSuggestion(null);
                        }}
                        className="text-xs"
                      >
                        {suggestion}
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
                    <a href={form.watch('fileUrl')!} target="_blank" rel="noopener noreferrer" className="text-sm font-medium truncate hover:underline">
                      {form.watch('fileName')}
                    </a>
                  </div>
                  <div className="flex items-center">
                    <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
                      <label htmlFor={`file-upload-${mode}-replace`} className='cursor-pointer'>
                        <Pencil className="h-4 w-4" />
                      </label>
                    </Button>
                    <Input 
                      id={`file-upload-${mode}-replace`} 
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
                      id={`file-upload-${mode}`} 
                      type="file" 
                      className="sr-only"
                      onChange={handleFileUpload}
                      accept={ALLOWED_FILE_TYPES.join(',')}
                    />
                    <label
                      htmlFor={`file-upload-${mode}`}
                      className="flex items-center justify-center p-4 border-2 border-dashed rounded-md cursor-pointer hover:bg-accent/50"
                    >
                      <UploadCloud className="h-6 w-6 text-muted-foreground mr-2" />
                      <span className="text-sm text-muted-foreground">Click to upload file</span>
                    </label>
                  </div>
                </FormControl>
              )}
              <FormMessage />
            </FormItem>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {mode === 'edit' ? 'Save Changes' : 'Add Task'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
