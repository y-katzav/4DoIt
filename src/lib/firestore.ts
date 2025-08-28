// 🔧 Firebase Initialization
'use client';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';
import { getFirestore, collection, query, where, getDocs, doc, updateDoc, writeBatch, getDoc, deleteDoc, documentId, setDoc, Timestamp } from 'firebase/firestore';
import { deleteField } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth } from 'firebase/auth';
import type { Board, BoardMember, BoardRole, BoardInvitation, BoardAccess, User } from './types';

const firebaseConfig = {
  projectId: 'taskflow-cw8ac',
  appId: '1:122132247972:web:b80c1534f978b72998fd31',
  storageBucket: 'taskflow-cw8ac.firebasestorage.app',
  apiKey: 'AIzaSyCU17Pv19z7hZ9y8ft1Wdbt39F4OC5Q97s',
  authDomain: 'taskflow-cw8ac.firebaseapp.com',
  measurementId: '',
  messagingSenderId: '122132247972'
};

export const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(firebaseApp);
export const auth = getAuth(firebaseApp);
export const storage = getStorage(firebaseApp);
const functions = getFunctions(firebaseApp);

/**
 * וידוא שהמשתמש קיים בקולקציה users
 * נוצר אוטומטית כאשר המשתמש נכנס לראשונה
 */
export async function ensureUserExists(user: { uid: string; email: string | null; displayName: string | null }): Promise<void> {
  try {
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      console.log('[ensureUserExists] Creating user document for:', user.uid);
      await setDoc(userDocRef, {
        email: user.email,
        displayName: user.displayName || user.email?.split('@')[0] || 'User',
        createdAt: Timestamp.now(),
      });
      console.log('[ensureUserExists] User document created successfully');
    } else {
      console.log('[ensureUserExists] User document already exists');
    }
  } catch (error) {
    console.error('[ensureUserExists] Error:', error);
    // אל תזרוק שגיאה כי זה לא קריטי לפונקציונליות הבסיסית
  }
}

// 📤 Callable Cloud Functions
const shareBoardCallable = httpsCallable(functions, 'shareBoard');
const acceptBoardInvitationCallable = httpsCallable<{ invitationId: string }, void>(functions, 'acceptBoardInvitation');
const declineBoardInvitationCallable = httpsCallable<{ invitationId: string }, void>(functions, 'declineBoardInvitation');
const getBoardMembersCallable = httpsCallable<{ boardId: string }, { members: BoardMember[] }>(functions, 'getBoardMembers');
const deleteBoardCallable = httpsCallable<{ boardId: string }, { success: boolean; message: string }>(functions, 'deleteBoard');
const cleanupCorruptedBoardsCallable = httpsCallable<{}, { 
  success: boolean; 
  scannedCount: number; 
  deletedBoardsCount: number; 
  cleanedMembershipsCount: number; 
  deletedBoards: string[]; 
  duration: number;
}>(functions, 'cleanupCorruptedBoards');

export async function shareBoardViaFunction(boardId: string, recipientEmail: string, role: BoardRole): Promise<void> {
  console.log('[shareBoardViaFunction] called with:', { boardId, recipientEmail, role });
  try {
    await shareBoardCallable({ boardId, recipientEmail, role });
  } catch (error: unknown) {
    console.error('[shareBoardViaFunction] Error:', error);
    if (error instanceof Error) throw error;
    throw new Error('Unexpected error in shareBoardViaFunction');
  }
}

export async function acceptBoardInvitation(data: { invitationId: string }): Promise<void> {
  console.log('[acceptBoardInvitation] called with:', data);
  try {
    await acceptBoardInvitationCallable(data);
  } catch (error: unknown) {
    console.error('[acceptBoardInvitation] Error:', error);
    if (error instanceof Error) throw error;
    throw new Error('Unexpected error in acceptBoardInvitation');
  }
}

export async function declineBoardInvitation(data: { invitationId: string }): Promise<void> {
  console.log('[declineBoardInvitation] called with:', data);
  try {
    await declineBoardInvitationCallable(data);
  } catch (error: unknown) {
    console.error('[declineBoardInvitation] Error:', error);
    if (error instanceof Error) throw error;
    throw new Error('Unexpected error in declineBoardInvitation');
  }
}

