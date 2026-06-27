import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { STATUS_TO_INT, type StatusKey } from "@/lib/media";

// Ports MediaItemsController#reorder: persists status + sort_order per column.
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({}, { status: 401 });
  const userId = Number(session.user.id);

  let body: { columns?: Record<string, string[]> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const columns = body.columns ?? {};
  const updates: ReturnType<typeof prisma.mediaItem.updateMany>[] = [];

  for (const [status, ids] of Object.entries(columns)) {
    if (!(status in STATUS_TO_INT)) continue;
    const statusInt = STATUS_TO_INT[status as StatusKey];
    (ids ?? []).forEach((id, index) => {
      updates.push(
        prisma.mediaItem.updateMany({
          where: { id: Number(id), userId },
          data: { status: statusInt, sortOrder: index },
        })
      );
    });
  }

  await prisma.$transaction(updates);
  return new NextResponse(null, { status: 200 });
}
