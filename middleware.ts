import createMiddleware from 'next-intl/middleware';
import { routing } from './src/i18n/routing';

const intlMiddleware = createMiddleware(routing);

export default intlMiddleware;

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|icon|.*\\..*).*)'],
};
