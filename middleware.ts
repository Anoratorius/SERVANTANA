import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// Allowed IPs from environment variable (comma-separated)
// Fallback to hardcoded for now, but env var takes precedence
const ALLOWED_IPS: string[] = (process.env.ALLOWED_IPS || '212.58.102.31,185.115.5.210,205.147.17.23,205.147.17.13')
  .split(',')
  .map(ip => ip.trim())
  .filter(Boolean);

// Set to true to enable IP restriction
const IP_RESTRICTION_ENABLED = process.env.IP_RESTRICTION_ENABLED !== 'false';

function getClientIP(request: NextRequest): string {
  // On Vercel Edge, x-vercel-forwarded-for may not be set
  // Fall back to x-forwarded-for which Vercel also sets
  const vercelForwardedFor = request.headers.get('x-vercel-forwarded-for');
  if (vercelForwardedFor) {
    return vercelForwardedFor.split(',')[0].trim();
  }

  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  return 'unknown';
}

const intlMiddleware = createMiddleware({
  locales: ['en', 'de'],
  defaultLocale: 'en',
  localePrefix: 'as-needed',
});

// Static file extensions that bypass IP check
const STATIC_EXTENSIONS = /\.(ico|png|jpg|jpeg|gif|svg|css|js|woff|woff2|ttf|eot|json|xml|txt|webp|mp4|webm|mp3|wav|pdf)$/i;

// Public API routes that don't need IP restriction
const PUBLIC_API_ROUTES = ['/api/ip'];

export default function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Always allow coming-soon page
  if (pathname === '/coming-soon') {
    return NextResponse.next();
  }

  // Allow Next.js internals
  if (pathname.startsWith('/_next/')) {
    return NextResponse.next();
  }

  // Allow static files (specific extensions only)
  if (STATIC_EXTENSIONS.test(pathname)) {
    return NextResponse.next();
  }

  // Handle API routes
  if (pathname.startsWith('/api/')) {
    // Public API routes bypass IP check
    if (PUBLIC_API_ROUTES.includes(pathname)) {
      return NextResponse.next();
    }
    // Protected API routes get IP check
    if (IP_RESTRICTION_ENABLED) {
      const clientIP = getClientIP(request);
      if (ALLOWED_IPS.length === 0 || !ALLOWED_IPS.includes(clientIP)) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }
    return NextResponse.next();
  }

  // Check IP restriction for all other routes
  if (IP_RESTRICTION_ENABLED) {
    const clientIP = getClientIP(request);

    if (ALLOWED_IPS.length === 0 || !ALLOWED_IPS.includes(clientIP)) {
      const url = request.nextUrl.clone();
      url.pathname = '/coming-soon';
      return NextResponse.redirect(url);
    }
  }

  // If IP is allowed, continue with normal i18n middleware
  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon|.*\\..*).*)'],
};
