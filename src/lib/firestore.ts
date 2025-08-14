// 🔧 Firebase Initialization
'use client';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';
import { getFirestore, collection, query, where, getDocs, doc, updateDoc, writeBatch, getDoc, deleteDoc, documentId } from 'firebase/firestore';
import { deleteField } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth } from 'firebase/auth';
import type { Board, BoardMember, BoardRole, BoardInvitation } from './types';

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

// 📤 Callable Cloud Functions
const shareBoardCallable = httpsCallable(functions, 'shareBoard');
const acceptBoardInvitationCallable = httpsCallable<{ invitationId: string }, void>(functions, 'acceptBoardInvitation');
const declineBoardInvitationCallable = httpsCallable<{ invitationId: string }, void>(functions, 'declineBoardInvitation');

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
  const boardDocRef = doc(db, 'boards', boardId);
  const boardDocSnap = await getDoc(boardDocRef);
  if (!boardDocSnap.exists()) return [];

  const boardData = boardDocSnap.data();
  const ownerId = boardData.ownerId;
  const memberRoles = boardData.members || {};

  const memberUids = [ownerId, ...Object.keys(memberRoles)];

  // Firestore 'in' queries support a maximum of 10 items, so chunk the
  // member list to avoid runtime errors when boards have many members.
  const uidChunks: string[][] = [];
  for (let i = 0; i < memberUids.length; i += 10) {
    uidChunks.push(memberUids.slice(i, i + 10));
  }

  const userSnapshots = await Promise.all(
    uidChunks.map(chunk =>
      getDocs(query(collection(db, 'users'), where(documentId(), 'in', chunk)))
    )
  );

  return userSnapshots.flatMap(snapshot =>
    snapshot.docs.map(userDoc => {
      const uid = userDoc.id;
      const email = userDoc.data().email;
      let role: BoardRole = 'viewer';
      if (uid === ownerId) role = 'owner';
      else if (memberRoles[uid]) role = memberRoles[uid];
      return { uid, email, role };
    })
  );
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
  const batch = writeBatch(db);
  const boardDoc = await getDoc(doc(db, 'boards', boardId));

  if (boardDoc.exists()) {
    const boardData = boardDoc.data();
    const memberUids = Object.keys(boardData.members || {});
    const allUids = [boardData.ownerId, ...memberUids];
    allUids.forEach(uid => {
      const membershipRef = doc(db, `users/${uid}/boardMemberships`, boardId);
      batch.delete(membershipRef);
    });
  }

  const boardRef = doc(db, 'boards', boardId);
  batch.delete(boardRef);
  await batch.commit();
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
