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

export async function createItems(
  items: ImportItemInput[],
  userId: number
): Promise<number> {
  let created = 0;

  // Compute the next sortOrder per status once, then increment locally — avoids
  // an aggregate query per item (which made large imports crawl).
  const maxByStatus = new Map<number, number>();

  for (const data of items) {
    const title = data.title?.trim();
    if (!title) continue;

    const categoryKey = (data.category?.trim() || "anime") as CategoryKey;
    const statusKey = (data.status?.trim() || "backlog") as keyof typeof STATUS_TO_INT;
    const statusInt = STATUS_TO_INT[statusKey] ?? STATUS_TO_INT.backlog;

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

    try {
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
          sortOrder: nextSort,
        },
      });
      created++;
    } catch {
      // duplicate title (unique scope user_id+title) or invalid — skip, mirroring Rails
    }
  }
  return created;
}
