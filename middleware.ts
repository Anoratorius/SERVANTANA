import createMiddleware from 'next-intl/middleware';

export const runtime = 'edge';

const middleware = createMiddleware({
  locales: ['en', 'de'],
  defaultLocale: 'en',
  localePrefix: 'as-needed',
});

export default middleware;

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|icon|.*\\..*).*)'],
};
