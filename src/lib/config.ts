// Self-host configuration flags.

// Whether public sign-up is allowed. Set ALLOW_REGISTRATION="false" to lock the
// instance down to existing accounts only (useful for single-user deployments).
export function registrationEnabled(): boolean {
  return process.env.ALLOW_REGISTRATION !== "false";
}

/* ── External media API caching ─────────────────────────────────────────────
   Shared across the AniList/TMDB/Steam service modules — each search/details
   endpoint used to define its own copy of these same two durations. */
export const SEARCH_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
export const DETAILS_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7d