// 📥 Firestore Board Queries
export async function getOwnedBoards(userId: string): Promise<Board[]> {
  console.log('[getOwnedBoards] called with userId:', userId);
  const q = query(collection(db, 'boards'), where('ownerId', '==', userId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Board));
}

export async function getSharedBoards(userId: string): Promise<{ board: Board, role: BoardRole }[]> {
  console.log('[getSharedBoards] called with userId:', userId);
  
  try {
    const sharedBoardsRef = collection(db, `users/${userId}/boardMemberships`);
    console.log('[getSharedBoards] querying collection path:', `users/${userId}/boardMemberships`);
    
    const sharedBoardsSnap = await getDocs(sharedBoardsRef);
    console.log('[getSharedBoards] query result - empty:', sharedBoardsSnap.empty, 'size:', sharedBoardsSnap.size);

    if (sharedBoardsSnap.empty) {
      console.log('[getSharedBoards] no shared boards found, returning empty array');
      return [];
    }

    const boardDataPromises = sharedBoardsSnap.docs.map(async (docSnap) => {
      const membership = docSnap.data();
      console.log('[getSharedBoards] processing membership for board:', docSnap.id, 'role:', membership.role);
      
      // סנן רק לוחות שהמשתמש לא הבעלים שלהם
      if (membership.role === 'owner') {
        console.log('[getSharedBoards] skipping owned board:', docSnap.id);
        return null;
      }
      
      const boardDocRef = doc(db, 'boards', docSnap.id);
      const boardDocSnap = await getDoc(boardDocRef);

      if (boardDocSnap.exists()) {
        console.log('[getSharedBoards] board found:', docSnap.id);
        return {
          board: { id: boardDocSnap.id, ...boardDocSnap.data() } as Board,
          role: membership.role as BoardRole,
        };
      } else {
        console.log('[getSharedBoards] board not found:', docSnap.id);
      }
      return null;
    });

    const results = await Promise.all(boardDataPromises);
    const filteredResults = results.filter((r): r is { board: Board; role: BoardRole } => r !== null);
    console.log('[getSharedBoards] final results count:', filteredResults.length);
    return filteredResults;
  } catch (error) {
    console.error('[getSharedBoards] error:', error);
    throw error;
  }
}

export async function getBoardMembers(boardId: string): Promise<BoardMember[]> {
  console.log('[getBoardMembers] called with boardId:', boardId);
  
  try {
    const result = await getBoardMembersCallable({ boardId });
    console.log('[getBoardMembers] Cloud Function returned', result.data.members.length, 'members');
    return result.data.members;
  } catch (error: unknown) {
    console.error('[getBoardMembers] Cloud Function error:', error);
    
    // במקרה של שגיאה, נחזיר רשימה ריקה במקום לזרוק שגיאה
    // כך האפליקציה לא תיקרס אלא פשוט תציג לוח ללא חברים
    return [];
  }
}

// ⚙️ Board Management
export async function updateBoardDetails(boardId: string, newName: string, newIcon: string): Promise<Board> {
  console.log('[updateBoardDetails] called with:', { boardId, newName, newIcon });
  const boardRef = doc(db, 'boards', boardId);
  await updateDoc(boardRef, { name: newName, icon: newIcon });
  const updatedSnap = await getDoc(boardRef);
  if (!updatedSnap.exists()) throw new Error('Board not found after update.');
  return { id: updatedSnap.id, ...updatedSnap.data() } as Board;
}

export async function deleteBoard(boardId: string): Promise<void> {
  console.log('[deleteBoard] called with boardId:', boardId);
  
  try {
    const result = await deleteBoardCallable({ boardId });
    console.log('[deleteBoard] Cloud Function success:', result.data.message);
  } catch (error: unknown) {
    console.error('[deleteBoard] Cloud Function error:', error);
    if (error instanceof Error) throw error;
    throw new Error('Unexpected error in deleteBoard');
  }
}

// 👥 Role & Membership Management
export async function updateUserRole(boardId: string, memberUid: string, newRole: BoardRole): Promise<void> {
  console.log('[updateUserRole] called with:', { boardId, memberUid, newRole });
  await updateDoc(doc(db, 'boards', boardId), {
    [`members.${memberUid}`]: newRole,
  });
  await updateDoc(doc(db, `users/${memberUid}/boardMemberships`, boardId), {
    role: newRole,
  });
}

