import { NextResponse } from "next/server";
import { requireApiAuth, isNumericId } from "@/lib/api-helpers";
import { anilistDetails } from "@/lib/services/anilist";

export async function GET(req: Request) {
  if (!(await requireApiAuth())) return NextResponse.json({}, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!isNumericId(id)) return NextResponse.json({});
  return NextResponse.json(await anilistDetails(id));
}
