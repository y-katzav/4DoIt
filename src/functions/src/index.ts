
'use server';
/**
 * @fileOverview Cloud Functions for TaskFlow application.
 *
 * - sha  // שלב 4: שליפת נ  // שלב 5:   // שלב 6:   // שלב 7: בדיקת חברות קיימת
  console.log('[shareBoard] Step 7: Checking existing membership');יקת שיתוף עצמי
  console.log('[shareBoard] Step 6: Checking self-sharing');יקת הרשאת בעלות
  console.log('[shareBoard] Step 5: Checking board ownership');ני הלוח
  console.log('[shareBoard] Step 4: Fetching board data for boardId:', boardId);Board - Invites a user to a board.
 * - acceptBoardInvitation - Accepts a board invitation.
 * - declineBoardInvitation - Declines a board invitation.
 */
import {onCall, HttpsError} from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import {initializeApp} from 'firebase-admin/app';

admin.initializeApp();
const db = admin.firestore();

interface ShareBoardData {
  boardId: string;
  recipientEmail: string;
  role: 'viewer' | 'editor';
}

interface BoardInvitationData {
  boardId: string;
  senderUid: string;
  recipientEmail: string;
  role: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: admin.firestore.Timestamp;
  expiresAt?: admin.firestore.Timestamp;
  boardName: string;
  senderEmail: string;
}

