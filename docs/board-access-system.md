# Board Access Control System

## תיאור המערכת החדשה

מערכת בקרת הגישה ללוחות מבוססת על תת-אוסף `boardMemberships` תחת כל משתמש:

### 1. תת-אוסף boardMemberships

תחת כל מסמך משתמש ב-`users` collection קיים תת-אוסף `boardMemberships`:

```
users/{userId}/boardMemberships/{boardId}
```

כל מסמך בתת-אוסף מכיל:
```typescript
{
  boardId: string,
  boardName: string,
  role: BoardRole, // 'owner' | 'editor' | 'viewer'
  joinedAt: Timestamp,
  updatedAt?: Timestamp
}
```

### 2. יתרונות הגישה החדשה

- **ביצועים מצוינים**: שליפה ישירה מתת-אוסף המשתמש
- **אינדקס אוטומטי**: Firestore יוצר אינדקס אוטומטי לתת-אוספים
- **גמישות**: אפשרות להוסיף מטה-דאטה לכל חברות (תאריך הצטרפות, עדכון אחרון וכו')
- **איחוד מידע**: שם הלוח נשמר עם החברות למהירות

## פונקציות עיקריות

### שליפת לוחות (New Implementation)
```typescript
// שליפת כל הלוחות של המשתמש מתת-אוסף
const allBoards = await getUserBoardsViaMemberships(userId);

// מסונן לבעלים בלבד
const ownedBoards = await getOwnedBoardsViaMemberships(userId);

// מסונן למשותפים בלבד
const sharedBoards = await getSharedBoardsViaMemberships(userId);
```

### ניהול חברות
```typescript
// הוספת/עדכון חברות
await updateUserBoardMembership(userId, boardId, 'editor', boardName);

// הסרת חברות
await removeUserBoardMembership(userId, boardId);
```

## יצירת לוח חדש

כאשר נוצר לוח חדש:

1. יוצר מסמך ב-`boards` collection
2. יוצר מסמך ב-`users/{userId}/boardMemberships/{boardId}`

```typescript
// יצירת הלוח
const newBoardRef = doc(collection(db, 'boards'));
await setDoc(newBoardRef, {
  ownerId: userId,
  members: { [userId]: 'owner' },
  sharedWith: {},
  // שדות נוספים...
});

// יצירת חברות בתת-אוסף
const membershipRef = doc(db, 'users', userId, 'boardMemberships', newBoardRef.id);
await setDoc(membershipRef, {
  boardId: newBoardRef.id,
  boardName: boardData.name,
  role: 'owner',
  joinedAt: Timestamp.now()
});
```

## Cloud Functions המעודכנות

### shareBoard
- בודקת חברות קיימת בתת-אוסף `boardMemberships`
- יוצרת הזמנה ב-`boardInvitations`

### acceptBoardInvitation
- יוצרת מסמך ב-`users/{userId}/boardMemberships/{boardId}`
- מעדכנת `sharedWith` בלוח
- מעדכנת סטטוס ההזמנה

### declineBoardInvitation
- מעדכנת רק את סטטוס ההזמנה

## שימוש בייצור

האפליקציה תומכת בגישה הדרגתית:
1. **משתמשים חדשים**: מקבלים תת-אוסף `boardMemberships` מההתחלה
2. **משתמשים קיימים**: ממשיכים להשתמש בגישה הישנה עד שיווסף להם תת-אוסף
3. **Fallback**: אם אין תת-אוסף, האפליקציה חוזרת לגישה הישנה

## Firestore Structure

```
📁 users
  📄 {userId}
    📁 boardMemberships
      📄 {boardId}
        - boardId: string
        - boardName: string  
        - role: 'owner' | 'editor' | 'viewer'
        - joinedAt: Timestamp
        - updatedAt?: Timestamp

📁 boards
  📄 {boardId}
    - ownerId: string
    - members: { [userId]: role }
    - sharedWith: { [userId]: role }
    - name, icon, createdAt...
    📁 tasks
    📁 categories

📁 boardInvitations
  📄 {invitationId}
    - boardId, recipientEmail, role, status...
```
