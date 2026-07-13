import { prisma } from "@/lib/prisma";
import {
  CATEGORY_TO_INT,
  STATUS_TO_INT,
  statusKey,
  toCardData,
  type CardData,
  type CategoryKey,
  type StatusKey,
} from "@/lib/media";
import { normalizeSearch } from "@/lib/text";
import { MEDIA_PAGE_SIZE } from "@/lib/pagination";
import type { MediaItem } from "@prisma/client";

export const LIBRARY_PAGE_SIZE = MEDIA_PAGE_SIZE;

export interface LibraryFilters {
  category?: string;
  status?: string;
  platform?: string;
  query?: string;
  sort?: string;
}

export function sortMediaItems(items: MediaItem[], sort?: string): MediaItem[] {
  const arr = [...items];
  switch (sort) {
    case "title":
      return arr.sort((a, b) => a.title.localeCompare(b.title));
    case "year":
      return arr.sort((a, b) => (b.releaseYear ?? -Infinity) - (a.releaseYear ?? -Infinity));
    case "recent":
      return arr.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    default:
      return arr; // keep the manual board order (sortOrder asc)
  }
}

// category/platform/query filters only — status is applied separately so
// callers (status tabs, board columns) can get counts across every status.
export function filterMediaItems(items: MediaItem[], filters: LibraryFilters): MediaItem[] {
  let base = items;
  const category =
    filters.category && filters.category in CATEGORY_TO_INT ? (filters.category as CategoryKey) : null;
  if (category) base = base.filter((i) => i.category === CATEGORY_TO_INT[category]);
  if (filters.platform) base = base.filter((i) => i.platform === filters.platform);
  if (filters.query) {
    const q = normalizeSearch(filters.query);
    base = base.filter((i) =>
      normalizeSearch([i.title, i.platform, i.author, i.releaseYear].filter(Boolean).join(" ")).includes(q)
    );
  }
  return base;
}

export function resolveStatus(status?: string): StatusKey | null {
  return status && status in STATUS_TO_INT ? (status as StatusKey) : null;
}

export function filterByStatus(items: MediaItem[], status?: string): MediaItem[] {
  const active = resolveStatus(status);
  return active ? items.filter((i) => statusKey(i.status) === active) : items;
}

export interface LibraryPage {
  items: CardData[];
  hasMore: boolean;
  total: number;
}

// Paginated grid slice, re-running the same in-memory filter/sort used for the
// initial server render so page N+1 lines up exactly with page N. Matches this
// app's existing "single query, filter in memory" approach (a user's library
// is small — see DashboardPage) while only shipping LIBRARY_PAGE_SIZE rows to
// the client per request instead of the whole filtered result at once.
export async function fetchLibraryPage(
  userId: number,
  filters: LibraryFilters,
  page: number
): Promise<LibraryPage> {
  const allItems = await prisma.mediaItem.findMany({
    where: { userId },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }, { createdAt: "desc" }],
  });

  const base = filterMediaItems(allItems, filters);
  const gridItems = sortMediaItems(filterByStatus(base, filters.status), filters.sort);

  const start = Math.max(0, page) * LIBRARY_PAGE_SIZE;
  const slice = gridItems.slice(start, start + LIBRARY_PAGE_SIZE);

  return {
    items: slice.map(toCardData),
    hasMore: start + LIBRARY_PAGE_SIZE < gridItems.length,
    total: gridItems.length,
  };
}
