import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { tmdbDetails } from "@/lib/services/tmdb";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({}, { status: 401 });

  const params = new URL(req.url).searchParams;
  const id = params.get("id");
  const type = params.get("type") ?? "movie";
  if (!id) return NextResponse.json({});
  return NextResponse.json(await tmdbDetails(type, id));
}
