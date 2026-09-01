import { NextResponse } from 'next/server';
import { auth } from '@/auth';

function withCsp(response: NextResponse, pathname: string) {
  const frameAncestors = pathname.startsWith('/embed') ? '*' : "'none'";
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self'",
      `frame-ancestors ${frameAncestors}`,
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  );
  return response;
}

export const proxy = auth((request) => {
  const { pathname } = request.nextUrl;
  const isPublic =
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/embed') ||
    pathname.startsWith('/share') ||
    pathname.startsWith('/api/v1/public');

  if (!request.auth && !isPublic) {
    const login = new URL('/login', request.nextUrl.origin);
    login.searchParams.set('callbackUrl', pathname);
    return withCsp(NextResponse.redirect(login), pathname);
  }

  if (request.auth && pathname === '/login') {
    return withCsp(NextResponse.redirect(new URL('/dashboard', request.nextUrl.origin)), pathname);
  }

  return withCsp(NextResponse.next(), pathname);
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