export async function removeMemberFromBoard(boardId: string, memberUid: string): Promise<void> {
  console.log('[removeMemberFromBoard] called with:', { boardId, memberUid });
  const batch = writeBatch(db);
  batch.update(doc(db, 'boards', boardId), {
    [`members.${memberUid}`]: deleteField(),
  });
  batch.delete(doc(db, `users/${memberUid}/boardMemberships`, boardId));
  await batch.commit();
}

// 📨 Invitations
export async function getPendingInvitations(userEmail: string): Promise<BoardInvitation[]> {
  console.log('[getPendingInvitations] called with userEmail:', userEmail);
  const q = query(
    collection(db, 'boardInvitations'),
    where('recipientEmail', '==', userEmail),
    where('status', '==', 'pending')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as BoardInvitation));
}

// 📥 New Board Query Implementation via boardMemberships

/**
 * שליפת כל הלוחות של המשתמש דרך boardMemberships
 * גישה יעילה יותר - מתחילה מהמשתמש במקום לחפש בכל הלוחות
 */
export async function getUserBoardsViaMemberships(userId: string): Promise<{ board: Board, role: BoardRole }[]> {
  console.log('[getUserBoardsViaMemberships] called with userId:', userId);
  
  // בדיקת פרמטרים
  if (!userId || typeof userId !== 'string') {
    throw new Error('Invalid userId provided');
  }

  try {
    // קודם נבדוק אם המשתמש קיים בכלל
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      console.log('[getUserBoardsViaMemberships] user document does not exist, returning empty array');
      return [];
    }

    // שלב 1: שליפת תת-אוסף boardMemberships של המשתמש
    const membershipQuery = query(collection(db, 'users', userId, 'boardMemberships'));
    const membershipSnapshot = await getDocs(membershipQuery);
    
    console.log('[getUserBoardsViaMemberships] found boardMemberships:', membershipSnapshot.size);
    
    if (membershipSnapshot.empty) {
      console.log('[getUserBoardsViaMemberships] no board memberships found');
      return [];
    }    // שלב 2: איסוף board IDs ותפקידים עם בדיקות
    const boardMemberships: { [boardId: string]: BoardRole } = {};
    membershipSnapshot.docs.forEach(doc => {
      const data = doc.data();
      // בדיקה שקיים role ושהוא תקין
      if (data.role && ['owner', 'editor', 'viewer'].includes(data.role)) {
        boardMemberships[doc.id] = data.role as BoardRole;
      } else {
        console.warn('[getUserBoardsViaMemberships] invalid role for board:', doc.id, 'role:', data.role);
      }
    });
    
    // שלב 3: שליפת פרטי הלוחות
    const boardIds = Object.keys(boardMemberships);
    if (boardIds.length === 0) {
      console.log('[getUserBoardsViaMemberships] no valid board memberships found');
      return [];
    }
    
    const results: { board: Board, role: BoardRole }[] = [];
    
    // Firestore 'in' queries support max 10 items, so chunk if needed
    const chunks: string[][] = [];
    for (let i = 0; i < boardIds.length; i += 10) {
      chunks.push(boardIds.slice(i, i + 10));
    }
    
    const foundBoardIds = new Set<string>();
    const orphanedMemberships: string[] = [];
    
    for (const chunk of chunks) {
      if (chunk.length === 0) continue; // דילוג על חלקים ריקים
      
      const boardsQuery = query(
        collection(db, 'boards'),
        where(documentId(), 'in', chunk)
      );
      
      try {
        const boardsSnapshot = await getDocs(boardsQuery);
        console.log('[getUserBoardsViaMemberships] fetched', boardsSnapshot.size, 'boards for chunk of', chunk.length);
        
        // סימון לוחות שנמצאו
        boardsSnapshot.docs.forEach(boardDoc => {
          foundBoardIds.add(boardDoc.id);
          
          const boardData = boardDoc.data();
          // בדיקה מקיפה יותר שנתוני הלוח תקינים
          if (boardData && 
              boardData.name && 
              boardData.icon && 
              boardData.ownerId &&
              typeof boardData.name === 'string' &&
              typeof boardData.icon === 'string' &&
              typeof boardData.ownerId === 'string') {
            
            const board = { id: boardDoc.id, ...boardData } as Board;
            const role = boardMemberships[boardDoc.id];
            
            console.log('[getUserBoardsViaMemberships] valid board:', board.name, 'role:', role);
            results.push({ board, role });
          } else {
            // לוח קיים אבל חסרים לו שדות חיוניים - זה לוח פגום
            console.warn('[getUserBoardsViaMemberships] corrupted board found:', boardDoc.id, {
              hasName: !!boardData?.name,
              hasIcon: !!boardData?.icon, 
              hasOwner: !!boardData?.ownerId,
              nameType: typeof boardData?.name,
              iconType: typeof boardData?.icon,
              ownerType: typeof boardData?.ownerId,
              isOwner: boardData?.ownerId === userId
            });
            
            // אם המשתמש הוא הבעלים של הלוח הפגום - הוא יצטרך לתקן אותו בעצמו
            // אם הוא לא הבעלים - נמחק את ה-membership שלו מהלוח הפגום
            // אבל רק אם יש ownerId בכלל - אחרת לא נוכל לדעת מי הבעלים
            if (boardData?.ownerId && boardData.ownerId !== userId) {
              console.log('[getUserBoardsViaMemberships] user is not owner of corrupted board, will cleanup membership:', boardDoc.id);
              orphanedMemberships.push(boardDoc.id);
            } else if (boardData?.ownerId === userId) {
              console.log('[getUserBoardsViaMemberships] user owns corrupted board, keeping membership for manual cleanup:', boardDoc.id);
              // אפשר להוסיף התראה למשתמש כאן בעתיד
            } else {
              // אין ownerId בכלל - לא נוכל לדעת מי הבעלים, לא נמחק membership
              console.warn('[getUserBoardsViaMemberships] corrupted board with no ownerId - cannot determine ownership, keeping membership:', boardDoc.id);
            }
          }
        });
        
      } catch (error) {
        console.error('[getUserBoardsViaMemberships] error fetching boards chunk:', chunk, error);
        // אם יש שגיאה בשליפת חלק מהלוחות, נמשיך עם השאר
        // אבל נסמן את כל הלוחות בחלק הזה כיתומים
        chunk.forEach(boardId => {
          console.warn('[getUserBoardsViaMemberships] failed to fetch board, marking as orphaned:', boardId);
          orphanedMemberships.push(boardId);
        });
      }
      
      // זיהוי לוחות שלא נמצאו בכלל (נמחקו)
      chunk.forEach(boardId => {
        if (!foundBoardIds.has(boardId)) {
          console.warn('[getUserBoardsViaMemberships] board not found (deleted?):', boardId);
          orphanedMemberships.push(boardId);
        }
      });
    }
    
    // ניקוי memberships יתומים ברקע (לא חוסם את הפונקציה)
    if (orphanedMemberships.length > 0) {
      console.log('[getUserBoardsViaMemberships] found', orphanedMemberships.length, 'orphaned memberships, cleaning up...');
      
      // ניקוי ברקע - לא נחכה לסיום כדי לא לעכב את הפונקציה
      const cleanupBatch = writeBatch(db);
      orphanedMemberships.forEach(boardId => {
        const membershipRef = doc(db, 'users', userId, 'boardMemberships', boardId);
        cleanupBatch.delete(membershipRef);
      });
      
      cleanupBatch.commit().then(() => {
        console.log('[getUserBoardsViaMemberships] cleaned up', orphanedMemberships.length, 'orphaned memberships');
      }).catch(error => {
        console.warn('[getUserBoardsViaMemberships] failed to cleanup orphaned memberships:', error);
      });
    }
    
    console.log('[getUserBoardsViaMemberships] returning', results.length, 'boards total');
    return results;
    
  } catch (error) {
    console.error('[getUserBoardsViaMemberships] error:', error);
    // זרוק שגיאה מפורטת יותר
    if (error instanceof Error) {
      throw new Error(`Failed to get user boards: ${error.message}`);
    }
    throw new Error('Unexpected error getting user boards');
  }
}

