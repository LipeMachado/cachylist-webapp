// Category detection for the bulk importer: queries every source in parallel and
// picks the best match by title similarity, so a title is classified as anime,
// anime_movie, movie, series or game — not blindly assumed to be anime.
import { anilistSearch } from "./anilist";
import { tmdbSearch } from "./tmdb";
import { steamSearch } from "./steam";
import { normalizeTitle } from "@/lib/text";

export interface IdentifyResult {
  category: "anime" | "anime_movie" | "movie" | "series" | "game";
  title: string;
  poster: string | null;
  year: number | null;
  source: "anilist" | "tmdb" | "steam";
  id: number;
}

// 0..1 similarity between the query and a candidate title.
function sim(query: string, candidate: string | null | undefined): number {
  if (!candidate) return 0;
  const a = normalizeTitle(query);
  const b = normalizeTitle(candidate);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (b.startsWith(a) || a.startsWith(b)) return 0.85;
  if (b.includes(a) || a.includes(b)) return 0.7;
  const ta = new Set(a.split(" "));
  const tb = new Set(b.split(" "));
  const inter = [...ta].filter((t) => tb.has(t)).length;
  const uni = new Set([...ta, ...tb]).size;
  return uni ? (inter / uni) * 0.6 : 0;
}

interface Candidate {
  score: number;
  prio: number; // tie-break order: anilist < tmdb < steam
  result: IdentifyResult;
}

export async function identifyTitle(query: string): Promise<IdentifyResult | null> {
  const q = query.trim();
  if (q.length < 2) return null;

  // Each of these already catches its own errors internally and resolves to
  // [] on failure — no .catch() needed here.
  const [ani, tmdb, steam] = await Promise.all([anilistSearch(q), tmdbSearch(q), steamSearch(q)]);

  const cands: Candidate[] = [];

  for (const r of ani) {
    cands.push({
      score: Math.max(sim(q, r.title), sim(q, r.englishTitle)),
      prio: 0,
      result: { category: r.category, title: r.title, poster: r.poster, year: r.year, source: "anilist", id: r.id },
    });
  }
  for (const r of tmdb) {
    cands.push({
      score: sim(q, r.title),
      prio: 1,
      result: {
        category: r.media_type === "tv" ? "series" : "movie",
        title: r.title,
        poster: r.poster,
        year: r.year,
        source: "tmdb",
        id: r.id,
      },
    });
  }
  for (const r of steam) {
    cands.push({
      score: sim(q, r.title),
      prio: 2,
      result: { category: "game", title: r.title, poster: r.poster, year: null, source: "steam", id: r.id },
    });
  }

  // Only trust reasonably-close matches; otherwise leave it undetected so the
  // importer keeps the title as-is (no wrong category, no random cover).
  const viable = cands.filter((c) => c.score >= 0.4);
  if (viable.length === 0) return null;

  const top = Math.max(...viable.map((c) => c.score));
  // Among the near-best matches, prefer AniList → TMDB → Steam. This keeps real
  // anime (which also exist on TMDB) classified as anime, while a movie that
  // only TMDB matches strongly still wins on score.
  const winner = viable
    .filter((c) => c.score >= top - 0.08)
    .sort((a, b) => a.prio - b.prio || b.score - a.score)[0];

  return winner.result;
}
