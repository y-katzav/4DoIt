import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase-admin';
import { ensureUserSubscriptionFieldsAdmin } from '@/lib/user-migration';

const boardIcons = [
  'Briefcase', 'Home', 'ShoppingCart', 'Heart', 'Star', 'Lightbulb', 
  'Calendar', 'Book', 'Music', 'Camera', 'Gamepad2', 'Coffee',
  'Plane', 'Car', 'Bike', 'Mountain', 'Sun', 'Moon'
];

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;
    const userEmail = decodedToken.email;

    console.log('🔄 Creating default data for user:', userId);

    if (!userEmail) {
      return NextResponse.json({ error: 'User email not found' }, { status: 400 });
    }

    // Check if db is available
    if (!db) {
      console.error('❌ Firebase Admin db not available');
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Step 1: Create/update user document with all subscription fields
    const userRef = db.collection('users').doc(userId);
    await userRef.set({
      email: userEmail,
      displayName: userEmail.split('@')[0],
      createdAt: new Date(),
      // Subscription fields - initialized as free user
      plan: 'free',
      billingInterval: null,
      subscriptionStatus: 'free',
      paymentStatus: null,
      subscriptionStartDate: null,
      subscriptionEndDate: null,
      paypalSubscriptionId: null,
      pendingPlan: null,
      pendingBillingInterval: null,
      lastPaymentDate: null,
      updatedAt: new Date(),
    }, { merge: true });

    console.log('✅ User document created/updated');

    // Step 2: Create default board
    const boardRef = db.collection('boards').doc();
    await boardRef.set({
      name: 'My Tasks',
      icon: boardIcons[0],
      createdAt: new Date(),
      ownerId: userId,
      members: { [userId]: 'owner' },
      sharedWith: {},
    });

    console.log('✅ Default board created:', boardRef.id);

    // Step 3: Add board membership to user's subcollection
    const membershipRef = db.collection('users').doc(userId).collection('boardMemberships').doc(boardRef.id);
    await membershipRef.set({
      boardId: boardRef.id,
      boardName: 'My Tasks',
      role: 'owner',
      joinedAt: new Date(),
    });

    console.log('✅ Board membership created');

    // Step 4: Create default categories
    const categories = [
      { name: 'Work', color: 'bg-sky-500' },
      { name: 'Personal', color: 'bg-emerald-500' },
      { name: 'Shopping List', color: 'bg-amber-500' },
    ];

    const categoryIds: { [name: string]: string } = {};

    for (const category of categories) {
      const categoryRef = db.collection('boards').doc(boardRef.id).collection('categories').doc();
      await categoryRef.set({
        ...category,
        createdAt: new Date(),
      });
      categoryIds[category.name] = categoryRef.id;
    }

    console.log('✅ Default categories created');

    // Step 5: Create default tasks
    const tasks = [
      { description: 'Prepare presentation for Monday meeting', priority: 'high', dueDate: getNextMonday(), categoryName: 'Work' },
      { description: 'Follow up with the design team', priority: 'medium', dueDate: null, categoryName: 'Work' },
      { description: 'Book a dentist appointment', priority: 'medium', dueDate: null, categoryName: 'Personal' },
      { description: 'Go for a run', priority: 'low', dueDate: null, categoryName: 'Personal' },
      { description: 'Milk', priority: 'low', dueDate: null, categoryName: 'Shopping List' },
      { description: 'Bread', priority: 'low', dueDate: null, categoryName: 'Shopping List' },
      { description: 'Eggs', priority: 'low', dueDate: null, categoryName: 'Shopping List' },
    ];

    for (const task of tasks) {
      const taskRef = db.collection('boards').doc(boardRef.id).collection('tasks').doc();
      await taskRef.set({
        description: task.description,
        priority: task.priority,
        categoryId: categoryIds[task.categoryName],
        boardId: boardRef.id,
        completed: false,
        createdAt: new Date(),
        dueDate: task.dueDate,
        fileName: '',
        fileUrl: '',
      });
    }

    console.log('✅ Default tasks created');

    return NextResponse.json({ 
      success: true,
      boardId: boardRef.id,
      message: 'Default data created successfully'
    });

  } catch (error) {
    console.error('❌ Error creating default data:', error);
    return NextResponse.json(
      { error: 'Failed to create default data' },
      { status: 500 }
    );
  }
}

function getNextMonday(): Date {
  const today = new Date();
  const daysUntilMonday = (8 - today.getDay()) % 7;
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + daysUntilMonday);
  return nextMonday;
}
