// Text-normalization helpers shared between server code and client
// components — kept dependency-free (no prisma, no "use server") so client
// components can import this safely.

// Diacritic/case-insensitive substring matching: used by the library filter
// (server) and the search-suggestion dropdown (client) so "Pokemon" matches
// "Pokémon" in both places.
export function normalizeSearch(value: string): string {
  return value.toString().normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// Case/diacritic-insensitive title normalization for fuzzy identity matching
// (AniList/TMDB/Steam auto-identify similarity scoring) — collapses every run
// of non-letter/non-number characters to a single space instead of just
// stripping accents, so punctuation/whitespace differences don't affect the
// comparison.
export function normalizeTitle(value: string): string {
  return value
    .toString()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}
