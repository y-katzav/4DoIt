'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Task, Category, Board, BoardMember, BoardInvitation, BoardRole } from '@/lib/types';
import { Header } from '@/components/header';
import { TaskList } from '@/components/task-list';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth-provider';
import { getAuth, signOut } from 'firebase/auth';
import { firebaseApp, db } from '@/lib/firebase';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { AddTaskDialog } from '@/components/add-task-dialog';
import { AiTaskCreator } from '@/components/ai-task-creator';
import {
  collection,
  query,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  writeBatch,
  Timestamp,
  where,
  getDoc,
  collectionGroup,
   setDoc, 
} from 'firebase/firestore';
import { Loader2, PlusCircle, Pencil } from 'lucide-react';
import type { CreateTasksFromPromptOutput } from '@/ai/flows/create-tasks-from-prompt';
import {
  SidebarProvider,
  Sidebar,
  SidebarRail,
  SidebarInset,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
  SidebarMenuAction,
  SidebarGroup,
  SidebarGroupLabel,
} from '@/components/ui/sidebar';
import { Logo } from '@/components/logo';
import { AddBoardDialog } from '@/components/add-board-dialog';
import { NoBoards } from '@/components/no-boards';
import { ShareBoardDialog } from '@/components/share-board-dialog';
import {
  getOwnedBoards,
  getSharedBoards,
  updateBoardDetails,
  deleteBoard as deleteBoardFromDb,
  getPendingInvitations,
  acceptBoardInvitation,
  declineBoardInvitation,
  getBoardMembers,
  getUserBoardsViaMemberships,
} from '@/lib/firestore';
import { EditBoardDialog } from '@/components/edit-board-dialog';
import { DynamicIcon } from '@/components/dynamic-icon';
import { boardIcons } from '@/lib/constants';

// ---------- Small date helpers (UI uses Date|null; Firestore uses Timestamp|null)
const toTimestamp = (value: Date | Timestamp | null | undefined): Timestamp | null => {
  if (value == null) return null;
  return value instanceof Date ? Timestamp.fromDate(value) : value;
};

const toDate = (value: Date | Timestamp | null | undefined): Date | null => {
  if (value == null) return null;
  return value instanceof Date ? value : value.toDate();
};
// -------------------------------------------------------------------------------

