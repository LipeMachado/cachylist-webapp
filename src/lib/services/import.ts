// Import service — CSV/text parsing and item creation.
// Title identification (AniList/TMDB/Steam) is done lazily on the client, per
// visible card, so analyze stays instant and never blocks on rate-limited APIs.
import { prisma } from "@/lib/prisma";
import { CATEGORY_TO_INT, STATUS_TO_INT, type CategoryKey } from "@/lib/media";

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

// Caps guard against a single import monopolizing the (single-connection) DB
// pool and against pathologically long user-supplied strings bloating storage.
export const MAX_IMPORT_ITEMS = 5000;
const MAX_TITLE_LENGTH = 500;
const MAX_TEXT_LENGTH = 5000;
const MAX_URL_LENGTH = 2000;

function clip(value: string | undefined, max: number): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

export async function createItems(
  items: ImportItemInput[],
  userId: number
): Promise<number> {
  const capped = items.slice(0, MAX_IMPORT_ITEMS);

  // Compute the next sortOrder per status once, then increment locally — avoids
  // an aggregate query per item (which made large imports crawl).
  const maxByStatus = new Map<number, number>();
  const rows: {
    userId: number;
    title: string;
    category: number;
    status: number;
    coverUrl: string | null;
    description: string | null;
    releaseYear: number | null;
    platform: string | null;
    sortOrder: number;
  }[] = [];

  for (const data of capped) {
    const title = clip(data.title, MAX_TITLE_LENGTH);
    if (!title) continue;

    const categoryKey = (data.category?.trim() || "anime") as CategoryKey;
    const statusKey = (data.status?.trim() || "planned") as keyof typeof STATUS_TO_INT;
    const statusInt = STATUS_TO_INT[statusKey] ?? STATUS_TO_INT.planned;

    const releaseYear = data.release_year?.trim()
      ? Number(data.release_year)
      : null;

    if (!maxByStatus.has(statusInt)) {
      const agg = await prisma.mediaItem.aggregate({
        where: { userId, status: statusInt },
        _max: { sortOrder: true },
      });
      maxByStatus.set(statusInt, agg._max.sortOrder ?? 0);
    }
    const nextSort = maxByStatus.get(statusInt)! + 1;
    maxByStatus.set(statusInt, nextSort);

    rows.push({
      userId,
      title,
      category: CATEGORY_TO_INT[categoryKey] ?? CATEGORY_TO_INT.anime,
      status: statusInt,
      coverUrl: clip(data.cover_url, MAX_URL_LENGTH),
      description: clip(data.description, MAX_TEXT_LENGTH),
      releaseYear: Number.isFinite(releaseYear) ? releaseYear : null,
      platform: clip(data.platform, 200),
      sortOrder: nextSort,
    });
  }

  if (rows.length === 0) return 0;

  // Single batched insert instead of one round-trip per row — duplicate
  // titles (unique scope user_id+title) are silently skipped, mirroring the
  // previous per-row try/catch behavior.
  const result = await prisma.mediaItem.createMany({ data: rows, skipDuplicates: true });
  return result.count;
}
