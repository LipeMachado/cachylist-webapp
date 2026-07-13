// AniList integration — ports AniListService + AnilistController formatting.
import { readCache, writeCache } from "@/lib/services/cache";
import { SEARCH_CACHE_TTL_MS, DETAILS_CACHE_TTL_MS } from "@/lib/config";
import { normalizeTitle } from "@/lib/text";

const GRAPHQL_URL = "https://graphql.anilist.co";
const SEARCH_LIMIT = 8;
const DETAILS_CACHE_VERSION = "v1";

export interface AnilistSearchResult {
  id: number;
  title: string;
  englishTitle: string | null;
  year: number | null;
  poster: string | null;
  format: string | null;
  category: "anime" | "anime_movie";
}

interface AnilistMedia {
  id: number;
  title?: { romaji?: string; english?: string };
  coverImage?: { large?: string };
  startDate?: { year?: number };
  episodes?: number;
  averageScore?: number;
  format?: string;
  description?: string;
}

async function post(query: string, variables: Record<string, unknown>) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (process.env.ANILIST_CLIENT_ID) headers["Client-ID"] = process.env.ANILIST_CLIENT_ID;

  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`AniList request failed with ${res.status}`);
  return res.json();
}

const SEARCH_QUERY = `
  query ($search: String, $perPage: Int) {
    Page(page: 1, perPage: $perPage) {
      media(search: $search, type: ANIME) {
        id
        title { romaji english }
        coverImage { large }
        startDate { year }
        format
      }
    }
  }
`;

const DETAILS_QUERY = `
  query ($id: Int) {
    Media(id: $id) {
      id
      title { romaji english }
      coverImage { large }
      description(asHtml: false)
      startDate { year }
      episodes
      averageScore
      format
    }
  }
`;

function formatSearch(media: AnilistMedia): AnilistSearchResult {
  const title = media.title?.romaji || media.title?.english || "";
  return {
    id: media.id,
    title,
    englishTitle: media.title?.english ?? null,
    year: media.startDate?.year ?? null,
    poster: media.coverImage?.large ?? null,
    format: media.format ?? null,
    category: media.format === "MOVIE" ? "anime_movie" : "anime",
  };
}

export async function anilistSearch(query: string): Promise<AnilistSearchResult[]> {
  const normalized = normalizeTitle(query);
  if (!normalized) return [];

  const cacheKey = `anilist:search:${normalized}`;
  const cached = readCache<AnilistSearchResult[]>(cacheKey);
  if (cached) return cached;

  try {
    const response = await post(SEARCH_QUERY, { search: query, perPage: SEARCH_LIMIT });
    const media: AnilistMedia[] = response?.data?.Page?.media ?? [];
    const results = media.map(formatSearch);
    writeCache(cacheKey, results, SEARCH_CACHE_TTL_MS);
    return results;
  } catch (e) {
    console.error("AniList search error:", (e as Error).message);
    return [];
  }
}

export interface AnilistDetails {
  title: string;
  overview: string | null;
  release_year: number | null;
  poster_url: string | null;
  total_episodes: number | null;
  platform: null;
  score: number | null;
  category: "anime" | "anime_movie";
  format: string | null;
}

export async function anilistDetails(id: string | number): Promise<AnilistDetails | Record<string, never>> {
  const cacheKey = `anilist:details:${DETAILS_CACHE_VERSION}:${id}`;
  const cached = readCache<AnilistDetails>(cacheKey);
  if (cached) return cached;

  try {
    const response = await post(DETAILS_QUERY, { id: Number(id) });
    const media: AnilistMedia | undefined = response?.data?.Media;
    if (!media) return {};

    const title = media.title?.romaji || media.title?.english || "";
    const result: AnilistDetails = {
      title,
      overview: media.description?.trim() ?? null,
      release_year: media.startDate?.year ?? null,
      poster_url: media.coverImage?.large ?? null,
      total_episodes: media.episodes ?? null,
      platform: null,
      score: media.averageScore ?? null,
      format: media.format ?? null,
      category: media.format === "MOVIE" ? "anime_movie" : "anime",
    };
    writeCache(cacheKey, result, DETAILS_CACHE_TTL_MS);
    return result;
  } catch (e) {
    console.error(`AniList details error for ${id}:`, (e as Error).message);
    return {};
  }
}
