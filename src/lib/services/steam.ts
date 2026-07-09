// Steam store integration — ports SteamService + SteamController formatting.
import { readCache, writeCache } from "@/lib/services/cache";

const SEARCH_URL = "https://store.steampowered.com/api/storesearch/";
const DETAILS_URL = "https://store.steampowered.com/api/appdetails";
const SEARCH_CACHE_TTL = 24 * 60 * 60 * 1000; // 24h
const DETAILS_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7d

interface SteamSearchItem {
  id: number;
  name: string;
  tiny_image?: string;
}

export interface SteamSearchResult {
  id: number;
  title: string;
  poster: string | null;
}

async function get(url: string, params: Record<string, string | number>) {
  const u = new URL(url);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, String(v));
  try {
    const res = await fetch(u, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    return (await res.json()) as Record<string, unknown>;
  } catch (e) {
    console.error("Steam API error:", (e as Error).message);
    return {};
  }
}

function stripTags(html: string | undefined | null): string {
  return (html ?? "").replace(/<[^>]*>/g, "").trim();
}

export async function steamSearch(query: string): Promise<SteamSearchResult[]> {
  if (!query || query.length < 2) return [];

  const cacheKey = `steam:search:${query.toLowerCase().trim()}`;
  const cached = readCache<SteamSearchResult[]>(cacheKey);
  if (cached) return cached;

  const data = await get(SEARCH_URL, { term: query, cc: "BR", l: "brazilian", page: 1 });
  const items = (data.items as SteamSearchItem[] | undefined) ?? [];
  const results = items.slice(0, 8).map((r) => ({
    id: r.id,
    title: r.name,
    poster: r.tiny_image ?? null,
  }));
  writeCache(cacheKey, results, SEARCH_CACHE_TTL);
  return results;
}

interface SteamAppData {
  name?: string;
  short_description?: string;
  detailed_description?: string;
  release_date?: { date?: string };
  header_image?: string;
}

export async function steamDetails(appId: string | number) {
  const cacheKey = `steam:details:${appId}`;
  const cached = readCache<Record<string, unknown>>(cacheKey);
  if (cached) return cached;

  const data = await get(DETAILS_URL, { appids: appId, cc: "BR", l: "brazilian" });
  const wrapper = data[String(appId)] as
    | { success?: boolean; data?: SteamAppData }
    | undefined;
  const details: SteamAppData = wrapper?.success ? wrapper.data ?? {} : {};

  const yearMatch = details.release_date?.date?.match(/\d{4}/);

  const result = {
    title: details.name ?? "",
    overview: stripTags(details.short_description || details.detailed_description),
    release_year: yearMatch ? Number(yearMatch[0]) : null,
    poster_url: details.header_image ?? null,
    category: "game" as const,
    platform: "Steam",
  };
  writeCache(cacheKey, result, DETAILS_CACHE_TTL);
  return result;
}
