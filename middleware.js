import { NextResponse } from 'next/server';

export function middleware(req) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/login') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get('jigsaw_session')?.value;
  const validTokens = [process.env.AUTH_JIGSAW_TOKEN, process.env.AUTH_BOOM_TOKEN];

  if (!token || !validTokens.includes(token)) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api/login|_next/static|_next/image|favicon.ico).*)'],
};