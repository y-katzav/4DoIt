// app/api/create-paypal-subscription/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PAYPAL_PLAN_IDS, type PlanType, type BillingInterval } from '@/lib/paypal';
import { verifyIdTokenSafely, getUserDocSafely } from '@/lib/firebase-admin';

// ✅ כפה ריצה ב-Node.js (נדרש ל-Buffer ול-Node APIs)
export const runtime = 'nodejs';

type CreateSubscriptionRequest = {
  plan: PlanType;
  billingInterval: BillingInterval;
  returnUrl: string;
  cancelUrl: string;
};

// ---------- Helpers ----------
const isLive = process.env.PAYPAL_ENVIRONMENT === 'live';
const PAYPAL_BASE = isLive ? 'https://api.paypal.com' : 'https://api.sandbox.paypal.com';

function J(status: number, body: any) {
  return NextResponse.json(body, { status });
}

function safeSlice(s = '', n = 600) {
  return s.length > n ? s.slice(0, n) + '…' : s;
}

async function readJsonSafe(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { __nonJsonBody: safeSlice(text) };
  }
}

export async function POST(request: NextRequest) {
  try {
    // ---------- 0) Validate ENV early ----------
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET ?? process.env.PAYPAL_SECRET;

    if (!clientId || !clientSecret || clientId.startsWith('your_')) {
      return J(400, {
        error: 'PayPal not configured',
        message: 'Missing/placeholder PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET',
      });
    }

    // אם אין לך Firebase Admin בפרודקשן – אפשר להחליף ל-Mock Mode במקום 500.
    if (!process.env.FIREBASE_ADMIN_PROJECT_ID) {
      return J(500, {
        error: 'Firebase Admin not configured',
        message: 'FIREBASE_ADMIN_PROJECT_ID is missing. (Mock mode disabled on this route)',
      });
    }

    // ---------- 1) Auth ----------
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return J(401, { error: 'Unauthorized', message: 'Missing Bearer token' });
    }

    let decoded;
    try {
      decoded = await verifyIdTokenSafely(authHeader.slice(7));
    } catch (e: any) {
      console.error('verifyIdTokenSafely failed:', safeSlice(String(e)));
      return J(401, { error: 'Unauthorized', message: 'Invalid auth token' });
    }
    const userId = decoded.uid;

    // ---------- 2) Parse & validate body ----------
    let body: CreateSubscriptionRequest;
    try {
      body = await request.json();
    } catch {
      return J(400, { error: 'Bad Request', message: 'Body must be valid JSON' });
    }

    const { plan, billingInterval, returnUrl, cancelUrl } = body || ({} as any);
    if (!plan || !billingInterval || !returnUrl || !cancelUrl) {
      return J(400, {
        error: 'Bad Request',
        message: 'Missing required fields: plan, billingInterval, returnUrl, cancelUrl',
        received: { plan, billingInterval, returnUrl, cancelUrl },
      });
    }

    // ---------- 3) Load user ----------
    let userDoc;
    try {
      userDoc = await getUserDocSafely(userId);
    } catch (e: any) {
      console.error('getUserDocSafely failed:', safeSlice(String(e)));
      return J(502, { error: 'Upstream Error', message: 'Failed to read user from Firestore' });
    }

    if (!userDoc?.exists) {
      return J(404, { error: 'User not found' });
    }
    const userData = userDoc.data() || {};

    // ---------- 4) Resolve plan id ----------
    const planId = PAYPAL_PLAN_IDS?.[plan]?.[billingInterval];
    console.log('🔍 PayPal Plan Details:', {
      plan,
      billingInterval,
      planId,
      // לא להדפיס את כל המיפוי בפרודקשן אם הוא גדול
    });

    if (!planId || planId.includes('mock') || planId.startsWith('P-XXXX')) {
      return J(400, {
        error: 'Plan not configured',
        message: 'Missing or placeholder planId in PAYPAL_PLAN_IDS',
        requestedPlan: plan,
        requestedInterval: billingInterval,
      });
    }

    // ---------- 5) Get PayPal access token ----------
    const tokenResp = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'en_US',
        Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!tokenResp.ok) {
      const raw = await tokenResp.text().catch(() => '');
      console.error('PayPal token request failed:', tokenResp.status, safeSlice(raw));
      return J(502, {
        error: 'PayPal token request failed',
        status: tokenResp.status,
        bodyPreview: safeSlice(raw),
      });
    }

    const tokenJson = await readJsonSafe(tokenResp);
    const accessToken = (tokenJson as any).access_token;
    if (!accessToken) {
      console.error('Invalid token response:', tokenJson);
      return J(502, {
        error: 'Invalid PayPal token response',
        message: 'Missing access_token',
        bodyPreview: safeSlice(JSON.stringify(tokenJson)),
      });
    }

    // ---------- 6) Create subscription ----------
    const subscriptionData = {
      plan_id: planId,
      subscriber: {
        name: {
          given_name: (userData.displayName || 'User').split(' ')[0] || 'User',
          surname: (userData.displayName || 'Name').split(' ').slice(1).join(' ') || 'Name',
        },
        email_address: userData.email,
      },
      application_context: {
        brand_name: '4DoIt Task Management',
        locale: 'en-US',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'SUBSCRIBE_NOW',
        payment_method: {
          payer_selected: 'PAYPAL',
          payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED',
        },
        return_url: returnUrl,
        cancel_url: cancelUrl,
      },
      custom_id: userId, // לשיוך ב-webhooks
    };

    console.log('📤 Sending subscriptionData to PayPal:', JSON.stringify(subscriptionData, null, 2));

    const subResp = await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(subscriptionData),
    });

    const subJson = await readJsonSafe(subResp);
    if (!subResp.ok) {
      console.error('PayPal subscription failed:', subResp.status, safeSlice(JSON.stringify(subJson)));
      return J(502, {
        error: 'PayPal subscription failed',
        status: subResp.status,
        bodyPreview: safeSlice(JSON.stringify(subJson)),
      });
    }

    const subscriptionId = (subJson as any).id;
    const approvalUrl =
      Array.isArray((subJson as any).links) &&
      (subJson as any).links.find((l: any) => l.rel === 'approve')?.href;

    if (!subscriptionId) {
      console.error('Missing subscription id:', subJson);
      return J(502, { error: 'Invalid PayPal subscription response', message: 'Missing id' });
    }

    // ---------- 7) Persist ----------
    try {
      await userDoc.ref.update({
        paypalSubscriptionId: subscriptionId,
        pendingPlan: plan,
        pendingBillingInterval: billingInterval,
        subscriptionStatus: 'approval_pending',
        updatedAt: new Date(),
      });
    } catch (e: any) {
      console.error('Firestore update failed:', safeSlice(String(e)));
      // מחזירים 200 כדי שהלקוח יוכל להמשיך לאישור ב-PayPal, אך עם אזהרה
      return J(200, {
        subscriptionId,
        approvalUrl: approvalUrl || null,
        status: (subJson as any).status,
        warning: 'Subscription created at PayPal but failed to update Firestore',
      });
    }

    // ---------- 8) Done ----------
    return J(200, {
      subscriptionId,
      approvalUrl: approvalUrl || null,
      status: (subJson as any).status,
    });
  } catch (err: any) {
    // fallback יחיד – כדי שלא יוחזר HTML לעולם
    console.error('Unhandled error in create-paypal-subscription:', safeSlice(String(err)));
    return J(500, { error: 'Failed to create subscription', reason: 'Unhandled' });
  }
}
