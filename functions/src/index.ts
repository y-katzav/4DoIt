import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";

admin.initializeApp();
const db = admin.firestore();

interface BoardInvitationData {
  boardId: string;
  senderUid: string;
  recipientEmail: string;
  recipientUid?: string; // יהיה undefined אם המשתמש לא קיים בעת שליחת ההזמנה
  role: string;
  status: "pending" | "accepted" | "declined" | "expired";
  createdAt: admin.firestore.Timestamp;
  expiresAt?: admin.firestore.Timestamp;
  boardName: string;
  senderEmail: string;
}

/**
 * שולח אימייל הזמנה למשתמש
 * @param {string} recipientEmail כתובת אימייל של הנמען
 * @param {string} boardName שם הלוח
 * @param {string} senderEmail כתובת אימייל של השולח
 * @param {string} appUrl כתובת האפליקציה
 */
async function sendInvitationEmail(
  recipientEmail: string,
  boardName: string,
  senderEmail: string,
  appUrl = "https://4DoIt.com"
) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "yeuo67@gmail.com", // Gmail שלך
      pass: "zvwm vzsl owja npok", // App Password של Gmail
    },
  });

  const mailOptions = {
    from: "TaskFlow <yeuo67@gmail.com>",
    to: recipientEmail,
    subject: `You've been invited to join "${boardName}" on TaskFlow`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2 style="color: #2563eb;">You've been invited to TaskFlow!</h2>
        <p>Hello,</p>
        <p><strong>${senderEmail}</strong> has invited you to collaborate on 
        "<strong>${boardName}</strong>" on TaskFlow.</p>
        <div style="background-color: #f3f4f6; padding: 20px;">
          <h3 style="color: #1f2937;">What is TaskFlow?</h3>
          <p>TaskFlow is a collaborative task management platform.</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${appUrl}" style="background-color: #2563eb; 
          color: white; padding: 12px 24px; text-decoration: none;">
            Accept Invitation
          </a>
        </div>
        <p style="font-size: 14px; color: #6b7280;">
          If you don't have an account yet, please sign up first.
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Invitation email sent successfully to ${recipientEmail}`);
  } catch (error) {
    console.error("Error sending invitation email:", error);
    // לא נזרוק שגיאה כי אנחנו לא רוצים שהזמנה תיכשל בגלל בעיית אימייל
  }
}

export const shareBoard = onCall(async (request) => {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError(
      "unauthenticated",
      "Only authenticated users can share boards."
    );
  }

  const {boardId, recipientEmail, role} = request.data;
  if (!boardId || !recipientEmail || !role) {
    throw new HttpsError("invalid-argument", "Missing required arguments.");
  }

  if (role === "owner") {
    throw new HttpsError(
      "invalid-argument",
      "Cannot assign owner role via sharing."
    );
  }

  const callingUserId = request.auth.uid;
  const callingUserEmail = request.auth.token.email;

  if (!callingUserEmail) {
    throw new HttpsError(
      "invalid-argument",
      "Authenticated user must have an email."
    );
  }

  const boardRef = db.collection("boards").doc(boardId);
  const boardSnap = await boardRef.get();
  if (!boardSnap.exists) {
    throw new HttpsError("not-found", "Board not found.");
  }
  const boardData = boardSnap.data();
  if (!boardData) {
    throw new HttpsError("internal", "Could not retrieve board data.");
  }

  if (boardData.ownerId !== callingUserId) {
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

  const usersRef = db.collection("users");
  const userQuery = await usersRef
    .where("email", "==", recipientEmail)
    .limit(1)
    .get();

  let recipientUid: string | undefined;

  if (!userQuery.empty) {
    recipientUid = userQuery.docs[0].id;
    const membershipDoc = await db
      .collection("users")
      .doc(recipientUid)
      .collection("boardMemberships")
      .doc(boardId)
      .get();
    if (membershipDoc.exists) {
      throw new HttpsError(
        "already-exists",
        `User with email ${recipientEmail} is already a member.`
      );
    }
  }

  const invitationsRef = db.collection("boardInvitations");
  const existingInvitationQuery = invitationsRef
    .where("boardId", "==", boardId)
    .where("recipientEmail", "==", recipientEmail)
    .where("status", "==", "pending");

  const existingInvitationSnap = await existingInvitationQuery.get();
  if (!existingInvitationSnap.empty) {
    throw new HttpsError(
      "already-exists",
      `An invitation has already been sent to ${recipientEmail}.`
    );
  }

  const newInvitation: BoardInvitationData = {
    boardId,
    senderUid: callingUserId,
    recipientEmail,
    recipientUid,
    role,
    status: "pending",
    createdAt: admin.firestore.Timestamp.now(),
    boardName: boardData.name,
    senderEmail: callingUserEmail,
  };

  await invitationsRef.add(newInvitation);

  // שליחת אימייל הזמנה
  await sendInvitationEmail(
    recipientEmail,
    boardData.name,
    callingUserEmail
  );

  return {
    success: true,
    message: `Invitation sent to ${recipientEmail}.`,
  };
});

export const acceptBoardInvitation = onCall(async (request) => {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError(
      "unauthenticated",
      "You must be logged in to accept an invitation."
    );
  }
  const {invitationId} = request.data;
  if (!invitationId) {
    throw new HttpsError("invalid-argument", "Missing invitation ID.");
  }

  const invitationRef = db.collection("boardInvitations").doc(invitationId);
  const invitationSnap = await invitationRef.get();
  const invitationData = invitationSnap.data();

  if (
    !invitationSnap.exists ||
    !invitationData ||
    invitationData.recipientEmail !== request.auth.token.email
  ) {
    throw new HttpsError(
      "not-found",
      "Invitation not found or you are not the recipient."
    );
  }

  if (invitationData.status !== "pending") {
    throw new HttpsError(
      "failed-precondition",
      `This invitation is already ${invitationData.status}.`
    );
  }

  const userRef = db.collection("users").doc(request.auth.uid);
  const boardRef = db.collection("boards").doc(invitationData.boardId);

  const batch = db.batch();

  // הוספת מסמך בתת-אוסף boardMemberships של המשתמש
  const membershipRef = userRef
    .collection("boardMemberships")
    .doc(invitationData.boardId);
  batch.set(membershipRef, {
    boardName: invitationData.boardName,
    role: invitationData.role,
    joinedAt: admin.firestore.Timestamp.now(),
  });

  // עדכון sharedWith ב-board
  batch.update(boardRef, {
    [`sharedWith.${request.auth.uid}`]: invitationData.role,
  });

  // עדכון members array ב-board
  batch.update(boardRef, {
    members: admin.firestore.FieldValue.arrayUnion({
      userId: request.auth.uid,
      email: request.auth.token.email,
      role: invitationData.role,
      joinedAt: admin.firestore.Timestamp.now(),
    }),
  });

  batch.update(invitationRef, {status: "accepted"});

  await batch.commit();

  return {
    success: true,
    message: `Successfully joined board "${invitationData.boardName}".`,
  };
});

export const declineBoardInvitation = onCall(async (request) => {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError(
      "unauthenticated",
      "You must be logged in to decline an invitation."
    );
  }
  const {invitationId} = request.data;
  if (!invitationId) {
    throw new HttpsError("invalid-argument", "Missing invitation ID.");
  }

  const invitationRef = db.collection("boardInvitations").doc(invitationId);
  const invitationSnap = await invitationRef.get();
  const invitationData = invitationSnap.data();

  if (
    !invitationSnap.exists ||
    !invitationData ||
    invitationData.recipientEmail !== request.auth.token.email
  ) {
    throw new HttpsError(
      "not-found",
      "Invitation not found or you are not the recipient."
    );
  }

  await invitationRef.update({status: "declined"});

  return {success: true, message: "Invitation declined."};
});
