import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { UserRole } from "@/shared/constants/user-role";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "cio.test:3000";

const PROTOCOL = process.env.NODE_ENV === "production" ? "https" : "http";

// Rutas a las que un usuario con únicamente el rol DEBTOR tiene acceso.
// Debe reflejar shared/ui/layout/menus.tsx (grupo "verplichtingen").
const DEBTOR_ALLOWED_PREFIXES = [
  "/dashboard",
  "/payments",
  "/agreements",
  "/financial-report",
  "/block-status",
  "/settings",
  "/logout",
];

const STAFF_ROLES: UserRole[] = [
  UserRole.PLATFORM_OWNER,
  UserRole.TENANT_ADMIN,
  UserRole.AGENT,
  UserRole.EMPLOYEE,
  UserRole.BAILIFF,
  UserRole.LAWYER,
  UserRole.BANK,
];

export async function middleware(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const hostname = req.headers.get("host") || "";
  const subdomain = hostname.split(".")[0];

  const isAuthDomain = subdomain === "auth";

  const { pathname } = req.nextUrl;

  // ========================================
  // RUTAS PÚBLICAS
  // ========================================

  const publicRoutes = [
    "/login",
    "/signup",
    "/forgot-password",
    "/logout",
    "/payment/return",
    "/invitation",
  ];

  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  // ========================================
  // USUARIO NO AUTENTICADO
  // ========================================

  if (!token) {
    // Permitir acceso a auth domain
    if (isAuthDomain && isPublicRoute) {
      return NextResponse.next();
    }

    // Permitir que logout termine correctamente
    if (pathname === "/logout") {
      return NextResponse.next();
    }

    // Redirigir siempre al login central
    return NextResponse.redirect(
      new URL(`${PROTOCOL}://auth.${ROOT_DOMAIN}/login`),
    );
  }

  // ========================================
  // USUARIO AUTENTICADO EN AUTH DOMAIN
  // ========================================

  if (token && isAuthDomain && (pathname === "/login" || pathname === "/")) {
    return NextResponse.redirect(
      new URL(`${PROTOCOL}://${token.subdomain}.${ROOT_DOMAIN}/dashboard`),
    );
  }

  // ========================================
  // VALIDAR TENANT ACTIVO
  // ========================================

  if (!isAuthDomain) {
    const tenantSubdomain = token.subdomain;

    if (tenantSubdomain && tenantSubdomain !== subdomain) {
      return NextResponse.redirect(
        new URL(`${PROTOCOL}://${tenantSubdomain}.${ROOT_DOMAIN}/dashboard`),
      );
    }
  }

  // ========================================
  // RESTRINGIR ROL DEBTOR A SUS PROPIAS RUTAS
  // ========================================

  const roles = token.roles || [];
  const isPureDebtor =
    roles.includes(UserRole.DEBTOR) &&
    !roles.some((role) => STAFF_ROLES.includes(role));

  if (!isAuthDomain && isPureDebtor) {
    const isAllowed = DEBTOR_ALLOWED_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );

    if (!isAllowed) {
      return NextResponse.redirect(
        new URL(`${PROTOCOL}://${subdomain}.${ROOT_DOMAIN}/dashboard`),
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
