// TMDB integration — ports TmdbService + TmdbController formatting.
import { readCache, writeCache } from "@/lib/services/cache";

const BASE_URL = "https://api.themoviedb.org/3";
export const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";
const SEARCH_CACHE_TTL = 24 * 60 * 60 * 1000; // 24h
const DETAILS_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7d

interface TmdbRaw {
  id: number;
  media_type?: string;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  overview?: string;
  runtime?: number;
  number_of_seasons?: number;
  number_of_episodes?: number;
  networks?: { name: string }[];
  credits?: { crew?: { job: string; name: string }[] };
}

export interface TmdbSearchResult {
  id: number;
  media_type: string;
  title: string;
  year: number | null;
  poster: string | null;
  overview: string | null;
}

function token(): string | undefined {
  return process.env.TMDB_API_TOKEN;
}

async function get(path: string, params: Record<string, string | number | boolean>) {
  const t = token();
  if (!t) {
    // TMDB is optional: degrade gracefully instead of throwing a 500.
    return { results: [] };
  }

  const url = new URL(`${BASE_URL}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${t}`, Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    return (await res.json()) as Record<string, unknown>;
  } catch (e) {
    console.error("TMDB API error:", (e as Error).message);
    return { results: [] };
  }
}

function extractYear(item: TmdbRaw): number | null {
  const date = item.release_date || item.first_air_date;
  const year = date?.split("-")[0];
  return year ? Number(year) : null;
}

export async function tmdbSearch(query: string): Promise<TmdbSearchResult[]> {
  if (!query || query.length < 2) return [];

  const cacheKey = `tmdb:search:${query.toLowerCase().trim()}`;
  const cached = readCache<TmdbSearchResult[]>(cacheKey);
  if (cached) return cached;

  const data = await get("/search/multi", {
    query,
    language: "pt-BR",
    page: 1,
    include_adult: false,
  });
  const results = (data.results as TmdbRaw[] | undefined) ?? [];
  const formatted = results
    .filter((r) => r.media_type === "movie" || r.media_type === "tv")
    .slice(0, 6)
    .map((r) => ({
      id: r.id,
      media_type: r.media_type as string,
      title: r.title || r.name || "",
      year: extractYear(r),
      poster: r.poster_path ? `${TMDB_IMAGE_BASE}/w92${r.poster_path}` : null,
      overview: r.overview ? r.overview.slice(0, 100) : null,
    }));
  writeCache(cacheKey, formatted, SEARCH_CACHE_TTL);
  return formatted;
}

export async function tmdbDetails(type: "movie" | "tv", id: string) {
  const cacheKey = `tmdb:details:${type}:${id}`;
  const cached = readCache<Record<string, unknown>>(cacheKey);
  if (cached) return cached;

  const details = (await get(`/${type}/${id}`, {
    language: "pt-BR",
    append_to_response: "credits",
  })) as unknown as TmdbRaw;

  const base = {
    title: details.title || details.name || "",
    overview: details.overview ?? null,
    release_year: extractYear(details),
    poster_url: details.poster_path
      ? `${TMDB_IMAGE_BASE}/w500${details.poster_path}`
      : null,
  };

  const result =
    type === "movie"
      ? {
          ...base,
          category: "movie",
          duration_minutes: details.runtime ?? null,
          director:
            details.credits?.crew?.find((c) => c.job === "Director")?.name ?? null,
        }
      : {
          ...base,
          category: "series",
          total_seasons: details.number_of_seasons ?? null,
          total_episodes: details.number_of_episodes ?? null,
          platform: details.networks?.[0]?.name ?? null,
        };

  writeCache(cacheKey, result, DETAILS_CACHE_TTL);
  return result;
}
