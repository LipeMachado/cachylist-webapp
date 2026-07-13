import { NextResponse } from "next/server";
import { requireApiAuth, isNumericId } from "@/lib/api-helpers";
import { tmdbDetails } from "@/lib/services/tmdb";

export async function GET(req: Request) {
  if (!(await requireApiAuth())) return NextResponse.json({}, { status: 401 });

  const params = new URL(req.url).searchParams;
  const id = params.get("id");
  const typeParam = params.get("type") ?? "movie";
  if (!isNumericId(id)) return NextResponse.json({});
  if (typeParam !== "movie" && typeParam !== "tv") return NextResponse.json({});
  return NextResponse.json(await tmdbDetails(typeParam, id));
}
