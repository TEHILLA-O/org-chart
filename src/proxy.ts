import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/login' || pathname.startsWith('/login/')) {
    return withCsp(NextResponse.redirect(new URL('/dashboard', request.nextUrl.origin)), pathname);
  }

  return withCsp(NextResponse.next(), pathname);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