/**
 * זיהוי לוחות פגומים שהמשתמש בעלים שלהם
 * מחזיר רשימה של לוחות שיש להם ID אבל חסרים שדות חיוניים
 */
export async function getUserCorruptedBoards(userId: string): Promise<{
  boardId: string;
  issues: string[];
}[]> {
  console.log('[getUserCorruptedBoards] called with userId:', userId);
  
  if (!userId || typeof userId !== 'string') {
    throw new Error('Invalid userId provided');
  }

  try {
    // שליפת כל הלוחות של המשתמש (שהוא בעלים שלהם)
    const boardsQuery = query(collection(db, 'boards'), where('ownerId', '==', userId));
    const boardsSnapshot = await getDocs(boardsQuery);
    
    const corruptedBoards: { boardId: string; issues: string[] }[] = [];
    
    boardsSnapshot.docs.forEach(boardDoc => {
      const boardData = boardDoc.data();
      const issues: string[] = [];
      
      // בדיקת שדות חיוניים
      if (!boardData) {
        issues.push('Board data is null/undefined');
      } else {
        if (!boardData.name || typeof boardData.name !== 'string' || boardData.name.trim() === '') {
          issues.push('Missing or invalid name field');
        }
        if (!boardData.icon || typeof boardData.icon !== 'string' || boardData.icon.trim() === '') {
          issues.push('Missing or invalid icon field');
        }
        if (!boardData.ownerId || typeof boardData.ownerId !== 'string' || boardData.ownerId.trim() === '') {
          issues.push('Missing or invalid ownerId field');
        }
        if (!boardData.createdAt) {
          issues.push('Missing createdAt field');
        }
      }
      
      if (issues.length > 0) {
        console.warn('[getUserCorruptedBoards] found corrupted board:', boardDoc.id, 'issues:', issues);
        corruptedBoards.push({
          boardId: boardDoc.id,
          issues
        });
      }
    });
    
    console.log('[getUserCorruptedBoards] found', corruptedBoards.length, 'corrupted boards');
    return corruptedBoards;
    
  } catch (error) {
    console.error('[getUserCorruptedBoards] error:', error);
    return [];
  }
}

