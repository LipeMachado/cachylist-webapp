// Pure (non-client) form value types + converters, so server components
// (new/edit pages) can build initial values without importing the client form.
import type { CategoryKey, StatusKey } from "@/lib/media";

export interface MediaFormValues {
  title: string;
  description: string;
  category: CategoryKey;
  status: StatusKey;
  platform: string;
  release_year: string;
  rating: string;
  cover_url: string;
  started_at: string;
  finished_at: string;
  current_season: string;
  total_seasons: string;
  current_episode: string;
  total_episodes: string;
  author: string;
  current_page: string;
  total_pages: string;
  duration_minutes: string;
  hours_played: string;
  wants_platinum: boolean;
  platinum_completed: boolean;
  notes: string;
}

export const EMPTY_MEDIA_VALUES: MediaFormValues = {
  title: "",
  description: "",
  category: "anime",
  status: "planned",
  platform: "",
  release_year: "",
  rating: "",
  cover_url: "",
  started_at: "",
  finished_at: "",
  current_season: "",
  total_seasons: "",
  current_episode: "",
  total_episodes: "",
  author: "",
  current_page: "",
  total_pages: "",
  duration_minutes: "",
  hours_played: "",
  wants_platinum: false,
  platinum_completed: false,
  notes: "",
};

export interface MediaItemLike {
  title: string;
  description: string | null;
  category: number;
  status: number;
  platform: string | null;
  releaseYear: number | null;
  rating: number | null;
  coverUrl: string | null;
  startedAt: Date | string | null;
  finishedAt: Date | string | null;
  currentSeason: number | null;
  totalSeasons: number | null;
  currentEpisode: number | null;
  totalEpisodes: number | null;
  author: string | null;
  currentPage: number | null;
  totalPages: number | null;
  durationMinutes: number | null;
  hoursPlayed: number | null;
  wantsPlatinum: boolean;
  platinumCompleted: boolean;
  notes: string | null;
}

function dateStr(value: Date | string | null): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function numStr(value: number | null): string {
  return value == null ? "" : String(value);
}

export function mediaItemToFormValues(
  item: MediaItemLike,
  categoryKey: CategoryKey,
  statusKey: StatusKey
): MediaFormValues {
  return {
    title: item.title ?? "",
    description: item.description ?? "",
    category: categoryKey,
    status: statusKey,
    platform: item.platform ?? "",
    release_year: numStr(item.releaseYear),
    rating: numStr(item.rating),
    cover_url: item.coverUrl ?? "",
    started_at: dateStr(item.startedAt),
    finished_at: dateStr(item.finishedAt),
    current_season: numStr(item.currentSeason),
    total_seasons: numStr(item.totalSeasons),
    current_episode: numStr(item.currentEpisode),
    total_episodes: numStr(item.totalEpisodes),
    author: item.author ?? "",
    current_page: numStr(item.currentPage),
    total_pages: numStr(item.totalPages),
    duration_minutes: numStr(item.durationMinutes),
    hours_played: numStr(item.hoursPlayed),
    wants_platinum: item.wantsPlatinum,
    platinum_completed: item.platinumCompleted,
    notes: item.notes ?? "",
  };
}
