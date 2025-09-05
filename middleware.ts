// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Block PayPal RUM (Real User Monitoring) calls that cause 404 errors
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.paypal.com https://*.paypalobjects.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://*.paypal.com https://*.paypalobjects.com",
    "connect-src 'self' https://api.sandbox.paypal.com https://api.paypal.com https://*.firebase.googleapis.com https://www.gstatic.com",
    // Block PayPal RUM specifically
    "connect-src 'self' https://api.sandbox.paypal.com https://api.paypal.com https://*.firebase.googleapis.com https://www.gstatic.com",
    "frame-src https://*.paypal.com",
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
  ].join('; ');

  response.headers.set('Content-Security-Policy', csp);

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