/**
 * שליפת לוחות בבעלות המשתמש (via boardMemberships)
 */
export async function getOwnedBoardsViaMemberships(userId: string): Promise<Board[]> {
  console.log('[getOwnedBoardsViaMemberships] called with userId:', userId);
  const allBoards = await getUserBoardsViaMemberships(userId);
  const ownedBoards = allBoards
    .filter(item => item.role === 'owner')
    .map(item => item.board);
  console.log('[getOwnedBoardsViaMemberships] found', ownedBoards.length, 'owned boards');
  return ownedBoards;
}

/**
 * שליפת לוחות שהמשתמש חבר בהם (לא בעלים) (via boardMemberships)
 */
export async function getSharedBoardsViaMemberships(userId: string): Promise<{ board: Board, role: BoardRole }[]> {
  console.log('[getSharedBoardsViaMemberships] called with userId:', userId);
  const allBoards = await getUserBoardsViaMemberships(userId);
  const sharedBoards = allBoards.filter(item => item.role !== 'owner');
  console.log('[getSharedBoardsViaMemberships] found', sharedBoards.length, 'shared boards');
  return sharedBoards;
}

/**
 * עדכון boardMemberships של המשתמש כאשר נוסף ללוח או השתנה תפקידו
 */
export async function updateUserBoardMembership(userId: string, boardId: string, role: BoardRole, boardName?: string): Promise<void> {
  console.log('[updateUserBoardMembership] called with:', { userId, boardId, role, boardName });
  const membershipDocRef = doc(db, 'users', userId, 'boardMemberships', boardId);
  await setDoc(membershipDocRef, {
    boardName: boardName || '',
    role,
    updatedAt: Timestamp.now(),
  });
  console.log('[updateUserBoardMembership] updated membership');
}

/**
 * הסרת boardMembership של המשתמש כאשר הוסר מהלוח
 */
export async function removeUserBoardMembership(userId: string, boardId: string): Promise<void> {
  console.log('[removeUserBoardMembership] called with:', { userId, boardId });
  const membershipDocRef = doc(db, 'users', userId, 'boardMemberships', boardId);
  await deleteDoc(membershipDocRef);
  console.log('[removeUserBoardMembership] removed membership');
}

/**
 * ניקוי boardMemberships של המשתמש - מסיר הפניות ללוחות שלא קיימים יותר
 */
