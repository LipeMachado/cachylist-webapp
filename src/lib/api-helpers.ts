import { auth } from "@/auth";

// Shared guard for the /app/{anilist,tmdb,steam,identify}/* proxy routes —
// each previously reimplemented this same auth() + truthy-user check inline.
export async function requireApiAuth(): Promise<boolean> {
  const session = await auth();
  return !!session?.user;
}

// Upper bound on user-supplied search/id params forwarded to external APIs —
// without this an authenticated user could send arbitrarily long strings that
// get relayed to TMDB/AniList/Steam, risking this server's own IP getting
// rate-limited upstream.
export const MAX_QUERY_LENGTH = 200;

export function isNumericId(id: string | null): id is string {
  return !!id && /^\d+$/.test(id);
}