export const shareBoard = onCall<ShareBoardData>(async (request) => {
  const startTime = Date.now();
  console.log('[shareBoard] ====== FUNCTION START ======');
  console.log('[shareBoard] Function called with request data:', JSON.stringify(request.data));
  
  try {
    // שלב 1: בדיקת אימות
    console.log('[shareBoard] Step 1: Checking authentication');
    if (!request.auth || !request.auth.uid) {
      console.error('[shareBoard] Authentication failed - no auth or uid');
      throw new HttpsError(
        'unauthenticated',
        'Only authenticated users can share boards.'
      );
    }
    console.log('[shareBoard] Authentication passed - uid:', request.auth.uid);

  // שלב 2: בדיקת פרמטרים
  console.log('[shareBoard] Step 2: Validating parameters');
  const {boardId, recipientEmail, role} = request.data;
  console.log('[shareBoard] Parameters - boardId:', boardId, 'recipientEmail:', recipientEmail, 'role:', role);
  
  if (!boardId || !recipientEmail || !role) {
    console.error('[shareBoard] Missing required arguments:', {boardId: !!boardId, recipientEmail: !!recipientEmail, role: !!role});
    throw new HttpsError('invalid-argument', 'Missing required arguments.');
  }

  // בדיקת תקינות role
  const validRoles = ['viewer', 'editor'];
  if (!validRoles.includes(role)) {
    console.error('[shareBoard] Invalid role provided:', role, 'valid roles:', validRoles);
    throw new HttpsError('invalid-argument', `Role must be one of: ${validRoles.join(', ')}`);
  }

  // בדיקת פורמט אימייל
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(recipientEmail)) {
    console.error('[shareBoard] Invalid email format:', recipientEmail);
    throw new HttpsError('invalid-argument', 'Invalid email format provided.');
  }

  // שלב 3: קבלת נתוני המשתמש הקורא
  console.log('[shareBoard] Step 3: Getting calling user data');
    const callingUserId = request.auth.uid;
    const callingUserEmail = request.auth.token.email;
    console.log('[shareBoard] Calling user - uid:', callingUserId, 'email:', callingUserEmail);

    if (!callingUserEmail) {
      console.error('[shareBoard] Calling user has no email in token');
      throw new HttpsError(
        'invalid-argument',
        'Authenticated user must have an email.'
      );
    }

    // שלב 5: שליפת נתוני הלוח
    console.log('[shareBoard] Step 5: Fetching board data for boardId:', boardId);
    const boardRef = db.collection('boards').doc(boardId);
    const boardSnap = await boardRef.get();
    
    if (!boardSnap.exists) {
      console.error('[shareBoard] Board not found:', boardId);
      throw new HttpsError('not-found', 'Board not found.');
    }
    
    const boardData = boardSnap.data();
    if (!boardData) {
      console.error('[shareBoard] Board data is null for boardId:', boardId);
      throw new HttpsError('internal', 'Could not retrieve board data.');
    }
    
    console.log('[shareBoard] Board found - name:', boardData.name, 'ownerId:', boardData.ownerId);

    // שלב 6: בדיקת הרשאת בעלות
    console.log('[shareBoard] Step 6: Checking board ownership');
    if (boardData.ownerId !== callingUserId) {
      console.error('[shareBoard] Permission denied - board owner:', boardData.ownerId, 'calling user:', callingUserId);
      throw new HttpsError(
        'permission-denied',
        'Only the board owner can share the board.'
      );
    }
    console.log('[shareBoard] Ownership verified');

    // שלב 7: בדיקת שיתוף עצמי
    console.log('[shareBoard] Step 7: Checking self-sharing');
    if (callingUserEmail === recipientEmail) {
      console.error('[shareBoard] Attempted self-sharing - both emails:', callingUserEmail);
      throw new HttpsError(
        'invalid-argument',
        'Cannot share a board with yourself.'
      );
    }
    console.log('[shareBoard] Self-sharing check passed');
    
    // שלב 8: בדיקת חברות קיימת
    console.log('[shareBoard] Step 8: Checking existing membership');
    const usersRef = db.collection('users');
    const userQuery = await usersRef.where('email', '==', recipientEmail).limit(1).get();
    console.log('[shareBoard] User query result - empty:', userQuery.empty, 'size:', userQuery.size);
    
    if (!userQuery.empty) {
        const recipientUid = userQuery.docs[0].id;
        console.log('[shareBoard] Found recipient user with uid:', recipientUid);
        
        const membershipDoc = await db.collection('users').doc(recipientUid).collection('boardMemberships').doc(boardId).get();
        console.log('[shareBoard] Membership check - exists:', membershipDoc.exists);
        
        if (membershipDoc.exists) {
            console.error('[shareBoard] User already member - recipientUid:', recipientUid, 'boardId:', boardId);
            throw new HttpsError(
                'already-exists',
                `User with email ${recipientEmail} is already a member of this board.`
            );
        }
        console.log('[shareBoard] No existing membership found');
    } else {
        console.log('[shareBoard] Recipient user not found in users collection (will be invited by email)');
    }


  // שלב 8: בדיקת הזמנה קיימת
  console.log('[shareBoard] Step 8: Checking existing invitation');
  const invitationsRef = db.collection('boardInvitations');
  const existingInvitationQuery = invitationsRef
    .where('boardId', '==', boardId)
    .where('recipientEmail', '==', recipientEmail)
    .where('status', '==', 'pending');

  const existingInvitationSnap = await existingInvitationQuery.get();
  console.log('[shareBoard] Existing invitation check - empty:', existingInvitationSnap.empty, 'size:', existingInvitationSnap.size);
  
  if (!existingInvitationSnap.empty) {
    console.error('[shareBoard] Invitation already exists for recipient:', recipientEmail, 'boardId:', boardId);
    throw new HttpsError(
      'already-exists',
      `An invitation has already been sent to ${recipientEmail}.`
    );
  }
  console.log('[shareBoard] No existing invitation found');

  // שלב 9: יצירת הזמנה חדשה
  console.log('[shareBoard] Step 9: Creating new invitation');
  const newInvitation: BoardInvitationData = {
    boardId,
    senderUid: callingUserId,
    recipientEmail,
    role,
    status: 'pending',
    createdAt: admin.firestore.Timestamp.now(),
    boardName: boardData.name,
    senderEmail: callingUserEmail,
  };
  
  console.log('[shareBoard] New invitation data:', JSON.stringify(newInvitation, null, 2));

  try {
    const invitationDoc = await invitationsRef.add(newInvitation);
    console.log('[shareBoard] Invitation created successfully with ID:', invitationDoc.id);
  } catch (error) {
    console.error('[shareBoard] Failed to create invitation:', error);
    throw new HttpsError('internal', 'Failed to create invitation');
  }

  console.log('[shareBoard] Function completed successfully');
  return {
    success: true,
    message: `Invitation sent to ${recipientEmail}.`,
  };
  
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[shareBoard] ====== FUNCTION ERROR ======');
    console.error('[shareBoard] Error occurred after', duration, 'ms');
    console.error('[shareBoard] Error details:', error);
    
    if (error instanceof HttpsError) {
      console.error('[shareBoard] HttpsError - code:', error.code, 'message:', error.message);
      throw error;
    } else {
      console.error('[shareBoard] Unexpected error:', error);
      throw new HttpsError('internal', 'An unexpected error occurred');
    }
  } finally {
    const duration = Date.now() - startTime;
    console.log('[shareBoard] ====== FUNCTION END ======');
    console.log('[shareBoard] Total execution time:', duration, 'ms');
  }
});

