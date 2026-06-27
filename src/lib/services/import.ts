// Import service — ports ImportService (CSV/text parsing, AniList identification,
// item creation). Pagination state is kept in an in-memory store keyed by a token
// (replaces Rails' tmp-file + session approach).
import { anilistSearch } from "@/lib/services/anilist";
import { prisma } from "@/lib/prisma";
import { CATEGORY_TO_INT, STATUS_TO_INT, type CategoryKey } from "@/lib/media";

export const PREVIEW_LIMIT = 50;
const REQUEST_DELAY_MS = 700;

export interface EnrichedTitle {
  original_title: string;
  title: string;
  category: CategoryKey;
  cover_url: string | null;
  description: string | null;
  release_year: number | null;
  platform: string | null;
  source: string | null;
  anilist_id: number | null;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/* ── Parsing ─────────────────────────────────────────────────────────────── */

export function parseContent(content: string, filename: string): string[] {
  const name = filename.toLowerCase();
  return name.endsWith(".csv") ? parseCsv(content) : parseText(content);
}

function parseText(content: string): string[] {
  return content
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

function parseCsv(content: string): string[] {
  const rows = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (rows.length === 0) return [];

  const headers = splitCsvLine(rows[0]).map((h) => h.trim());
  const titleIndex = Math.max(
    0,
    headers.findIndex((h) => h.toLowerCase().trim() === "title")
  );

  return rows
    .slice(1)
    .map((row) => splitCsvLine(row)[titleIndex]?.trim())
    .filter((v): v is string => Boolean(v && v.length));
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

/* ── Identification (AniList) ────────────────────────────────────────────── */

export async function identifyTitles(titles: string[]): Promise<EnrichedTitle[]> {
  const results: EnrichedTitle[] = [];
  for (let i = 0; i < titles.length; i++) {
    results.push(await identifyAnilist(titles[i]));
    if (i < titles.length - 1) await sleep(REQUEST_DELAY_MS);
  }
  return results;
}

async function identifyAnilist(title: string): Promise<EnrichedTitle> {
  const base: EnrichedTitle = {
    original_title: title,
    title,
    category: "anime",
    cover_url: null,
    description: null,
    release_year: null,
    platform: null,
    source: null,
    anilist_id: null,
  };
  try {
    const results = await anilistSearch(title);
    if (results.length) {
      const best = results[0];
      return {
        ...base,
        title: best.title,
        category: best.format === "MOVIE" ? "anime_movie" : "anime",
        source: "anilist",
        anilist_id: best.id,
      };
    }
    return base;
  } catch (e) {
    console.error(`ImportService AniList identify error for ${title}:`, (e as Error).message);
    return base;
  }
}

/* ── Creation ────────────────────────────────────────────────────────────── */

export interface ImportItemInput {
  title?: string;
  category?: string;
  status?: string;
  cover_url?: string;
  description?: string;
  release_year?: string;
  platform?: string;
}

export async function createItems(
  items: ImportItemInput[],
  userId: number
): Promise<number> {
  let created = 0;
  for (const data of items) {
    const title = data.title?.trim();
    if (!title) continue;

    const categoryKey = (data.category?.trim() || "anime") as CategoryKey;
    const statusKey = (data.status?.trim() || "backlog") as keyof typeof STATUS_TO_INT;
    const statusInt = STATUS_TO_INT[statusKey] ?? STATUS_TO_INT.backlog;

    const releaseYear = data.release_year?.trim()
      ? Number(data.release_year)
      : null;

    try {
      const maxSort = await prisma.mediaItem.aggregate({
        where: { userId, status: statusInt },
        _max: { sortOrder: true },
      });

      await prisma.mediaItem.create({
        data: {
          userId,
          title,
          category: CATEGORY_TO_INT[categoryKey] ?? CATEGORY_TO_INT.anime,
          status: statusInt,
          coverUrl: data.cover_url?.trim() || null,
          description: data.description?.trim() || null,
          releaseYear: Number.isFinite(releaseYear) ? releaseYear : null,
          platform: data.platform?.trim() || null,
          sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
        },
      });
      created++;
    } catch {
      // duplicate title (unique scope user_id+title) or invalid — skip, mirroring Rails
    }
  }
  return created;
}

/* ── In-memory pagination store ──────────────────────────────────────────── */

interface StoreEntry {
  items: EnrichedTitle[];
  expiresAt: number;
}
const previewStore = new Map<string, StoreEntry>();
const STORE_TTL = 60 * 60 * 1000; // 1h

export function storePreview(token: string, items: EnrichedTitle[]): void {
  previewStore.set(token, { items, expiresAt: Date.now() + STORE_TTL });
}

export function readPreview(token: string): EnrichedTitle[] | null {
  const entry = previewStore.get(token);
  if (!entry || Date.now() > entry.expiresAt) {
    previewStore.delete(token);
    return null;
  }
  return entry.items;
}

export function deletePreview(token: string): void {
  previewStore.delete(token);
}
