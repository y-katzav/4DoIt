import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase-admin';
import { ensureUserSubscriptionFieldsAdmin } from '@/lib/user-migration';

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

    console.log('🔄 Ensuring subscription fields for user:', userId);
    
    // Ensure the current user has all required subscription fields
    await ensureUserSubscriptionFieldsAdmin(userId, db);

    return NextResponse.json({ 
      success: true,
      message: 'User subscription fields verified/updated'
    });

  } catch (error) {
    console.error('Error in ensure-user-fields:', error);
    return NextResponse.json(
      { error: 'Failed to ensure user fields' },
      { status: 500 }
    );
  }
}