export async function cleanupUserBoardMemberships(userId: string): Promise<number> {
  console.log('[cleanupUserBoardMemberships] called with userId:', userId);
  
  try {
    // שלב 1: שליפת כל ה-boardMemberships
    const membershipQuery = query(collection(db, 'users', userId, 'boardMemberships'));
    const membershipSnapshot = await getDocs(membershipQuery);
    
    if (membershipSnapshot.empty) {
      console.log('[cleanupUserBoardMemberships] no memberships to clean');
      return 0;
    }

    const boardIds = membershipSnapshot.docs.map(doc => doc.id);
    console.log('[cleanupUserBoardMemberships] checking', boardIds.length, 'board memberships');

    // שלב 2: בדיקה אילו לוחות קיימים בפועל
    const existingBoardIds = new Set<string>();
    
    // חלוקה לחלקים של 10 (הגבלת Firestore)
    const chunks: string[][] = [];
    for (let i = 0; i < boardIds.length; i += 10) {
      chunks.push(boardIds.slice(i, i + 10));
    }
    
    for (const chunk of chunks) {
      const boardsQuery = query(
        collection(db, 'boards'),
        where(documentId(), 'in', chunk)
      );
      
      const boardsSnapshot = await getDocs(boardsQuery);
      boardsSnapshot.docs.forEach(boardDoc => {
        existingBoardIds.add(boardDoc.id);
      });
    }

    // שלב 3: מחיקת memberships ללוחות שלא קיימים
    const batch = writeBatch(db);
    let cleanedCount = 0;

    boardIds.forEach(boardId => {
      if (!existingBoardIds.has(boardId)) {
        const membershipDocRef = doc(db, 'users', userId, 'boardMemberships', boardId);
        batch.delete(membershipDocRef);
        cleanedCount++;
        console.log('[cleanupUserBoardMemberships] scheduled deletion of membership for non-existent board:', boardId);
      }
    });

    if (cleanedCount > 0) {
      await batch.commit();
      console.log('[cleanupUserBoardMemberships] cleaned', cleanedCount, 'invalid memberships');
    } else {
      console.log('[cleanupUserBoardMemberships] no cleanup needed');
    }

    return cleanedCount;
    
  } catch (error) {
    console.error('[cleanupUserBoardMemberships] error:', error);
    return 0; // אל תזרוק שגיאה, פשוט החזר 0
  }
}

/**
 * ניקוי לוחות פגומים - מוחק לוחות שחסרים להם שדות חיוניים
 * 🔒 SECURITY: פונקציה זו יכולה למחוק רק לוחות של המשתמש הנוכחי
 * עבור ניקוי כלל-מערכתי, צריך Cloud Function עם הרשאות אדמין
 */