type BoardWithRole = {
  board: Board;
  role: BoardRole;
};

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [ownedBoards, setOwnedBoards] = useState<BoardWithRole[]>([]);
  const [sharedBoards, setSharedBoards] = useState<BoardWithRole[]>([]);
  const [invitations, setInvitations] = useState<BoardInvitation[]>([]);
  const [activeBoard, setActiveBoard] = useState<BoardWithRole | null>(null);
  const [boardMembers, setBoardMembers] = useState<BoardMember[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isAddBoardOpen, setIsAddBoardOpen] = useState(false);
  const [isEditBoardOpen, setIsEditBoardOpen] = useState(false);
  const [editingBoard, setEditingBoard] = useState<Board | null>(null);
  const [isShareBoardOpen, setIsShareBoardOpen] = useState(false);
  const [defaultCategory, setDefaultCategory] = useState<string | undefined>(undefined);

  const { toast } = useToast();
  const { user } = useAuth();
  const auth = getAuth(firebaseApp);
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const boardId = searchParams.get('board');

  const fetchBoardsAndInvitations = useCallback(async () => {
    if (!user || !user.email) return;
    setIsLoading(true);
    try {
      console.log('Fetching data for user:', { uid: user.uid, email: user.email });
      
      // בדוק כל פונקציה בנפרד
      let owned = [], shared = [], pendingInvitations = [];
      
      // נבדק את הגישה החדשה דרך boardMemberships
      console.log('Testing new boardMemberships approach...');
      try {
        const allBoardsViaMemberships = await getUserBoardsViaMemberships(user.uid);
        console.log('getUserBoardsViaMemberships success:', allBoardsViaMemberships);
        
        // הפרדה לבעלים ושותפים
        const ownedViaMemberships = allBoardsViaMemberships
          .filter(item => item.role === 'owner')
          .map(item => item.board);
        const sharedViaMemberships = allBoardsViaMemberships.filter(item => item.role !== 'owner');
        
        console.log('Owned via memberships:', ownedViaMemberships.length);
        console.log('Shared via memberships:', sharedViaMemberships.length);
        
        // אם יש נתונים דרך boardMemberships, נשתמש בהם
        if (allBoardsViaMemberships.length > 0) {
          owned = ownedViaMemberships;
          shared = sharedViaMemberships;
          console.log('Using boardMemberships approach');
        } else {
          // אחרת, נשתמש בגישה הישנה
          console.log('No boardMemberships found, falling back to old approach');
          throw new Error('No boardMemberships - fallback to old approach');
        }
      } catch (error) {
        console.log('boardMemberships approach failed, using old approach:', error);
        
        try {
          owned = await getOwnedBoards(user.uid);
          console.log('getOwnedBoards success:', owned);
        } catch (error) {
          console.error('getOwnedBoards failed:', error);
          throw error;
        }
        
        try {
          shared = await getSharedBoards(user.uid);
          console.log('getSharedBoards success:', shared);
        } catch (error) {
          console.error('getSharedBoards failed:', error);
          throw error;
        }
      }
      
      try {
        pendingInvitations = await getPendingInvitations(user.email);
        console.log('getPendingInvitations success:', pendingInvitations);
      } catch (error) {
        console.error('getPendingInvitations failed:', error);
        throw error;
      }

      const ownedWithRoles = owned.map((board) => ({ board, role: 'owner' as const }));
      setOwnedBoards(ownedWithRoles);
      setSharedBoards(shared);

      const allBoards = [...ownedWithRoles, ...shared];

      if (allBoards.length > 0) {
        let currentBoard = allBoards.find((b) => b.board.id === boardId);
        if (!currentBoard) {
          currentBoard = allBoards[0];
          router.replace(`${pathname}?board=${currentBoard.board.id}`, { scroll: false });
        }
        setActiveBoard(currentBoard);
      } else {
        setActiveBoard(null);
        if (boardId) {
          router.replace(pathname, { scroll: false });
        }
      }
      setInvitations(pendingInvitations);
    } catch (error) {
      console.error('Error fetching boards and invitations: ', error);
      console.error('User details:', { uid: user?.uid, email: user?.email });
      
      // בדוק איזו פונקציה נכשלת
      if (error instanceof Error && error.message.includes('permission-denied')) {
        console.error('Permission denied - check Firestore rules and user authentication');
      }
      
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch your boards and invitations.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, boardId, pathname, router, toast]);

  const fetchDataForBoard = useCallback(async () => {
    if (!user || !activeBoard) return;
    setIsDataLoading(true);
    try {
      const members = await getBoardMembers(activeBoard.board.id);
      setBoardMembers(members);

      const categoriesQuery = query(collection(db, `boards/${activeBoard.board.id}/categories`));
      const categoriesSnapshot = await getDocs(categoriesQuery);
      const fetchedCategories: Category[] = categoriesSnapshot.docs.map(
        (d) =>
          ({
            id: d.id,
            ...(d.data() as Omit<Category, 'id'>),
          } as Category)
      );
      setCategories(fetchedCategories);

      const tasksQuery = query(collection(db, `boards/${activeBoard.board.id}/tasks`));
      const tasksSnapshot = await getDocs(tasksQuery);
      const fetchedTasks: Task[] = tasksSnapshot.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          ...data,
          // Normalize to Date|null for UI
          dueDate: toDate(data.dueDate),
        } as Task;
      });
      setTasks(fetchedTasks);
    } catch (error) {
      const firebaseError = error as { code?: string; message?: string };
      let errorMessage = firebaseError.message || 'Failed to fetch your data. Please try again later.';
      if (firebaseError.code === 'permission-denied') {
        errorMessage = 'You do not have permission to view this board.';
        if (activeBoard) {
          setOwnedBoards((boards) => boards.filter((b) => b.board.id !== activeBoard.board.id));
          setSharedBoards((boards) => boards.filter((b) => b.board.id !== activeBoard.board.id));
          setActiveBoard(null);
          router.replace('/');
        }
      }
      console.error('Error fetching board data: ', error);
      toast({
        variant: 'destructive',
        title: 'Error fetching board data',
        description: errorMessage,
      });
    } finally {
      setIsDataLoading(false);
    }
  }, [user, activeBoard, toast, router]);

  useEffect(() => {
    if (user) {
      fetchBoardsAndInvitations();
    }
  }, [user, boardId, fetchBoardsAndInvitations]);

  useEffect(() => {
    if (activeBoard) {
      fetchDataForBoard();
    } else {
      setTasks([]);
      setCategories([]);
      setBoardMembers([]);
    }
  }, [activeBoard, fetchDataForBoard]);

  const handleOpenAddTaskDialog = (categoryId?: string) => {
    setDefaultCategory(categoryId);
    setIsAddTaskOpen(true);
  };

  const handleOpenEditBoardDialog = (board: Board) => {
    setEditingBoard(board);
    setIsEditBoardOpen(true);
  };

  // -------------------- Boards --------------------

