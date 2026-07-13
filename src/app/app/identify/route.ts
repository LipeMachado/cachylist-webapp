import { NextResponse } from "next/server";
import { requireApiAuth, MAX_QUERY_LENGTH } from "@/lib/api-helpers";
import { identifyTitle } from "@/lib/services/identify";

// Used by the bulk importer to auto-detect each title's category + cover.
export async function GET(req: Request) {
  if (!(await requireApiAuth())) return NextResponse.json(null, { status: 401 });

  const query = (new URL(req.url).searchParams.get("query") ?? "").slice(0, MAX_QUERY_LENGTH);
  if (query.length < 2) return NextResponse.json(null);

  return NextResponse.json(await identifyTitle(query));
}
