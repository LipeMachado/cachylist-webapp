import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { steamDetails } from "@/lib/services/steam";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({}, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({});
  return NextResponse.json(await steamDetails(id));
}
