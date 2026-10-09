import { NextRequest, NextResponse } from 'next/server';

export async function proxy(request: NextRequest) {
  const token = request.cookies.get('anime_session')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/login?role=admin', request.url));
  }

  try {
    const response = await fetch('http://localhost:8080/api/auth/session', {
      headers: { Cookie: `anime_session=${token}` },
      cache: 'no-store',
    });
    if (!response.ok) {
      return NextResponse.redirect(new URL('/login?role=admin', request.url));
    }
    const result = await response.json();
    if (result.user?.role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL('/login?role=admin', request.url));
  }
}

export const config = {
  matcher: ['/admin/:path*'],
};