import type { NextConfig } from "next";

// Content-Security-Policy is set per-request in proxy.ts instead of here: it
// needs a fresh nonce per request so Next's own inline hydration/streaming
// scripts (which a static, nonce-less CSP would otherwise block) stay allowed.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  poweredByHeader: false,
  experimental: {
    // Next's default is 0s for dynamic routes (every page here is dynamic —
    // it all reads the session). With no client cache, every navigation
    // (even opening/closing a modal) re-fetches the *entire* tree from the
    // server, including the shared layout (sidebar, nav), which re-triggers
    // prefetch for every link in it. Mutations still show fresh data
    // instantly because the server actions call revalidatePath(), which
    // busts this cache regardless of staleTime.
    staleTimes: {
      dynamic: 30,
    },
  },
  images: {
    // Posters use a plain <img> (covers can come from any user-supplied URL), so
    // next/image only needs the local avatars + a few known hosts.
    remotePatterns: [
      { protocol: "https", hostname: "image.tmdb.org" },
      { protocol: "https", hostname: "s4.anilist.co" },
      { protocol: "https", hostname: "**.steamstatic.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
