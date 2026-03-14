import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { defineRouting } from 'next-intl/routing';

const routing = defineRouting({
  locales: ['en', 'de'],
  defaultLocale: 'en',
  localePrefix: 'always',
});

const intlMiddleware = createMiddleware(routing);

// German-speaking countries
const GERMAN_COUNTRIES = ['DE', 'AT', 'CH', 'LI'];

export default function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Check if this is a root path request (no locale prefix yet)
  const hasLocalePrefix = /^\/(en|de)(\/|$)/.test(pathname);

  // Get country from various CDN/hosting headers
  const country =
    request.headers.get('x-vercel-ip-country') ||
    request.headers.get('cf-ipcountry') ||
    request.headers.get('x-country-code') ||
    '';

  // Determine locale
  const locale = GERMAN_COUNTRIES.includes(country.toUpperCase()) ? 'de' : 'en';

  // Redirect paths without locale prefix to include locale
  if (!hasLocalePrefix && !pathname.startsWith('/api') && !pathname.startsWith('/_next')) {
    return NextResponse.redirect(new URL(`/${locale}${pathname}`, request.url));
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
