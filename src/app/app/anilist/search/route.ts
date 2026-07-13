import { NextResponse } from "next/server";
import { requireApiAuth, MAX_QUERY_LENGTH } from "@/lib/api-helpers";
import { anilistSearch } from "@/lib/services/anilist";

export async function GET(req: Request) {
  if (!(await requireApiAuth())) return NextResponse.json([], { status: 401 });

  const query = (new URL(req.url).searchParams.get("query") ?? "").slice(0, MAX_QUERY_LENGTH);
  if (query.length < 2) return NextResponse.json([]);
  return NextResponse.json(await anilistSearch(query));
}