const handleAddBoard = async (boardData: Omit<Board, 'id' | 'createdAt' | 'ownerId'>) => {
  if (!user || !user.email) return;

  // שלב 1: צור את הלוח
  const newBoardRef = doc(collection(db, 'boards'));
  const newBoardData: Omit<Board, 'id'> = {
    ...boardData,
    createdAt: Timestamp.now(),
    ownerId: user.uid,
    members: { [user.uid]: 'owner' },
    sharedWith: {}, // יוצר שדה sharedWith ריק
  };
  await setDoc(newBoardRef, newBoardData);

  // שלב 1.5: הוסף מסמך לתת-אוסף boardMemberships של המשתמש
  const membershipDocRef = doc(db, 'users', user.uid, 'boardMemberships', newBoardRef.id);
  await setDoc(membershipDocRef, {
    boardId: newBoardRef.id,
    boardName: boardData.name,
    role: 'owner',
    joinedAt: Timestamp.now(),
  });

  // שלב 2: צור קטגוריות ומשימה (אפשר ב-batch חדש)
  const batch = writeBatch(db);

  const defaults = [
    { name: 'To Do', color: 'bg-yellow-500' },
    { name: 'In Progress', color: 'bg-blue-500' },
    { name: 'Done', color: 'bg-green-500' },
  ];
  const newCategories: Category[] = [];
  defaults.forEach((category) => {
    const newCatRef = doc(collection(db, `boards/${newBoardRef.id}/categories`));
    const catData = { ...category, createdAt: Timestamp.now() };
    batch.set(newCatRef, catData);
    newCategories.push({ id: newCatRef.id, name: category.name, color: category.color });
  });

  const newTaskRef = doc(collection(db, `boards/${newBoardRef.id}/tasks`));
  const newTaskData = {
    description: 'Welcome to your new board!',
    priority: 'medium' as const,
    categoryId: newCategories[0].id,
    boardId: newBoardRef.id,
    completed: false,
    createdAt: Timestamp.now(),
    dueDate: null,
  };
  batch.set(newTaskRef, newTaskData);

  const userBoardMembershipRef = doc(db, `users/${user.uid}/boardMemberships/${newBoardRef.id}`);
  batch.set(userBoardMembershipRef, {
    boardName: boardData.name,
    role: 'owner',
  });

  await batch.commit();

  // ...המשך הקוד...
};
  const handleEditBoard = async (boardId: string, newName: string, newIcon: string) => {
    if (!user) return;
    try {
      const updatedBoard = await updateBoardDetails(boardId, newName, newIcon);
      handleBoardUpdate(updatedBoard);
      toast({
        title: 'Board Updated',
        description: `Board "${newName}" has been updated.`,
      });
    } catch (error) {
      let errorMessage = 'An unexpected error occurred.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: errorMessage,
      });
    }
  };

  const handleDeleteBoard = async (boardToDeleteId: string) => {
    if (!user) return;
    try {
      const allBoards = [...ownedBoards, ...sharedBoards];
      const boardName = allBoards.find((b) => b.board.id === boardToDeleteId)?.board.name || 'The board';
      await deleteBoardFromDb(boardToDeleteId);

      setOwnedBoards((prev) => prev.filter((b) => b.board.id !== boardToDeleteId));

      if (activeBoard?.board.id === boardToDeleteId) {
        const remainingBoards = ownedBoards.filter((b) => b.board.id !== boardToDeleteId);
        if (remainingBoards.length > 0) {
          router.replace(`${pathname}?board=${remainingBoards[0].board.id}`);
        } else {
          setActiveBoard(null);
          router.replace('/');
        }
      }

      toast({
        title: 'Board Deleted',
        description: `${boardName} and all its data have been deleted.`,
      });
    } catch (error) {
      let errorMessage = 'An unexpected error occurred.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: errorMessage,
      });
    }
  };

  const handleBoardUpdate = (updatedBoard: Board) => {
    const isOwned = ownedBoards.some((b) => b.board.id === updatedBoard.id);
    if (isOwned) {
      setOwnedBoards((prev) => prev.map((b) => (b.board.id === updatedBoard.id ? { ...b, board: updatedBoard } : b)));
    } else {
      setSharedBoards((prev) => prev.map((b) => (b.board.id === updatedBoard.id ? { ...b, board: updatedBoard } : b)));
    }

    if (activeBoard?.board.id === updatedBoard.id) {
      getBoardMembers(updatedBoard.id).then(setBoardMembers);
    }
  };

  const handleBoardLeft = (boardId: string) => {
    setSharedBoards((prev) => prev.filter((b) => b.board.id !== boardId));
    if (activeBoard?.board.id === boardId) {
      router.replace('/');
    }
  };
  // ------------------------------------------------

  // -------------------- Tasks --------------------
  const handleAddTask = async (
    taskData: Omit<Task, 'id' | 'completed' | 'boardId'>,
    newCategory?: Omit<Category, 'id'>
  ) => {
    if (!user || !activeBoard) return;

    let categoryId = taskData.categoryId;

    if (newCategory) {
      const newCatData = { ...newCategory, createdAt: Timestamp.now() };
      const docRef = await addDoc(collection(db, `boards/${activeBoard.board.id}/categories`), newCatData as any);
      const newCat: Category = { id: docRef.id, name: newCategory.name, color: newCategory.color };
      setCategories((prev) => [...prev, newCat]);
      categoryId = newCat.id;
      toast({
        title: 'Category Created',
        description: `New category "${newCategory.name}" has been created.`,
      });
    }

    const newTaskData = {
      ...taskData,
      categoryId,
      boardId: activeBoard.board.id,
      completed: false,
      createdAt: Timestamp.now(),
      // Write as Timestamp|null
      dueDate: toTimestamp(taskData.dueDate),
    };

    // Avoid writing empty optional fields
    if (!newTaskData.assigneeUid) delete (newTaskData as any).assigneeUid;
    if (!newTaskData.fileUrl) delete (newTaskData as any).fileUrl;
    if (!newTaskData.fileName) delete (newTaskData as any).fileName;

    const docRef = await addDoc(collection(db, `boards/${activeBoard.board.id}/tasks`), newTaskData as any);
    const newTask: Task = { ...newTaskData, id: docRef.id, dueDate: toDate(newTaskData.dueDate) } as Task;

    setTasks((prevTasks) => [newTask, ...prevTasks]);
  };

  const handleAiCreateTasks = async (aiResult: CreateTasksFromPromptOutput) => {
    if (!user || !activeBoard) return;

    const { category: aiCategory, tasks: aiTasks } = aiResult;
    let categoryId = categories.find((c) => c.name.toLowerCase() === aiCategory.name.toLowerCase())?.id;

    const batch = writeBatch(db);

    if (!categoryId) {
      const newCategoryRef = doc(collection(db, `boards/${activeBoard.board.id}/categories`));
      const newCategoryData = {
        name: aiCategory.name,
        color: 'bg-purple-500',
        createdAt: Timestamp.now(),
      };
      batch.set(newCategoryRef, newCategoryData as any);
      categoryId = newCategoryRef.id;
    }

    const newTasksForState: Task[] = [];
    aiTasks.forEach((task) => {
      const taskRef = doc(collection(db, `boards/${activeBoard.board.id}/tasks`));
      const newTaskData = {
        description: task.description,
        priority: task.priority,
        categoryId: categoryId!,
        boardId: activeBoard.board.id,
        completed: false,
        createdAt: Timestamp.now(),
        dueDate: null as Timestamp | null,
        fileName: '',
        fileUrl: '',
      };
      batch.set(taskRef, newTaskData);
      newTasksForState.push({ ...newTaskData, id: taskRef.id, dueDate: null } as unknown as Task);
    });

    await batch.commit();

    if (!categories.some((c) => c.id === categoryId)) {
      const newCategory: Category = {
        id: categoryId!,
        name: aiCategory.name,
        color: 'bg-purple-500',
      };
      setCategories((prev) => [...prev, newCategory]);
    }
    setTasks((prev) => [...newTasksForState, ...prev]);

    toast({
      title: 'AI Tasks Created',
      description: `Created category "${aiCategory.name}" and ${aiTasks.length} tasks.`,
    });
  };

  const handleEditTask = async (updatedTask: Task) => {
    if (!user || !activeBoard) return;
    const taskRef = doc(db, `boards/${activeBoard.board.id}/tasks`, updatedTask.id);
    const { id, dueDate, ...rest } = updatedTask;

    // Prepare update payload: dueDate must be Timestamp|null if provided
    const dataToUpdate: Partial<Omit<Task, 'dueDate'>> & { dueDate?: Timestamp | null } = {
      ...(rest as any),
    };

    const convertedDue = toTimestamp(dueDate);
    // Only include the key if it was present in the input, to avoid unintended overwrites
    dataToUpdate.dueDate = convertedDue;

    // Avoid writing empty optional fields
    if (!('assigneeUid' in dataToUpdate) || !dataToUpdate.assigneeUid) delete (dataToUpdate as any).assigneeUid;
    if (!('fileUrl' in dataToUpdate) || !dataToUpdate.fileUrl) delete (dataToUpdate as any).fileUrl;
    if (!('fileName' in dataToUpdate) || !dataToUpdate.fileName) delete (dataToUpdate as any).fileName;

    await updateDoc(taskRef, dataToUpdate as any);

    // Keep UI as Date|null
    setTasks((prevTasks) =>
      prevTasks.map((task) => (task.id === updatedTask.id ? { ...updatedTask, dueDate: toDate(dueDate) } : task))
    );
    toast({
      title: 'Task Updated',
      description: 'Your task has been successfully updated.',
    });
  };

  const handleToggleComplete = async (id: string) => {
    if (!user || !activeBoard) return;
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const taskRef = doc(db, `boards/${activeBoard.board.id}/tasks`, id);
    await updateDoc(taskRef, { completed: !task.completed });

    setTasks((prevTasks) => prevTasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
  };

  const handleDeleteTask = async (id: string) => {
    if (!user || !activeBoard) return;
    await deleteDoc(doc(db, `boards/${activeBoard.board.id}/tasks`, id));
    setTasks((prevTasks) => prevTasks.filter((task) => task.id !== id));
  };
  // ------------------------------------------------

  // -------------------- Categories --------------------
  const handleEditCategory = async (categoryId: string, newName: string, newColor: string) => {
    if (!user || !activeBoard) return;
    const categoryRef = doc(db, `boards/${activeBoard.board.id}/categories`, categoryId);
    await updateDoc(categoryRef, { name: newName, color: newColor });

    setCategories((prevCategories) =>
      prevCategories.map((cat) => (cat.id === categoryId ? { ...cat, name: newName, color: newColor } : cat))
    );
  };

  const handleDeleteCategory = async (categoryToDeleteId: string) => {
    if (!user || !activeBoard) return;
    const categoryName = categories.find((c) => c.id === categoryToDeleteId)?.name ?? '';

    const batch = writeBatch(db);
    const categoryRef = doc(db, `boards/${activeBoard.board.id}/categories`, categoryToDeleteId);
    batch.delete(categoryRef);

    const tasksToDeleteQuery = query(
      collection(db, `boards/${activeBoard.board.id}/tasks`),
      where('categoryId', '==', categoryToDeleteId)
    );
    const tasksSnapshot = await getDocs(tasksToDeleteQuery);
    tasksSnapshot.docs.forEach((d) => batch.delete(d.ref));

    await batch.commit();

    setTasks((prevTasks) => prevTasks.filter((task) => task.categoryId !== categoryToDeleteId));
    setCategories((prevCategories) => prevCategories.filter((cat) => cat.id !== categoryToDeleteId));
    toast({
      title: 'Category Deleted',
      description: `Category "${categoryName}" and all its tasks have been deleted.`,
    });
  };
  // ------------------------------------------------

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Sign out failed:', error);
      toast({
        variant: 'destructive',
        title: 'Sign Out Failed',
        description: 'An error occurred while signing out.',
      });
    }
  };

  const handleInvitationAction = async (action: 'accept' | 'decline', invitation: BoardInvitation) => {
    if (!user) return;
    try {
      if (action === 'accept') {
        await acceptBoardInvitation({ invitationId: invitation.id });
        toast({
          title: 'Invitation Accepted',
          description: `You have successfully joined the board "${invitation.boardName}".`,
        });
        fetchBoardsAndInvitations();
      } else {
        await declineBoardInvitation({ invitationId: invitation.id });
        toast({
          title: 'Invitation Declined',
          description: 'You have declined the invitation.',
        });
      }
      setInvitations((prev) => prev.filter((i) => i.id !== invitation.id));
    } catch (error) {
      let errorMessage = 'An unexpected error occurred.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({
        variant: 'destructive',
        title: `Failed to ${action} invitation`,
        description: errorMessage,
      });
    }
  };

  if (isLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isReadOnly = activeBoard?.role === 'viewer';

  const renderContent = () => {
    if (ownedBoards.length === 0 && sharedBoards.length === 0 && invitations.length === 0) {
      return <NoBoards onAddBoardClick={() => setIsAddBoardOpen(true)} />;
    }

    if (isDataLoading) {
      return (
        <div className="flex h-full flex-grow items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    if (!activeBoard) {
      return (
        <div className="flex h-full flex-grow items-center justify-center p-8 text-center">
          <div>
            <h2 className="text-2xl font-semibold">Welcome to TaskFlow!</h2>
            <p className="mt-2 text-muted-foreground">
              Select a board from the sidebar to get started, or check your invitations.
            </p>
          </div>
        </div>
      );
    }

    return (
      <>
        <h1 className="text-2xl font-bold">{activeBoard.board.name || 'ForDo'}</h1>
        {!isReadOnly && <AiTaskCreator onCreateTasks={handleAiCreateTasks} />}
        <TaskList
          tasks={tasks}
          categories={categories}
          boardMembers={boardMembers}
          onToggleComplete={handleToggleComplete}
          onDeleteTask={handleDeleteTask}
          onEditTask={handleEditTask}
          onEditCategory={handleEditCategory}
          onDeleteCategory={handleDeleteCategory}
          onAddTask={handleOpenAddTaskDialog}
          isReadOnly={isReadOnly}
        />
      </>
    );
  };

  const renderBoardMenuItem = (boardWithRole: BoardWithRole) => {
    const { board, role } = boardWithRole;
    const canEdit = role === 'owner' || role === 'editor';
    return (
      <SidebarMenuItem key={board.id}>
        <SidebarMenuButton
          isActive={board.id === activeBoard?.board.id}
          onClick={() => router.push(`${pathname}?board=${board.id}`)}
        >
          <DynamicIcon name={board.icon || 'KanbanSquare'} />
          <span>{board.name}</span>
        </SidebarMenuButton>
        {canEdit && (
          <SidebarMenuAction showOnHover onClick={() => handleOpenEditBoardDialog(board)}>
            <Pencil />
          </SidebarMenuAction>
        )}
      </SidebarMenuItem>
    );
  };

  return (
    <SidebarProvider>
      <SidebarRail />
      <Sidebar>
        <SidebarHeader>
          <Logo />
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => setIsAddBoardOpen(true)}>
                <PlusCircle />
                <span>New Board</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <SidebarSeparator />

          <SidebarGroup>
            <SidebarGroupLabel>My Boards</SidebarGroupLabel>
            <SidebarMenu>
              {ownedBoards.length > 0 ? (
                ownedBoards.map(renderBoardMenuItem)
              ) : (
                <p className="px-2 text-xs text-muted-foreground">No boards created yet.</p>
              )}
            </SidebarMenu>
          </SidebarGroup>

          {sharedBoards.length > 0 && (
            <SidebarGroup>
              <SidebarGroupLabel>Shared With Me</SidebarGroupLabel>
              <SidebarMenu>{sharedBoards.map(renderBoardMenuItem)}</SidebarMenu>
            </SidebarGroup>
          )}
        </SidebarContent>
        <SidebarFooter></SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <div className="flex min-h-screen w-full flex-col">
          <Header
            onAddTaskClick={() => handleOpenAddTaskDialog()}
            onSignOut={handleSignOut}
            onShareClick={() => setIsShareBoardOpen(true)}
            isBoardSelected={!!activeBoard}
            isReadOnly={isReadOnly}
            invitations={invitations}
            onInvitationAction={handleInvitationAction}
          />
          <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 container mx-auto">{renderContent()}</main>
        </div>
      </SidebarInset>
      <AddTaskDialog
        isOpen={isAddTaskOpen}
        onOpenChange={setIsAddTaskOpen}
        onAddTask={handleAddTask}
        categories={categories}
        boardMembers={boardMembers}
        defaultCategoryId={defaultCategory}
        user={user}
      />
      <AddBoardDialog
        isOpen={isAddBoardOpen}
        onOpenChange={setIsAddBoardOpen}
        onAddBoard={handleAddBoard}
        existingBoardCount={[...ownedBoards, ...sharedBoards].length}
      />
      {editingBoard && user && (
        <EditBoardDialog
          isOpen={isEditBoardOpen}
          onOpenChange={(isOpen) => {
            setIsEditBoardOpen(isOpen);
            if (!isOpen) setEditingBoard(null);
          }}
          onEditBoard={handleEditBoard}
          onDeleteBoard={handleDeleteBoard}
          board={editingBoard}
        />
      )}
      {activeBoard && user && (
        <ShareBoardDialog
          isOpen={isShareBoardOpen}
          onOpenChange={setIsShareBoardOpen}
          board={activeBoard.board}
          members={boardMembers}
          onBoardUpdate={handleBoardUpdate}
          onMemberLeft={handleBoardLeft}
        />
      )}
    </SidebarProvider>
  );
}
