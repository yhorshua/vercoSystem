import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {

  const token = request.cookies.get('access_token')?.value;

  const publicPaths = ['/login', '/register'];

  const isPublicPath = publicPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  );

  // Usuario logueado intentando ir al login
  if (token && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/home', request.url));
  }

  // Usuario no autenticado
  if (!token && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|api|favicon.ico|img).*)'],
};

