import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { identifyTitle } from "@/lib/services/identify";

// Used by the bulk importer to auto-detect each title's category + cover.
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json(null, { status: 401 });

  const query = new URL(req.url).searchParams.get("query") ?? "";
  if (query.length < 2) return NextResponse.json(null);

  return NextResponse.json(await identifyTitle(query));
}
