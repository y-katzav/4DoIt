import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";

admin.initializeApp();
const db = admin.firestore();

// ייבוא טיפוסים מהקובץ הראשי
type BoardRole = "owner" | "editor" | "viewer";

interface ShareBoardData {
  boardId: string;
  recipientEmail: string;
  role: Exclude<BoardRole, "owner">; // רק 'viewer' | 'editor'
}

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

export const shareBoard = onCall<ShareBoardData>(async (request) => {
  console.log("[shareBoard] ====== FUNCTION START ======");
  console.log("[shareBoard] Request data:", JSON.stringify(request.data));
  const startTime = Date.now();

  try {
    if (!request.auth || !request.auth.uid) {
      console.error("[shareBoard] Authentication failed");
      throw new HttpsError(
        "unauthenticated",
        "Only authenticated users can share boards."
      );
    }
    console.log("[shareBoard] Authentication passed - uid:", request.auth.uid);

    const {boardId, recipientEmail, role} = request.data;
    console.log(
      "[shareBoard] Parameters - boardId:", boardId,
      "recipientEmail:", recipientEmail, "role:", role
    );

    if (!boardId || !recipientEmail || !role) {
      console.error(
        "[shareBoard] Missing required arguments:",
        {
          boardId: !!boardId,
          recipientEmail: !!recipientEmail,
          role: !!role,
        }
      );
      throw new HttpsError("invalid-argument", "Missing required arguments.");
    }

    // בדיקת תקינות role
    const validRoles: Array<Exclude<BoardRole, "owner">> = [
      "viewer", "editor",
    ];
    if (!validRoles.includes(role)) {
      console.error(
        "[shareBoard] Invalid role provided:", role, "valid roles:", validRoles
      );
      throw new HttpsError(
        "invalid-argument",
        `Role must be one of: ${validRoles.join(", ")}`
      );
    }

    // בדיקת פורמט אימייל
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      console.error("[shareBoard] Invalid email format:", recipientEmail);
      throw new HttpsError(
        "invalid-argument", "Invalid email format provided."
      );
    }

    const callingUserId = request.auth.uid;
    const callingUserEmail = request.auth.token.email;
    console.log(
      "[shareBoard] Calling user - uid:", callingUserId,
      "email:", callingUserEmail
    );

    if (!callingUserEmail) {
      console.error("[shareBoard] Calling user has no email in token");
      throw new HttpsError(
        "invalid-argument",
        "Authenticated user must have an email."
      );
    }

    console.log(
      "[shareBoard] Fetching board data for boardId:", boardId
    );
    const boardRef = db.collection("boards").doc(boardId);
    const boardSnap = await boardRef.get();

    if (!boardSnap.exists) {
      console.error("[shareBoard] Board not found:", boardId);
      throw new HttpsError("not-found", "Board not found.");
    }

    const boardData = boardSnap.data();
    if (!boardData) {
      console.error("[shareBoard] Board data is null for boardId:", boardId);
      throw new HttpsError("internal", "Could not retrieve board data.");
    }
    console.log(
      "[shareBoard] Board found - name:", boardData.name,
      "ownerId:", boardData.ownerId
    );

    if (boardData.ownerId !== callingUserId) {
      console.error(
        "[shareBoard] Permission denied - board owner:", boardData.ownerId,
        "calling user:", callingUserId
      );
      throw new HttpsError(
        "permission-denied",
        "Only the board owner can share the board."
      );
    }

    if (callingUserEmail === recipientEmail) {
      console.error("[shareBoard] Attempted self-sharing:", callingUserEmail);
      throw new HttpsError(
        "invalid-argument",
        "Cannot share a board with yourself."
      );
    }

    console.log("[shareBoard] Checking existing membership");
    const usersRef = db.collection("users");
    const userQuery = await usersRef
      .where("email", "==", recipientEmail)
      .limit(1)
      .get();

    let recipientUid: string | undefined;
    console.log("[shareBoard] User query result - empty:", userQuery.empty);

    if (!userQuery.empty) {
      recipientUid = userQuery.docs[0].id;
      console.log("[shareBoard] Found recipient user with uid:", recipientUid);

      const membershipDoc = await db
        .collection("users")
        .doc(recipientUid)
        .collection("boardMemberships")
        .doc(boardId)
        .get();

      if (membershipDoc.exists) {
        console.error(
          "[shareBoard] User already member - recipientUid:", recipientUid,
          "boardId:", boardId
        );
        throw new HttpsError(
          "already-exists",
          `User with email ${recipientEmail} is already a member.`
        );
      }
    }

    console.log("[shareBoard] Checking existing invitation");
    const invitationsRef = db.collection("boardInvitations");
    const existingInvitationQuery = invitationsRef
      .where("boardId", "==", boardId)
      .where("recipientEmail", "==", recipientEmail)
      .where("status", "==", "pending");

    const existingInvitationSnap = await existingInvitationQuery.get();
    if (!existingInvitationSnap.empty) {
      console.error(
        "[shareBoard] Invitation already exists for recipient:",
        recipientEmail, "boardId:", boardId
      );
      throw new HttpsError(
        "already-exists",
        `An invitation has already been sent to ${recipientEmail}.`
      );
    }

    console.log("[shareBoard] Creating new invitation");
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
    console.log("[shareBoard] Invitation created successfully");

    // שליחת אימייל הזמנה
    console.log("[shareBoard] Sending invitation email");
    await sendInvitationEmail(
      recipientEmail,
      boardData.name,
      callingUserEmail
    );

    console.log("[shareBoard] Function completed successfully");
    return {
      success: true,
      message: `Invitation sent to ${recipientEmail}.`,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("[shareBoard] ====== FUNCTION ERROR ======");
    console.error("[shareBoard] Error after", duration, "ms:", error);

    if (error instanceof HttpsError) {
      throw error;
    } else {
      throw new HttpsError("internal", "An unexpected error occurred");
    }
  } finally {
    const duration = Date.now() - startTime;
    console.log("[shareBoard] ====== FUNCTION END ======");
    console.log("[shareBoard] Total execution time:", duration, "ms");
  }
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

  // עדכון members ב-board (הוספה למפה הקיימת)
  batch.update(boardRef, {
    [`members.${request.auth.uid}`]: invitationData.role,
  });

  // עדכון sharedWith ב-board (הוספה למפה הקיימת, ללא הבעלים)
  batch.update(boardRef, {
    [`sharedWith.${request.auth.uid}`]: invitationData.role,
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

export const getBoardMembers = onCall<{ boardId: string }>(async (request) => {
  const startTime = Date.now();
  console.log("[getBoardMembers] ====== FUNCTION START ======");
  console.log("[getBoardMembers] Request data:", JSON.stringify(request.data));

  try {
    if (!request.auth || !request.auth.uid) {
      console.error("[getBoardMembers] Authentication failed");
      throw new HttpsError(
        "unauthenticated",
        "You must be logged in to get board members."
      );
    }
    console.log("[getBoardMembers] Authentication passed - uid:",
      request.auth.uid);

    const {boardId} = request.data;
    console.log("[getBoardMembers] Board ID:", boardId);

    if (!boardId) {
      console.error("[getBoardMembers] Missing board ID");
      throw new HttpsError("invalid-argument", "Missing board ID.");
    }

    // בדיקה שהמשתמש יכול לגשת ללוח
    console.log("[getBoardMembers] Checking board access");
    const boardRef = db.collection("boards").doc(boardId);
    const boardSnap = await boardRef.get();

    if (!boardSnap.exists) {
      console.error("[getBoardMembers] Board not found:", boardId);
      throw new HttpsError("not-found", "Board not found.");
    }

    const boardData = boardSnap.data();
    const callingUserId = request.auth.uid;

    // בדיקה שהמשתמש חבר בלוח
    const isOwner = boardData?.ownerId === callingUserId;
    const isMember = boardData?.members?.[callingUserId];
    const isShared = boardData?.sharedWith?.[callingUserId];

    if (!isOwner && !isMember && !isShared) {
      console.error("[getBoardMembers] Access denied - not member of board");
      throw new HttpsError("permission-denied",
        "You are not a member of this board.");
    }

    console.log("[getBoardMembers] Access granted - fetching members");

    // שליפת חברי הלוח
    const ownerId = boardData?.ownerId;
    const memberRoles = boardData?.members || {};

    // יצירת רשימת UIDs
    const memberUids = ownerId in memberRoles ?
      Object.keys(memberRoles) :
      [ownerId, ...Object.keys(memberRoles)];

    console.log("[getBoardMembers] Found", memberUids.length, "members");

    if (memberUids.length === 0) {
      return {members: []};
    }

    // שליפת פרטי משתמשים (עם הרשאות admin)
    const userPromises = memberUids.map((uid) =>
      db.collection("users").doc(uid).get()
    );

    const userDocs = await Promise.all(userPromises);

    const members = userDocs
      .filter((doc) => doc.exists)
      .map((doc) => {
        const uid = doc.id;
        const userData = doc.data();
        const email = userData?.email;

        if (!email) {
          console.warn("[getBoardMembers] User without email:", uid);
          return null;
        }

        let role = "viewer";
        if (uid === ownerId) role = "owner";
        else if (memberRoles[uid]) role = memberRoles[uid];

        return {uid, email, role};
      })
      .filter((member) => member !== null);

    console.log("[getBoardMembers] Returning", members.length, "members");
    return {members};
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("[getBoardMembers] ====== FUNCTION ERROR ======");
    console.error("[getBoardMembers] Error after", duration, "ms:", error);

    if (error instanceof HttpsError) {
      throw error;
    } else {
      throw new HttpsError("internal", "An unexpected error occurred");
    }
  } finally {
    const duration = Date.now() - startTime;
    console.log("[getBoardMembers] ====== FUNCTION END ======");
    console.log("[getBoardMembers] Total execution time:", duration, "ms");
  }
});
