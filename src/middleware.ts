import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value || null;
  const publicPaths = ['/login', '/register'];

  // Si ya tiene token e intenta ir al login, mándalo al home
  if (token && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/home', request.url));
  }

  // Si no tiene token y no está en una ruta pública, redirigir al login
  if (!token && !publicPaths.includes(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

// Aplica a todas las rutas menos las públicas
export const config = {
  matcher: ['/((?!login|register|_next|api|favicon.ico|img).*)'],
};
