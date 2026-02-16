import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  // Obtener el token desde las cabeceras 'Authorization' si está presente
  const token = request.headers.get('Authorization')?.replace('Bearer ', '') || null;
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