export const acceptBoardInvitation = onCall(async (request) => {
  const startTime = Date.now();
  console.log('[acceptBoardInvitation] ====== FUNCTION START ======');
  console.log('[acceptBoardInvitation] Request data:', JSON.stringify(request.data));
  
  try {
    if (!request.auth || !request.auth.uid) {
      console.error('[acceptBoardInvitation] Authentication failed');
      throw new HttpsError(
        'unauthenticated',
        'You must be logged in to accept an invitation.'
      );
    }
    console.log('[acceptBoardInvitation] Authentication passed - uid:', request.auth.uid);
    
    const {invitationId} = request.data;
    console.log('[acceptBoardInvitation] Invitation ID:', invitationId);
    
    if (!invitationId) {
      console.error('[acceptBoardInvitation] Missing invitation ID');
      throw new HttpsError('invalid-argument', 'Missing invitation ID.');
    }

    console.log('[acceptBoardInvitation] Fetching invitation document');
    const invitationRef = db.collection('boardInvitations').doc(invitationId);
    const invitationSnap = await invitationRef.get();
    const invitationData = invitationSnap.data();
    
    console.log('[acceptBoardInvitation] Invitation exists:', invitationSnap.exists);
    console.log('[acceptBoardInvitation] Invitation data:', invitationData);

    if (
      !invitationSnap.exists ||
      !invitationData ||
      invitationData.recipientEmail !== request.auth.token.email
    ) {
      console.error('[acceptBoardInvitation] Invitation validation failed - exists:', invitationSnap.exists, 'data exists:', !!invitationData, 'email match:', invitationData?.recipientEmail === request.auth.token.email);
      throw new HttpsError(
        'not-found',
        'Invitation not found or you are not the recipient.'
      );
    }

    if (invitationData.status !== 'pending') {
      console.error('[acceptBoardInvitation] Invitation not pending - status:', invitationData.status);
      throw new HttpsError(
        'failed-precondition',
        `This invitation is already ${invitationData.status}.`
      );
    }

    console.log('[acceptBoardInvitation] Starting batch operation');
    const userRef = db.collection('users').doc(request.auth.uid);
    const boardRef = db.collection('boards').doc(invitationData.boardId);

    const batch = db.batch();
    
    // הוספת מסמך בתת-אוסף boardMemberships של המשתמש
    const membershipRef = userRef.collection('boardMemberships').doc(invitationData.boardId);
    console.log('[acceptBoardInvitation] Adding membership document for board:', invitationData.boardId);
    batch.set(membershipRef, {
      boardId: invitationData.boardId,
      boardName: invitationData.boardName,
      role: invitationData.role,
      joinedAt: admin.firestore.Timestamp.now(),
    });

    // עדכון members של הלוח (הוספה למפה הקיימת - זה יוסיף המשתמש החדש מבלי למחוק קיימים)
    console.log('[acceptBoardInvitation] Updating board members field');
    batch.update(boardRef, {
      [`members.${request.auth.uid}`]: invitationData.role,
    });

    // עדכון sharedWith של הלוח (הוספה למפה הקיימת, ללא הבעלים)
    console.log('[acceptBoardInvitation] Updating board sharedWith field');
    batch.update(boardRef, {
      [`sharedWith.${request.auth.uid}`]: invitationData.role,
    });

    console.log('[acceptBoardInvitation] Updating invitation status to accepted');
    batch.update(invitationRef, {status: 'accepted'});

    await batch.commit();
    console.log('[acceptBoardInvitation] Batch operation completed successfully');

    return {
      success: true,
      message: `Successfully joined board "${invitationData.boardName}".`,
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[acceptBoardInvitation] ====== FUNCTION ERROR ======');
    console.error('[acceptBoardInvitation] Error after', duration, 'ms:', error);
    
    if (error instanceof HttpsError) {
      throw error;
    } else {
      throw new HttpsError('internal', 'An unexpected error occurred');
    }
  } finally {
    const duration = Date.now() - startTime;
    console.log('[acceptBoardInvitation] ====== FUNCTION END ======');
    console.log('[acceptBoardInvitation] Total execution time:', duration, 'ms');
  }
});

export const declineBoardInvitation = onCall(async (request) => {
  const startTime = Date.now();
  console.log('[declineBoardInvitation] ====== FUNCTION START ======');
  console.log('[declineBoardInvitation] Request data:', JSON.stringify(request.data));
  
  try {
    if (!request.auth || !request.auth.uid) {
      console.error('[declineBoardInvitation] Authentication failed');
      throw new HttpsError(
        'unauthenticated',
        'You must be logged in to decline invitation.'
      );
    }
    console.log('[declineBoardInvitation] Authentication passed - uid:', 
      request.auth.uid);
    
    const {invitationId} = request.data;
    console.log('[declineBoardInvitation] Invitation ID:', invitationId);
    
    if (!invitationId) {
      console.error('[declineBoardInvitation] Missing invitation ID');
      throw new HttpsError('invalid-argument', 'Missing invitation ID.');
    }

    console.log('[declineBoardInvitation] Fetching invitation document');
    const invitationRef = db.collection('boardInvitations').doc(invitationId);
    const invitationSnap = await invitationRef.get();
    const invitationData = invitationSnap.data();
    
    console.log('[declineBoardInvitation] Invitation exists:', invitationSnap.exists);
    console.log('[declineBoardInvitation] Invitation data:', invitationData);

    if (
      !invitationSnap.exists ||
      !invitationData ||
      invitationData.recipientEmail !== request.auth.token.email
    ) {
      console.error('[declineBoardInvitation] Invitation validation failed - exists:', invitationSnap.exists, 'data exists:', !!invitationData, 'email match:', invitationData?.recipientEmail === request.auth.token.email);
      throw new HttpsError(
        'not-found',
        'Invitation not found or you are not the recipient.'
      );
    }

    console.log('[declineBoardInvitation] Updating invitation status to declined');
    await invitationRef.update({status: 'declined'});
    console.log('[declineBoardInvitation] Invitation declined successfully');

    return {success: true, message: 'Invitation declined.'};
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[declineBoardInvitation] ====== FUNCTION ERROR ======');
    console.error('[declineBoardInvitation] Error after', duration, 'ms:', error);
    
    if (error instanceof HttpsError) {
      throw error;
    } else {
      throw new HttpsError('internal', 'An unexpected error occurred');
    }
  } finally {
    const duration = Date.now() - startTime;
    console.log('[declineBoardInvitation] ====== FUNCTION END ======');
    console.log('[declineBoardInvitation] Total execution time:', duration, 'ms');
  }
});

export const getBoardMembers = onCall<{ boardId: string }>(async (request) => {
  const startTime = Date.now();
  console.log('[getBoardMembers] ====== FUNCTION START ======');
  console.log('[getBoardMembers] Request data:', JSON.stringify(request.data));
  
  try {
    if (!request.auth || !request.auth.uid) {
      console.error('[getBoardMembers] Authentication failed');
      throw new HttpsError(
        'unauthenticated',
        'You must be logged in to get board members.'
      );
    }
    console.log('[getBoardMembers] Authentication passed - uid:', 
      request.auth.uid);
    
    const { boardId } = request.data;
    console.log('[getBoardMembers] Board ID:', boardId);
    
    if (!boardId) {
      console.error('[getBoardMembers] Missing board ID');
      throw new HttpsError('invalid-argument', 'Missing board ID.');
    }

    // בדיקה שהמשתמש יכול לגשת ללוח
    console.log('[getBoardMembers] Checking board access');
    const boardRef = db.collection('boards').doc(boardId);
    const boardSnap = await boardRef.get();
    
    if (!boardSnap.exists) {
      console.error('[getBoardMembers] Board not found:', boardId);
      throw new HttpsError('not-found', 'Board not found.');
    }
    
    const boardData = boardSnap.data();
    const callingUserId = request.auth.uid;
    
    // בדיקה שהמשתמש חבר בלוח
    const isOwner = boardData?.ownerId === callingUserId;
    const isMember = boardData?.members?.[callingUserId];
    const isShared = boardData?.sharedWith?.[callingUserId];
    
    if (!isOwner && !isMember && !isShared) {
      console.error('[getBoardMembers] Access denied - user not member of board');
      throw new HttpsError('permission-denied', 'You are not a member of this board.');
    }
    
    console.log('[getBoardMembers] Access granted - fetching members');
    
    // שליפת חברי הלוח
    const ownerId = boardData?.ownerId;
    const memberRoles = boardData?.members || {};
    
    // יצירת רשימת UIDs
    const memberUids = ownerId in memberRoles 
      ? Object.keys(memberRoles)
      : [ownerId, ...Object.keys(memberRoles)];
    
    console.log('[getBoardMembers] Found', memberUids.length, 'members to fetch');
    
    if (memberUids.length === 0) {
      return { members: [] };
    }
    
    // שליפת פרטי משתמשים (עם הרשאות admin)
    const userPromises = memberUids.map(uid => 
      db.collection('users').doc(uid).get()
    );
    
    const userDocs = await Promise.all(userPromises);
    
    const members = userDocs
      .filter(doc => doc.exists)
      .map(doc => {
        const uid = doc.id;
        const userData = doc.data();
        const email = userData?.email;
        
        if (!email) {
          console.warn('[getBoardMembers] User without email:', uid);
          return null;
        }
        
        let role = 'viewer';
        if (uid === ownerId) role = 'owner';
        else if (memberRoles[uid]) role = memberRoles[uid];
        
        return { uid, email, role };
      })
      .filter(member => member !== null);
    
    console.log('[getBoardMembers] Returning', members.length, 'members');
    return { members };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[getBoardMembers] ====== FUNCTION ERROR ======');
    console.error('[getBoardMembers] Error after', duration, 'ms:', error);
    
    if (error instanceof HttpsError) {
      throw error;
    } else {
      throw new HttpsError('internal', 'An unexpected error occurred');
    }
  } finally {
    const duration = Date.now() - startTime;
    console.log('[getBoardMembers] ====== FUNCTION END ======');
    console.log('[getBoardMembers] Total execution time:', duration, 'ms');
  }
});
