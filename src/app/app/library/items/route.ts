import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { fetchLibraryPage } from "@/lib/library-query";

// Powers the library grid's infinite scroll: returns the next 40-item page for
// the current filters. Auth pattern mirrors reorder/route.ts and
// tmdb/search/route.ts (auth() + 401 JSON, not requireUser()'s redirect).
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ items: [], hasMore: false, total: 0 }, { status: 401 });
  }

  const sp = new URL(req.url).searchParams;
  const page = Math.max(0, Number(sp.get("page")) || 0);

  const result = await fetchLibraryPage(
    Number(session.user.id),
    {
      category: sp.get("category") ?? undefined,
      status: sp.get("status") ?? undefined,
      platform: sp.get("platform") ?? undefined,
      query: sp.get("query") ?? undefined,
      sort: sp.get("sort") ?? undefined,
    },
    page
  );

  return NextResponse.json(result);
}
