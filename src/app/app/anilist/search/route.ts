import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { anilistSearch } from "@/lib/services/anilist";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json([], { status: 401 });

  const query = new URL(req.url).searchParams.get("query") ?? "";
  if (query.length < 2) return NextResponse.json([]);
  return NextResponse.json(await anilistSearch(query));
}
