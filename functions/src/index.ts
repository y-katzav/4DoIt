import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

interface SharedWithEntry {
  userId: string;
  role: "viewer" | "editor";
}

interface BoardInvitationData {
  boardId: string;
  senderUid: string;
  recipientEmail: string;
  role: "viewer" | "editor";
  status: "pending" | "accepted" | "declined" | "expired";
  createdAt: admin.firestore.Timestamp;
  expiresAt?: admin.firestore.Timestamp;
  boardName: string;
  senderEmail: string;
}

export const shareBoard = onCall(async (request) => {
  const auth = request.auth;

  if (!auth?.uid || !auth.token.email) {
    throw new HttpsError(
      "unauthenticated",
      "Only authenticated users can share boards."
    );
  }

  const callingUserId = auth.uid;
  const callingUserEmail = auth.token.email;

  const {boardId, recipientEmail, role} = request.data;

  if (!boardId || !recipientEmail || !role) {
    throw new HttpsError(
      "invalid-argument",
      "Missing required arguments."
    );
  }

  if (role === "owner") {
    throw new HttpsError(
      "invalid-argument",
      "Cannot assign owner role via sharing."
    );
  }

  const boardRef = db.collection("boards").doc(boardId);
  const boardSnap = await boardRef.get();

  if (!boardSnap.exists) {
    throw new HttpsError("not-found", "Board not found.");
  }

  const boardData = boardSnap.data();

  if (!boardData || boardData.ownerId !== callingUserId) {
    throw new HttpsError(
      "permission-denied",
      "Only the board owner can share the board."
    );
  }

  if (callingUserEmail === recipientEmail) {
    throw new HttpsError(
      "invalid-argument",
      "Cannot share a board with yourself."
    );
  }

  const invitationsRef = db.collection("boardInvitations");
  const existingInvitationSnap = await invitationsRef
    .where("boardId", "==", boardId)
    .where("recipientEmail", "==", recipientEmail)
    .where("status", "==", "pending")
    .get();

  if (!existingInvitationSnap.empty) {
    throw new HttpsError(
      "already-exists",
      `An invitation has already been sent to ${recipientEmail}.`
    );
  }

  const usersRef = db.collection("users");
  const userQuery = await usersRef
    .where("email", "==", recipientEmail)
    .get();

  if (userQuery.empty) {
    throw new HttpsError(
      "not-found",
      `No user found with email ${recipientEmail}.`
    );
  }

  const recipientUid = userQuery.docs[0].id;
  const sharedWith = boardData.sharedWith || [];

  const alreadyShared = (sharedWith as SharedWithEntry[]).some(
    (entry) => entry.userId === recipientUid
  );

  if (alreadyShared) {
    throw new HttpsError(
      "already-exists",
      `User with email ${recipientEmail} is already a ` +
      "member of this board."
    );
  }

  const newInvitation: BoardInvitationData = {
    boardId,
    senderUid: callingUserId,
    recipientEmail,
    role,
    status: "pending",
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
  const auth = request.auth;

  if (!auth?.uid || !auth.token.email) {
    throw new HttpsError(
      "unauthenticated",
      "You must be logged in to accept an invitation."
    );
  }

  const currentUserId = auth.uid;
  const currentUserEmail = auth.token.email;

  const {invitationId} = request.data;

  if (!invitationId) {
    throw new HttpsError(
      "invalid-argument",
      "Missing invitation ID."
    );
  }

  const invitationRef = db.collection("boardInvitations").doc(invitationId);
  const invitationSnap = await invitationRef.get();

  if (!invitationSnap.exists) {
    throw new HttpsError("not-found", "Invitation not found.");
  }

  const invitation = invitationSnap.data() as BoardInvitationData;

  if (invitation.recipientEmail !== currentUserEmail) {
    throw new HttpsError(
      "permission-denied",
      "You are not the recipient of this invitation."
    );
  }

  if (invitation.status !== "pending") {
    throw new HttpsError(
      "failed-precondition",
      `This invitation is already ${invitation.status}.`
    );
  }

  const boardRef = db.collection("boards").doc(invitation.boardId);
  const boardSnap = await boardRef.get();

  if (!boardSnap.exists) {
    throw new HttpsError("not-found", "Board not found.");
  }

  const boardData = boardSnap.data();

  if (!boardData) {
    throw new HttpsError("not-found", "Board data is invalid.");
  }

  const sharedWith = boardData.sharedWith || [];
  const alreadyMember = (sharedWith as SharedWithEntry[]).some(
    (entry) => entry.userId === currentUserId
  );

  if (alreadyMember) {
    throw new HttpsError(
      "already-exists",
      "You are already a member of this board."
    );
  }

  const batch = db.batch();

  batch.update(boardRef, {
    sharedWith: admin.firestore.FieldValue.arrayUnion({
      userId: currentUserId,
      role: invitation.role,
    }),
  });

  batch.update(invitationRef, {status: "accepted"});

  const notificationsRef = db.collection("notifications").doc();
  const notifMsg = `${currentUserEmail} accepted your ` +
    `invitation to join "${invitation.boardName}".`;
  batch.set(notificationsRef, {
    recipientUid: invitation.senderUid,
    message: notifMsg,
    type: "accepted",
    relatedBoardId: invitation.boardId,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  await batch.commit();

  return {
    success: true,
    message: `Successfully joined board "${invitation.boardName}".`,
  };
});

export const declineBoardInvitation = onCall(async (request) => {
  const auth = request.auth;

  if (!auth?.uid || !auth.token.email) {
    throw new HttpsError(
      "unauthenticated",
      "You must be logged in to decline an invitation."
    );
  }

  const currentUserEmail = auth.token.email;

  const {invitationId} = request.data;

  if (!invitationId) {
    throw new HttpsError(
      "invalid-argument",
      "Missing invitation ID."
    );
  }

  const invitationRef = db.collection("boardInvitations").doc(invitationId);
  const invitationSnap = await invitationRef.get();

  if (!invitationSnap.exists) {
    throw new HttpsError("not-found", "Invitation not found.");
  }

  const invitation = invitationSnap.data() as BoardInvitationData;

  if (invitation.recipientEmail !== currentUserEmail) {
    throw new HttpsError(
      "permission-denied",
      "You are not the recipient of this invitation."
    );
  }

  if (invitation.status !== "pending") {
    throw new HttpsError(
      "failed-precondition",
      `This invitation is already ${invitation.status}.`
    );
  }

  const batch = db.batch();

  batch.update(invitationRef, {status: "declined"});

  const notificationsRef = db.collection("notifications").doc();
  const notifMsg = `${currentUserEmail} declined your ` +
    `invitation to join "${invitation.boardName}".`;
  batch.set(notificationsRef, {
    recipientUid: invitation.senderUid,
    message: notifMsg,
    type: "declined",
    relatedBoardId: invitation.boardId,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  await batch.commit();

  return {
    success: true,
    message: "Invitation declined.",
  };
});
