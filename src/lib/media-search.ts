// Maps a media category to its /app/* search-proxy endpoint (AniList for
// anime, TMDB for movies/series, Steam for games). Shared by MediaForm
// (single-item create/edit) and ImportTool (bulk import) — both let the user
// search external sources and apply a result onto the form.
export function searchPath(category: string): string | null {
  switch (category) {
    case "anime":
    case "anime_movie":
      return "/app/anilist/search";
    case "movie":
    case "series":
      return "/app/tmdb/search";
    case "game":
      return "/app/steam/search";
    default:
      return null;
  }
}

export function detailsUrl(category: string, id: number): string | null {
  switch (category) {
    case "anime":
    case "anime_movie":
      return `/app/anilist/details?id=${id}`;
    case "movie":
      return `/app/tmdb/details?id=${id}&type=movie`;
    case "series":
      return `/app/tmdb/details?id=${id}&type=tv`;
    case "game":
      return `/app/steam/details?id=${id}`;
    default:
      return null;
  }
}
