import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { tmdbDetails } from "@/lib/services/tmdb";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({}, { status: 401 });

  const params = new URL(req.url).searchParams;
  const id = params.get("id");
  const typeParam = params.get("type") ?? "movie";
  if (!id || !/^\d+$/.test(id)) return NextResponse.json({});
  if (typeParam !== "movie" && typeParam !== "tv") return NextResponse.json({});
  return NextResponse.json(await tmdbDetails(typeParam, id));
}