export async function cleanupCorruptedBoards(userId: string): Promise<{
  scannedCount: number;
  deletedCount: number;
  deletedBoards: string[];
}> {
  console.log('[cleanupCorruptedBoards] called with userId:', userId);
  
  // 🔒 בדיקת אבטחה: חובה לספק userId
  if (!userId || typeof userId !== 'string') {
    throw new Error('userId is required for security reasons - can only cleanup own boards');
  }
  
  try {
    // 🔒 סרוק רק לוחות של המשתמש הנוכחי
    const boardsQuery = query(collection(db, 'boards'), where('ownerId', '==', userId));
    
    const boardsSnapshot = await getDocs(boardsQuery);
    console.log('[cleanupCorruptedBoards] scanning', boardsSnapshot.size, 'boards');
    
    const corruptedBoards: string[] = [];
    const batch = writeBatch(db);
    
    // זיהוי לוחות פגומים
    boardsSnapshot.docs.forEach(boardDoc => {
      const boardData = boardDoc.data();
      const isCorrupted = !boardData ||
                         !boardData.name ||
                         !boardData.icon ||
                         !boardData.ownerId ||
                         typeof boardData.name !== 'string' ||
                         typeof boardData.icon !== 'string' ||
                         typeof boardData.ownerId !== 'string' ||
                         boardData.name.trim() === '' ||
                         boardData.icon.trim() === '' ||
                         boardData.ownerId.trim() === '';
      
      if (isCorrupted) {
        console.warn('[cleanupCorruptedBoards] found corrupted board:', boardDoc.id, {
          hasName: !!boardData?.name,
          hasIcon: !!boardData?.icon,
          hasOwner: !!boardData?.ownerId,
          nameType: typeof boardData?.name,
          iconType: typeof boardData?.icon,
          ownerType: typeof boardData?.ownerId,
          nameEmpty: boardData?.name?.trim() === '',
          iconEmpty: boardData?.icon?.trim() === '',
          ownerEmpty: boardData?.ownerId?.trim() === ''
        });
        
        corruptedBoards.push(boardDoc.id);
        batch.delete(boardDoc.ref);
      }
    });
    
    // מחיקת לוחות פגומים
    if (corruptedBoards.length > 0) {
      await batch.commit();
      console.log('[cleanupCorruptedBoards] deleted', corruptedBoards.length, 'corrupted boards:', corruptedBoards);
      
      // ניקוי boardMemberships של הלוחות הפגומים - רק של המשתמש הנוכחי
      if (corruptedBoards.length > 0) {
        console.log('[cleanupCorruptedBoards] cleaning memberships for deleted boards...');
        const cleanupBatch = writeBatch(db);
        
        // מחיקת ה-membership של המשתמש הנוכחי מהלוחות הפגומים שנמחקו
        for (const boardId of corruptedBoards) {
          try {
            const membershipRef = doc(db, 'users', userId, 'boardMemberships', boardId);
            cleanupBatch.delete(membershipRef);
            console.log('[cleanupCorruptedBoards] scheduled cleanup of membership for board:', boardId);
          } catch (error) {
            console.warn('[cleanupCorruptedBoards] failed to clean membership for board:', boardId, error);
          }
        }
        
        try {
          await cleanupBatch.commit();
          console.log('[cleanupCorruptedBoards] cleaned memberships for corrupted boards');
        } catch (error) {
          console.warn('[cleanupCorruptedBoards] failed to clean some memberships:', error);
        }
      }
    } else {
      console.log('[cleanupCorruptedBoards] no corrupted boards found');
    }
    
    return {
      scannedCount: boardsSnapshot.size,
      deletedCount: corruptedBoards.length,
      deletedBoards: corruptedBoards
    };
    
  } catch (error) {
    console.error('[cleanupCorruptedBoards] error:', error);
    return {
      scannedCount: 0,
      deletedCount: 0,
      deletedBoards: []
    };
  }
}

/**
 * פונקצית ניקוי כללית - מריצה את כל פונקציות הניקוי
 */
export async function performMaintenanceCleanup(userId: string): Promise<{
  invalidMemberships: number;
  corruptedBoards: {
    scannedCount: number;
    deletedCount: number;
    deletedBoards: string[];
  };
}> {
  console.log('[performMaintenanceCleanup] starting maintenance for user:', userId);
  
  try {
    // שלב 1: ניקוי boardMemberships מיותרים
    const invalidMemberships = await cleanupUserBoardMemberships(userId);
    
    // שלב 2: ניקוי לוחות פגומים של המשתמש
    const corruptedBoards = await cleanupCorruptedBoards(userId);
    
    console.log('[performMaintenanceCleanup] maintenance completed:', {
      invalidMemberships,
      corruptedBoards
    });
    
    return {
      invalidMemberships,
      corruptedBoards
    };
    
  } catch (error) {
    console.error('[performMaintenanceCleanup] error during maintenance:', error);
    return {
      invalidMemberships: 0,
      corruptedBoards: {
        scannedCount: 0,
        deletedCount: 0,
        deletedBoards: []
      }
    };
  }
}

/**
 * 🔧 ADMIN FUNCTION: ניקוי כלל-מערכתי של לוחות פגומים
 * פונקציה זו קוראת ל-Cloud Function שרץ עם הרשאות אדמין
 * ⚠️ זהירות: פונקציה מנהלתית שצריך להריץ בזהירות!
 */
export async function performSystemWideCleanup(): Promise<{
  success: boolean;
  scannedCount: number;
  deletedBoardsCount: number;
  cleanedMembershipsCount: number;
  deletedBoards: string[];
  duration: number;
}> {
  console.log('[performSystemWideCleanup] calling admin Cloud Function...');
  
  try {
    const result = await cleanupCorruptedBoardsCallable({});
    console.log('[performSystemWideCleanup] Cloud Function completed:', result.data);
    return result.data;
  } catch (error: unknown) {
    console.error('[performSystemWideCleanup] Cloud Function error:', error);
    if (error instanceof Error) throw error;
    throw new Error('Unexpected error in system-wide cleanup');
  }
}
