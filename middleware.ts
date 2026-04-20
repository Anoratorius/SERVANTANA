import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { jwtDecode } from 'jwt-decode';
import { routing } from '@/i18n/routing';

export const runtime = 'edge';

// JWT token structure from NextAuth
interface SessionToken {
  id?: string;
  role?: string;
  isEmailVerified?: boolean;
  locationVerified?: boolean;
  onboardingComplete?: boolean;
  exp?: number;
}

// Allowed IPs from environment variable (comma-separated)
// Fallback to hardcoded for now, but env var takes precedence
const ALLOWED_IPS: string[] = (process.env.ALLOWED_IPS || '212.58.102.31,185.115.5.210,205.147.17.23,205.147.17.13')
  .split(',')
  .map(ip => ip.trim())
  .filter(Boolean);

// Set to true to enable IP restriction
const IP_RESTRICTION_ENABLED = false;

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

const intlMiddleware = createMiddleware(routing);

// Static file extensions that bypass IP check
const STATIC_EXTENSIONS = /\.(ico|png|jpg|jpeg|gif|svg|css|js|woff|woff2|ttf|eot|json|xml|txt|webp|mp4|webm|mp3|wav|pdf)$/i;

// Public API routes that don't need IP restriction
const PUBLIC_API_ROUTES = ['/api/ip'];

// Paths that bypass email verification check
const EMAIL_VERIFICATION_BYPASS_PATHS = [
  '/',
  '/coming-soon',
  '/email-verification-required',
  '/verify-email',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
];

// Paths that bypass worker onboarding check
const WORKER_ONBOARDING_BYPASS_PATHS = [
  '/coming-soon',
  '/email-verification-required',
  '/verify-email',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/worker/onboarding',
  '/admin',
  '/api',
];

// Check if path should bypass email verification
function shouldBypassEmailVerification(pathname: string): boolean {
  // Remove locale prefix if present
  const pathWithoutLocale = pathname.replace(/^\/(en|de|ru|uk|ka)/, '') || '/';

  // Check exact matches and prefixes
  for (const bypassPath of EMAIL_VERIFICATION_BYPASS_PATHS) {
    if (pathWithoutLocale === bypassPath || pathWithoutLocale.startsWith(bypassPath + '/')) {
      return true;
    }
  }

  // All API auth routes bypass
  if (pathWithoutLocale.startsWith('/api/auth')) {
    return true;
  }

  return false;
}

// Check if path should bypass worker onboarding check
function shouldBypassWorkerOnboarding(pathname: string): boolean {
  // Remove locale prefix if present
  const pathWithoutLocale = pathname.replace(/^\/(en|de|ru|uk|ka)/, '') || '/';

  // Check exact matches and prefixes
  for (const bypassPath of WORKER_ONBOARDING_BYPASS_PATHS) {
    if (pathWithoutLocale === bypassPath || pathWithoutLocale.startsWith(bypassPath + '/')) {
      return true;
    }
  }

  return false;
}

// Get session token from cookie and decode it
function getSessionToken(request: NextRequest): SessionToken | null {
  // NextAuth stores session in authjs.session-token (production) or next-auth.session-token (dev)
  const tokenCookie = request.cookies.get('authjs.session-token')
    || request.cookies.get('next-auth.session-token')
    || request.cookies.get('__Secure-authjs.session-token');

  if (!tokenCookie?.value) {
    return null;
  }

  try {
    return jwtDecode<SessionToken>(tokenCookie.value);
  } catch {
    return null;
  }
}

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

  // Check email verification for authenticated users
  if (!shouldBypassEmailVerification(pathname)) {
    const token = getSessionToken(request);

    // If user is logged in but email not verified, redirect to verification page
    if (token?.id && token.isEmailVerified === false) {
      const url = request.nextUrl.clone();
      // Preserve locale if present
      const localeMatch = pathname.match(/^\/(en|de|ru|uk|ka)/);
      const locale = localeMatch ? localeMatch[1] : 'en';
      url.pathname = `/${locale}/email-verification-required`;
      return NextResponse.redirect(url);
    }
  }

  // Check worker onboarding for WORKER users
  if (!shouldBypassWorkerOnboarding(pathname)) {
    const token = getSessionToken(request);

    // If user is a WORKER with verified location but incomplete onboarding, redirect
    if (
      token?.id &&
      token.role === 'WORKER' &&
      token.locationVerified === true &&
      token.onboardingComplete !== true
    ) {
      const url = request.nextUrl.clone();
      const localeMatch = pathname.match(/^\/(en|de|ru|uk|ka)/);
      const locale = localeMatch ? localeMatch[1] : 'en';
      url.pathname = `/${locale}/worker/onboarding`;
      return NextResponse.redirect(url);
    }
  }

  // If IP is allowed, continue with normal i18n middleware
  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon|.*\\..*).*)'],
};
