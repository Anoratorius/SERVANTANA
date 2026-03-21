import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// Allowed IPs
const ALLOWED_IPS: string[] = [
  '212.58.102.31',
  '185.132.133.196',
];

// Set to true to enable IP restriction
const IP_RESTRICTION_ENABLED = true;

function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');

  return cfConnectingIp || realIp || forwardedFor?.split(',')[0]?.trim() || 'unknown';
}

const intlMiddleware = createMiddleware({
  locales: ['en', 'de'],
  defaultLocale: 'en',
  localePrefix: 'as-needed',
});

export default function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Always allow these paths (no IP check)
  if (
    pathname === '/coming-soon' ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.includes('.')
  ) {
    // For coming-soon, just return the page without i18n processing
    if (pathname === '/coming-soon') {
      return NextResponse.next();
    }
    return NextResponse.next();
  }

  // Check IP restriction
  if (IP_RESTRICTION_ENABLED) {
    const clientIP = getClientIP(request);

    // If no IPs in allowlist OR client IP not in allowlist, redirect to coming-soon
    if (ALLOWED_IPS.length === 0 || !ALLOWED_IPS.includes(clientIP)) {
      const url = request.nextUrl.clone();
      url.pathname = '/coming-soon';
      return NextResponse.redirect(url);
    }
  }

  // If IP is allowed (or no IPs in list), continue with normal i18n middleware
  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon|.*\\..*).*)'],
};
