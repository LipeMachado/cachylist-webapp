import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";
import { rateLimit, clientIp } from "@/lib/rate-limit";

// Next.js 16 renamed the "middleware" convention to "proxy". Same signature.
const { auth } = NextAuth(authConfig);

const isDev = process.env.NODE_ENV !== "production";

// Per-request nonce-based CSP, following Next.js' documented pattern: the nonce
// is threaded onto the *request* headers (not just the response) so the App
// Router's own streaming/hydration <script> tags get tagged with it automatically.
// A static CSP without a nonce would otherwise block those inline scripts outright.
function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    // img-src stays broad because media covers are user-supplied URLs from any host.
    "img-src 'self' https: data:",
    "font-src 'self' data:",
    `connect-src 'self'${isDev ? " ws:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

// Protect the private app area. Everything under /app plus the account edit page
// (/edit) requires authentication, mirroring Rails' `before_action :authenticate_user!`.
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const ip = clientIp(req);

  const nonce = crypto.randomUUID().replace(/-/g, "");
  const csp = buildCsp(nonce);
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  const withCsp = <T extends NextResponse>(res: T): T => {
    res.headers.set("Content-Security-Policy", csp);
    return res;
  };

  // Throttle login/register/password-reset submissions per IP to blunt
  // brute-force and credential-stuffing attempts against the single-connection DB.
  // Each action gets its own bucket so hammering /register can't also lock out
  // /login attempts (and vice versa) for the same IP.
  // Includes /api/auth/callback/*: that's NextAuth's own credential-verification
  // endpoint (what signIn() ultimately posts to), which the broad matcher below
  // otherwise excludes entirely — without this it was the one path that bypassed
  // this throttle no matter how the other auth pages are guarded.
  const authAction =
    req.method !== "POST"
      ? null
      : pathname === "/login"
        ? "login"
        : pathname === "/register"
          ? "register"
          : pathname.startsWith("/password")
            ? "password"
            : pathname.startsWith("/api/auth/callback")
              ? "callback"
              : null;
  if (authAction && !rateLimit(`auth:${authAction}:${ip}`, 20, 10 * 60 * 1000).allowed) {
    return withCsp(
      NextResponse.json(
        { error: "Muitas tentativas. Tente novamente em alguns minutos." },
        { status: 429 }
      )
    );
  }

  // Throttle the search/details/identify proxy routes so a single client can't
  // hammer upstream providers (TMDB/AniList/Steam) or the DB behind them.
  const isSearchApi =
    pathname.startsWith("/app/anilist/") ||
    pathname.startsWith("/app/tmdb/") ||
    pathname.startsWith("/app/steam/") ||
    pathname.startsWith("/app/identify");
  if (isSearchApi && !rateLimit(`search:${ip}`, 60, 60 * 1000).allowed) {
    return withCsp(
      NextResponse.json({ error: "Muitas requisições. Aguarde um instante." }, { status: 429 })
    );
  }

  // Throttle the bulk importer's write step: each confirm can insert up to
  // MAX_IMPORT_ITEMS (5000) rows against the same single-connection DB pool.
  const isBulkWriteApi = pathname === "/app/import" && req.method === "POST";
  if (isBulkWriteApi && !rateLimit(`import:${ip}`, 5, 5 * 60 * 1000).allowed) {
    return withCsp(
      NextResponse.json({ error: "Muitas importações. Aguarde um instante." }, { status: 429 })
    );
  }

  const isPrivate =
    pathname === "/edit" ||
    pathname.startsWith("/app") ||
    pathname.startsWith("/edit/");

  if (isPrivate && !isLoggedIn) {
    const url = new URL("/login", req.nextUrl.origin);
    return withCsp(NextResponse.redirect(url));
  }

  // Logged-in users hitting auth pages go to the dashboard — except
  // /password/edit: a still-logged-in user clicking their emailed reset link
  // must still land there, or the token in the URL is lost to this redirect.
  const isAuthPage =
    pathname === "/login" ||
    pathname === "/register" ||
    (pathname.startsWith("/password") && pathname !== "/password/edit");
  if (isAuthPage && isLoggedIn) {
    return withCsp(NextResponse.redirect(new URL("/app", req.nextUrl.origin)));
  }

  return withCsp(NextResponse.next({ request: { headers: requestHeaders } }));
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)",
    // NextAuth's own credential-verification endpoint — needs the auth-submission
    // rate limit above even though the pattern otherwise excludes all of /api.
    "/api/auth/callback/:path*",
  ],
};
