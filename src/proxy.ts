import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

// Next.js 16 renamed the "middleware" convention to "proxy". Same signature.
const { auth } = NextAuth(authConfig);

// Protect the private app area. Everything under /app plus the account edit page
// (/edit) requires authentication, mirroring Rails' `before_action :authenticate_user!`.
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  const isPrivate =
    pathname === "/edit" ||
    pathname.startsWith("/app") ||
    pathname.startsWith("/edit/");

  if (isPrivate && !isLoggedIn) {
    const url = new URL("/login", req.nextUrl.origin);
    return NextResponse.redirect(url);
  }

  // Logged-in users hitting auth pages go to the dashboard.
  const isAuthPage =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname.startsWith("/password");
  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/app", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)"],
};
