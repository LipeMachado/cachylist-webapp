import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { STATUS_TO_INT, type StatusKey } from "@/lib/media";

// Persists status + sort_order per column. Uses a single UPDATE…FROM (VALUES)
// instead of one query per card: a 200-item board would otherwise run 200
// statements in a transaction, holding the (single, pooled) connection for
// seconds and starving everything else.
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
  const rows: Prisma.Sql[] = [];

  for (const [status, ids] of Object.entries(columns)) {
    if (!(status in STATUS_TO_INT)) continue;
    const statusInt = STATUS_TO_INT[status as StatusKey];
    (ids ?? []).forEach((id, index) => {
      const n = Number(id);
      if (Number.isInteger(n)) {
        rows.push(Prisma.sql`(${n}::int, ${index}::int, ${statusInt}::int)`);
      }
    });
  }

  if (rows.length === 0) return new NextResponse(null, { status: 200 });

  await prisma.$executeRaw`
    UPDATE "media_items" AS m
    SET sort_order = v.sort_order, status = v.status
    FROM (VALUES ${Prisma.join(rows)}) AS v(id, sort_order, status)
    WHERE m.id = v.id AND m.user_id = ${userId}
  `;

  // Items dropped into "Concluído" get their progress maxed out so they read as
  // truly finished (COALESCE keeps the current value when no total is set).
  const completedIds = (columns["completed"] ?? [])
    .map(Number)
    .filter((n) => Number.isInteger(n));
  if (completedIds.length > 0) {
    await prisma.$executeRaw`
      UPDATE "media_items"
      SET current_episode = COALESCE(total_episodes, current_episode),
          current_season  = COALESCE(total_seasons, current_season),
          current_page    = COALESCE(total_pages, current_page)
      WHERE user_id = ${userId} AND id IN (${Prisma.join(completedIds)})
    `;
  }

  return new NextResponse(null, { status: 200 });
}
