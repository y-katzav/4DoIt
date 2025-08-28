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

export const deleteBoard = onCall<{ boardId: string }>(async (request) => {
  const startTime = Date.now();
  console.log("[deleteBoard] ====== FUNCTION START ======");
  console.log("[deleteBoard] Request data:", JSON.stringify(request.data));

  try {
    if (!request.auth || !request.auth.uid) {
      console.error("[deleteBoard] Authentication failed");
      throw new HttpsError(
        "unauthenticated",
        "You must be logged in to delete a board."
      );
    }
    console.log("[deleteBoard] Authentication passed - uid:",
      request.auth.uid);

    const {boardId} = request.data;
    console.log("[deleteBoard] Board ID:", boardId);

    if (!boardId) {
      console.error("[deleteBoard] Missing board ID");
      throw new HttpsError("invalid-argument", "Missing board ID.");
    }

    // בדיקה שהלוח קיים ושהמשתמש הוא הבעלים
    console.log("[deleteBoard] Checking board ownership");
    const boardRef = db.collection("boards").doc(boardId);
    const boardSnap = await boardRef.get();

    if (!boardSnap.exists) {
      console.error("[deleteBoard] Board not found:", boardId);
      throw new HttpsError("not-found", "Board not found.");
    }

    const boardData = boardSnap.data();
    const callingUserId = request.auth.uid;

    if (boardData?.ownerId !== callingUserId) {
      console.error("[deleteBoard] Permission denied - not owner");
      throw new HttpsError("permission-denied",
        "Only the board owner can delete the board.");
    }

    console.log("[deleteBoard] Permission granted - proceeding with deletion");

    // מחיקת כל ה-boardMemberships של כל החברים
    const memberRoles = boardData?.members || {};
    const allMemberUids = Object.keys(memberRoles);

    console.log("[deleteBoard] Deleting boardMemberships for",
      allMemberUids.length, "members");

    const batch = db.batch();

    // מחיקת boardMemberships לכל החברים (כולל הבעלים)
    allMemberUids.forEach((uid) => {
      const membershipRef = db.collection("users")
        .doc(uid).collection("boardMemberships").doc(boardId);
      batch.delete(membershipRef);
      console.log("[deleteBoard] Scheduled deletion of membership for:", uid);
    });

    // מחיקת כל המשימות של הלוח
    console.log("[deleteBoard] Deleting all tasks for board:", boardId);
    const tasksSnapshot = await db.collection("boards").doc(boardId)
      .collection("tasks").get();
    tasksSnapshot.docs.forEach((taskDoc) => {
      batch.delete(taskDoc.ref);
      console.log("[deleteBoard] Scheduled deletion of task:", taskDoc.id);
    });

    // מחיקת כל הקטגוריות של הלוח
    console.log("[deleteBoard] Deleting all categories for board:", boardId);
    const categoriesSnapshot = await db.collection("boards").doc(boardId)
      .collection("categories").get();
    categoriesSnapshot.docs.forEach((categoryDoc) => {
      batch.delete(categoryDoc.ref);
      console.log("[deleteBoard] Scheduled category deletion:", categoryDoc.id);
    });

    // מחיקת כל הזמנות הלוח
    console.log("[deleteBoard] Deleting all invitations for board:", boardId);
    const invitationsSnapshot = await db.collection("boardInvitations")
      .where("boardId", "==", boardId).get();
    invitationsSnapshot.docs.forEach((invitationDoc) => {
      batch.delete(invitationDoc.ref);
      console.log("[deleteBoard] Scheduled invitation del:", invitationDoc.id);
    });

    // מחיקת הלוח עצמו
    batch.delete(boardRef);
    console.log("[deleteBoard] Scheduled deletion of board:", boardId);

    await batch.commit();
    console.log("[deleteBoard] All deletions committed successfully");

    return {
      success: true,
      message: `Board "${boardData?.name || boardId}" deleted successfully.`,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("[deleteBoard] ====== FUNCTION ERROR ======");
    console.error("[deleteBoard] Error after", duration, "ms:", error);

    if (error instanceof HttpsError) {
      throw error;
    } else {
      throw new HttpsError("internal", "An unexpected error occurred");
    }
  } finally {
    const duration = Date.now() - startTime;
    console.log("[deleteBoard] ====== FUNCTION END ======");
    console.log("[deleteBoard] Total execution time:", duration, "ms");
  }
});

/**
 * 🔧 ADMIN FUNCTION: ניקוי כלל-מערכתי של לוחות פגומים
 * פונקציה זו רצה עם הרשאות אדמין ויכולה למחוק לוחות של כל המשתמשים
 * ⚠️ זהירות: פונקציה מנהלתית שצריך להריץ בזהירות!
 */
export const cleanupCorruptedBoards = onCall(async () => {
  const startTime = Date.now();
  console.log("[cleanupCorruptedBoards] ====== ADMIN FUNCTION START ======");

  try {
    // בדיקת הרשאות אדמין (אופציונלי - ניתן להוסיף בהמשך)
    // if (!request.auth || !isAdmin(request.auth.uid)) {
    //   throw new HttpsError("permission-denied", "Admin access required");
    // }

    console.log("[cleanupCorruptedBoards] Starting system-wide scan...");

    // שלב 1: סריקת כל הלוחות במערכת
    const boardsSnapshot = await db.collection("boards").get();
    console.log(
      "[cleanupCorruptedBoards] Scanning",
      boardsSnapshot.size,
      "boards"
    );

    const corruptedBoards: string[] = [];
    const batch = db.batch();

    // זיהוי לוחות פגומים
    boardsSnapshot.docs.forEach((boardDoc) => {
      const boardData = boardDoc.data();
      const isCorrupted = !boardData ||
                         !boardData.name ||
                         !boardData.icon ||
                         !boardData.ownerId ||
                         typeof boardData.name !== "string" ||
                         typeof boardData.icon !== "string" ||
                         typeof boardData.ownerId !== "string" ||
                         boardData.name.trim() === "" ||
                         boardData.icon.trim() === "" ||
                         boardData.ownerId.trim() === "";

      if (isCorrupted) {
        console.warn(
          "[cleanupCorruptedBoards] Found corrupted board:",
          boardDoc.id,
          {
            hasName: !!boardData?.name,
            hasIcon: !!boardData?.icon,
            hasOwner: !!boardData?.ownerId,
            nameType: typeof boardData?.name,
            iconType: typeof boardData?.icon,
            ownerType: typeof boardData?.ownerId,
            nameEmpty: boardData?.name?.trim() === "",
            iconEmpty: boardData?.icon?.trim() === "",
            ownerEmpty: boardData?.ownerId?.trim() === "",
          }
        );

        corruptedBoards.push(boardDoc.id);
        batch.delete(boardDoc.ref);
      }
    });

    // מחיקת לוחות פגומים
    let deletedBoardsCount = 0;
    let cleanedMembershipsCount = 0;

    if (corruptedBoards.length > 0) {
      await batch.commit();
      deletedBoardsCount = corruptedBoards.length;
      console.log(
        "[cleanupCorruptedBoards] Deleted",
        deletedBoardsCount,
        "corrupted boards:",
        corruptedBoards
      );

      // שלב 2: ניקוי boardMemberships של הלוחות הפגומים
      console.log("[cleanupCorruptedBoards] Cleaning memberships...");
      const usersSnapshot = await db.collection("users").get();

      const membershipCleanupBatch = db.batch();

      for (const boardId of corruptedBoards) {
        for (const userDoc of usersSnapshot.docs) {
          const membershipRef = userDoc.ref
            .collection("boardMemberships")
            .doc(boardId);
          membershipCleanupBatch.delete(membershipRef);
          cleanedMembershipsCount++;
        }
      }

      if (cleanedMembershipsCount > 0) {
        await membershipCleanupBatch.commit();
        console.log(
          "[cleanupCorruptedBoards] Cleaned",
          cleanedMembershipsCount,
          "membership references"
        );
      }
    } else {
      console.log("[cleanupCorruptedBoards] No corrupted boards found");
    }

    const duration = Date.now() - startTime;
    console.log(
      "[cleanupCorruptedBoards] Cleanup completed in",
      duration,
      "ms"
    );

    return {
      success: true,
      scannedCount: boardsSnapshot.size,
      deletedBoardsCount,
      cleanedMembershipsCount,
      deletedBoards: corruptedBoards,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("[cleanupCorruptedBoards] ====== FUNCTION ERROR ======");
    console.error(
      "[cleanupCorruptedBoards] Error after",
      duration,
      "ms:",
      error
    );

    if (error instanceof HttpsError) {
      throw error;
    } else {
      throw new HttpsError(
        "internal",
        "An unexpected error occurred during cleanup"
      );
    }
  } finally {
    const duration = Date.now() - startTime;
    console.log("[cleanupCorruptedBoards] ====== ADMIN FUNCTION END ======");
    console.log(
      "[cleanupCorruptedBoards] Total execution time:",
      duration,
      "ms"
    );
  }
});
