import type { MediaItem } from "@prisma/client";

/* ── Enums (int <-> key), matching the Rails ActiveRecord enums ───────────── */

export const CATEGORY_TO_INT = {
  anime: 0,
  series: 1,
  movie: 2,
  book: 3,
  game: 4,
  anime_movie: 5,
} as const;

export const STATUS_TO_INT = {
  backlog: 5,
  planned: 0,
  in_progress: 1,
  completed: 2,
  paused: 3,
  no_date: 4,
} as const;

export type CategoryKey = keyof typeof CATEGORY_TO_INT;
export type StatusKey = keyof typeof STATUS_TO_INT;

const INT_TO_CATEGORY = Object.fromEntries(
  Object.entries(CATEGORY_TO_INT).map(([k, v]) => [v, k])
) as Record<number, CategoryKey>;

const INT_TO_STATUS = Object.fromEntries(
  Object.entries(STATUS_TO_INT).map(([k, v]) => [v, k])
) as Record<number, StatusKey>;

export function categoryKey(value: number): CategoryKey {
  return INT_TO_CATEGORY[value] ?? "anime";
}

export function statusKey(value: number): StatusKey {
  return INT_TO_STATUS[value] ?? "planned";
}

// Insertion order of the Rails enums (used for <select> option ordering).
export const CATEGORY_KEYS = Object.keys(CATEGORY_TO_INT) as CategoryKey[];
export const STATUS_KEYS = Object.keys(STATUS_TO_INT) as StatusKey[];

// Board columns used across the UI.
export const LIBRARY_STATUSES: StatusKey[] = [
  "backlog",
  "planned",
  "in_progress",
  "completed",
  "paused",
];
export const DASHBOARD_STATUSES: StatusKey[] = [
  "planned",
  "in_progress",
  "completed",
  "paused",
];

/* ── Labels ──────────────────────────────────────────────────────────────── */

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  anime: "Anime",
  series: "Série",
  movie: "Filme",
  book: "Livro",
  game: "Jogo",
  anime_movie: "Filmes/Animes",
};

export const STATUS_LABELS: Record<StatusKey, string> = {
  backlog: "Backlog",
  planned: "Para Depois",
  in_progress: "Em Andamento",
  completed: "Concluído",
  paused: "Pausado",
  no_date: "Sem Data",
};

export const CATEGORY_PATHS: Record<CategoryKey, string> = {
  anime: "animes",
  series: "series",
  movie: "movies",
  book: "books",
  game: "games",
  anime_movie: "anime_movies",
};

// reverse of CATEGORY_PATHS (route slug -> category key)
export const PATH_TO_CATEGORY: Record<string, CategoryKey> = Object.fromEntries(
  Object.entries(CATEGORY_PATHS).map(([k, v]) => [v, k as CategoryKey])
);

export const SOURCE_LABELS: Record<string, string> = {
  anilist: "AniList (Anime)",
  tmdb_movie: "TMDB (Filme)",
  tmdb_tv: "TMDB (Série)",
  steam: "Steam (Jogo)",
};

export function categoryLabel(key: string): string {
  return CATEGORY_LABELS[key as CategoryKey] ?? titleize(key);
}

export function statusLabel(key: string): string {
  return STATUS_LABELS[key as StatusKey] ?? titleize(key);
}

export function statusClass(key: string): string {
  return `status-${key.replaceAll("_", "-")}`;
}

/* ── Cover fallback ──────────────────────────────────────────────────────── */

export const FALLBACK_COVER =
  "https://images.unsplash.com/photo-1518709268805-4e9042af2176?auto=format&fit=crop&w=500&q=80";

export function coverFor(item: { coverUrl?: string | null }): string {
  return item.coverUrl?.trim() ? item.coverUrl : FALLBACK_COVER;
}

/* ── Progress helpers (ported from MediaItem model) ──────────────────────── */

type ProgressItem = Pick<
  MediaItem,
  | "currentSeason"
  | "totalSeasons"
  | "currentEpisode"
  | "totalEpisodes"
  | "currentPage"
  | "totalPages"
  | "hoursPlayed"
  | "durationMinutes"
> & { category: number; status: number };

function present(value: number | null | undefined): value is number {
  return value !== null && value !== undefined;
}

export function progressLabel(item: ProgressItem): string | null {
  const cat = categoryKey(item.category);
  switch (cat) {
    case "anime":
    case "series": {
      const parts = [
        present(item.currentSeason) ? `S${item.currentSeason}` : null,
        present(item.totalSeasons) ? `de ${item.totalSeasons} temp.` : null,
        present(item.currentEpisode) ? `E${item.currentEpisode}` : null,
        present(item.totalEpisodes) ? `de ${item.totalEpisodes}` : null,
      ].filter(Boolean);
      return parts.length ? parts.join(" • ") : null;
    }
    case "book": {
      if (!present(item.currentPage) && !present(item.totalPages)) return null;
      return `${item.currentPage ?? 0}/${item.totalPages ?? "?"} pág.`;
    }
    case "game":
      return present(item.hoursPlayed) ? `${item.hoursPlayed}h jogadas` : null;
    case "movie":
    case "anime_movie":
      return present(item.durationMinutes)
        ? `${item.durationMinutes} min`
        : null;
    default:
      return null;
  }
}

export function progressPercentage(item: ProgressItem): number {
  const cat = categoryKey(item.category);
  if (cat === "anime" || cat === "series") {
    if (!present(item.currentEpisode) || !item.totalEpisodes) return 0;
    return Math.round(
      Math.min(100, Math.max(0, (item.currentEpisode / item.totalEpisodes) * 100))
    );
  }
  if (cat === "book") {
    if (!present(item.currentPage) || !item.totalPages) return 0;
    return Math.round(
      Math.min(100, Math.max(0, (item.currentPage / item.totalPages) * 100))
    );
  }
  return statusKey(item.status) === "completed" ? 100 : 0;
}

/* ── Misc ────────────────────────────────────────────────────────────────── */

export function titleize(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function displayName(user: { username?: string | null; email: string }): string {
  if (user.username && user.username.trim()) return user.username;
  return titleize(user.email.split("@")[0] ?? "");
}

// avatar/avatar1.webp .. avatar/avatar20.webp
export const AVATAR_OPTIONS: string[] = Array.from(
  { length: 20 },
  (_, i) => `avatar/avatar${i + 1}.webp`
);

export function avatarPath(avatar?: string | null): string | null {
  if (avatar && AVATAR_OPTIONS.includes(avatar)) return `/${avatar}`;
  return null;
}

/* ── Card view-model (serializable, for client components) ───────────────── */

export interface CardData {
  id: number;
  title: string;
  statusKey: StatusKey;
  category: string;
  releaseYear: number | null;
  cover: string;
  progressLabel: string | null;
  progressPercentage: number;
  platform: string | null;
  completed: boolean;
}

export function toCardData(item: MediaItem): CardData {
  const sKey = statusKey(item.status);
  return {
    id: item.id,
    title: item.title,
    statusKey: sKey,
    category: categoryLabel(categoryKey(item.category)),
    releaseYear: item.releaseYear,
    cover: coverFor(item),
    progressLabel: progressLabel(item),
    progressPercentage: progressPercentage(item),
    platform: item.platform,
    completed: sKey === "completed",
  };
}
