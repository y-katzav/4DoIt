
'use server';
/**
 * @fileOverview Cloud Functions for TaskFlow application.
 *
 * - shareBoard - Invites a user to a board.
 * - acceptBoardInvitation - Accepts a board invitation.
 * - declineBoardInvitation - Declines a board invitation.
 */
import {onCall, HttpsError} from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import {initializeApp} from 'firebase-admin/app';

admin.initializeApp();
const db = admin.firestore();

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

export const shareBoard = onCall(async (request) => {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError(
      'unauthenticated',
      'Only authenticated users can share boards.'
    );
  }

  const {boardId, recipientEmail, role} = request.data;
  if (!boardId || !recipientEmail || !role) {
    throw new HttpsError('invalid-argument', 'Missing required arguments.');
  }

  if (role === 'owner') {
    throw new HttpsError(
      'invalid-argument',
      'Cannot assign owner role via sharing.'
    );
  }

  const callingUserId = request.auth.uid;
  const callingUserEmail = request.auth.token.email;

  if (!callingUserEmail) {
    throw new HttpsError(
      'invalid-argument',
      'Authenticated user must have an email.'
    );
  }

  const boardRef = db.collection('boards').doc(boardId);
  const boardSnap = await boardRef.get();
  if (!boardSnap.exists) {
    throw new HttpsError('not-found', 'Board not found.');
  }
  const boardData = boardSnap.data();
  if (!boardData) {
    throw new HttpsError('internal', 'Could not retrieve board data.');
  }

  if (boardData.ownerId !== callingUserId) {
    throw new HttpsError(
      'permission-denied',
      'Only the board owner can share the board.'
    );
  }

  if (callingUserEmail === recipientEmail) {
    throw new HttpsError(
      'invalid-argument',
      'Cannot share a board with yourself.'
    );
  }
  
  const usersRef = db.collection('users');
  const userQuery = await usersRef.where('email', '==', recipientEmail).limit(1).get();
  
  if (!userQuery.empty) {
      const recipientUid = userQuery.docs[0].id;
      const membershipDoc = await db.collection(`users/${recipientUid}/boardMemberships`).doc(boardId).get();
      if (membershipDoc.exists) {
          throw new HttpsError(
              'already-exists',
              `User with email ${recipientEmail} is already a member of this board.`
          );
      }
  }


  const invitationsRef = db.collection('boardInvitations');
  const existingInvitationQuery = invitationsRef
    .where('boardId', '==', boardId)
    .where('recipientEmail', '==', recipientEmail)
    .where('status', '==', 'pending');

  const existingInvitationSnap = await existingInvitationQuery.get();
  if (!existingInvitationSnap.empty) {
    throw new HttpsError(
      'already-exists',
      `An invitation has already been sent to ${recipientEmail}.`
    );
  }

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

  await invitationsRef.add(newInvitation);

  return {
    success: true,
    message: `Invitation sent to ${recipientEmail}.`,
  };
});

export const acceptBoardInvitation = onCall(async (request) => {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError(
      'unauthenticated',
      'You must be logged in to accept an invitation.'
    );
  }
  const {invitationId} = request.data;
  if (!invitationId) {
    throw new HttpsError('invalid-argument', 'Missing invitation ID.');
  }

  const invitationRef = db.collection('boardInvitations').doc(invitationId);
  const invitationSnap = await invitationRef.get();
  const invitationData = invitationSnap.data();

  if (
    !invitationSnap.exists ||
    !invitationData ||
    invitationData.recipientEmail !== request.auth.token.email
  ) {
    throw new HttpsError(
      'not-found',
      'Invitation not found or you are not the recipient.'
    );
  }

  if (invitationData.status !== 'pending') {
    throw new HttpsError(
      'failed-precondition',
      `This invitation is already ${invitationData.status}.`
    );
  }

  
  const userRef = db.collection('users').doc(request.auth.uid);

  const batch = db.batch();
  
  const sharedBoardRef = userRef.collection('boardMemberships').doc(invitationData.boardId);
  batch.set(sharedBoardRef, {
      boardName: invitationData.boardName,
      role: invitationData.role,
  });


  batch.update(invitationRef, {status: 'accepted'});

  await batch.commit();

  return {
    success: true,
    message: `Successfully joined board "${invitationData.boardName}".`,
  };
});

export const declineBoardInvitation = onCall(async (request) => {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError(
      'unauthenticated',
      'You must be logged in to decline an invitation.'
    );
  }
  const {invitationId} = request.data;
  if (!invitationId) {
    throw new HttpsError('invalid-argument', 'Missing invitation ID.');
  }

  const invitationRef = db.collection('boardInvitations').doc(invitationId);
  const invitationSnap = await invitationRef.get();
  const invitationData = invitationSnap.data();

  if (
    !invitationSnap.exists ||
    !invitationData ||
    invitationData.recipientEmail !== request.auth.token.email
  ) {
    throw new HttpsError(
      'not-found',
      'Invitation not found or you are not the recipient.'
    );
  }

  await invitationRef.update({status: 'declined'});

  return {success: true, message: 'Invitation declined.'};
});
