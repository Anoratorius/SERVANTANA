import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from '@/i18n/routing';

const intlMiddleware = createMiddleware(routing);

// German-speaking countries
const GERMAN_COUNTRIES = ['DE', 'AT', 'CH', 'LI'];

export default function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Check if this is a root path request (no locale prefix yet)
  const hasLocalePrefix = /^\/(en|de)(\/|$)/.test(pathname);

  if (!hasLocalePrefix && pathname === '/') {
    // Get country from various CDN/hosting headers
    const country =
      request.headers.get('x-vercel-ip-country') ||
      request.headers.get('cf-ipcountry') ||
      request.headers.get('x-country-code') ||
      '';

    // Redirect to German if from German-speaking country, otherwise English
    const locale = GERMAN_COUNTRIES.includes(country.toUpperCase()) ? 'de' : 'en';

    return NextResponse.redirect(new URL(`/${locale}`, request.url));
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: [
    '/',
    '/(en|de)/:path*',
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
};
