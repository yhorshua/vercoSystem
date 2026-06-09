import { NextRequest, NextResponse } from "next/server";

const PUBLIC_ROUTES = ["/login", "/register", "/no-autorizado"];

const ROUTE_ROLES: Record<string, string[]> = {
  "/home": [
    "Administrador",
    "Jefe Ventas",
    "Vendedor",
    "Tienda",
    "Emprendedor",
    "Vendedor Web",
    "Delivery",
  ],

  "/register-requested": [
    "Administrador",
    "Jefe Ventas",
    "Vendedor",
    "Vendedor Web",
  ],

  "/order-list": [
    "Administrador",
    "Jefe Ventas",
    "Vendedor",
    "Vendedor Web",
  ],

  "/cotizacion": [
    "Administrador",
    "Jefe Ventas",
    "Vendedor",
    "Tienda",
    "Vendedor Web",
  ],

  "/stock": [
    "Administrador",
    "Jefe Ventas",
    "Vendedor",
    "Tienda",
    "Vendedor Web",
  ],

  "/clients": [
    "Administrador",
    "Jefe Ventas",
    "Vendedor",
    "Vendedor Web",
  ],

  "/estadoCuenta": [
    "Administrador",
    "Jefe Ventas",
  ],

  "/registerweb": [
    "Administrador",
    "Vendedor Web",
    "Emprendedor",
  ],

  "/listWeb": [
    "Administrador",
    "Jefe Ventas",
    "Vendedor Web",
    "Delivery",
  ],

  "/qr": ["Administrador"],
  "/production": ["Administrador"],
  "/listproducts": ["Administrador"],
  "/register-product": ["Administrador"],
  "/inventorySystem": ["Administrador"],
  "/actualizarStock": ["Administrador"],

  "/register-stock": [
    "Administrador",
    "Tienda",
  ],

  "/report-client": ["Administrador"],
  "/report-vendedor": ["Administrador"],
  "/report-pedidos": ["Administrador"],
  "/report-fechas": ["Administrador"],
  "/warehouses": ["Administrador"],
  "/user": ["Administrador"],

  "/sale": ["Tienda", "Administrador"],
  "/caja": ["Tienda", "Administrador"],
  "/reportsale": ["Tienda", "Administrador"],
  "/asistencia": ["Tienda", "Administrador"],
  "/change": ["Tienda", "Administrador"],

  "/pedidos": ["Emprendedor", "Administrador"],
  "/dashboardPedido": ["Emprendedor", "Administrador"],
  "/detailPedido": ["Emprendedor", "Administrador"],
  "/listPedidos": ["Emprendedor", "Administrador"],
};

function normalizePath(pathname: string) {
  if (pathname !== "/" && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

function getAllowedRoles(pathname: string) {
  const cleanPathname = normalizePath(pathname);

  const matchedRoute = Object.keys(ROUTE_ROLES)
    .sort((a, b) => b.length - a.length)
    .find(
      (route) =>
        cleanPathname === route ||
        cleanPathname.startsWith(`${route}/`)
    );

  return matchedRoute ? ROUTE_ROLES[matchedRoute] : null;
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value).trim();
  } catch {
    return value.trim();
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get("access_token")?.value;
  const roleCookie = request.cookies.get("role")?.value || "";
  const role = safeDecode(roleCookie);

  const cleanPathname = normalizePath(pathname);

  console.log("[MIDDLEWARE AUTH]", {
    pathname: cleanPathname,
    hasToken: Boolean(token),
    role,
  });

  // Ruta raíz
  if (cleanPathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = token ? "/home" : "/login";
    return NextResponse.redirect(url);
  }

  // Rutas públicas
  if (isPublicRoute(cleanPathname)) {
    if (cleanPathname === "/login" && token) {
      const url = request.nextUrl.clone();
      url.pathname = "/home";
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }

  // Si no tiene token, mandarlo al login
  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", cleanPathname);
    return NextResponse.redirect(url);
  }

  const allowedRoles = getAllowedRoles(cleanPathname);

  // Si la ruta no está registrada, bloquear
  if (!allowedRoles) {
    const url = request.nextUrl.clone();
    url.pathname = "/no-autorizado";
    return NextResponse.redirect(url);
  }

  // Si no tiene rol o su rol no está permitido
  if (!role || !allowedRoles.includes(role)) {
    const url = request.nextUrl.clone();
    url.pathname = "/no-autorizado";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|img|.*\\..*).*)",
  ],
};