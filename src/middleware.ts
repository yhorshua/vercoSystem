import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value || null;

  // ✅ Rutas públicas donde no se necesita token
  const publicPaths = ['/login', '/register'];

  // Si no hay token y la ruta no es pública, redirige al login
  if (!token && !publicPaths.includes(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

// ✅ Aplica el middleware a todas las rutas excepto las públicas
export const config = {
  matcher: ['/((?!login|register|_next|api|favicon.ico|img).*)'],
};
