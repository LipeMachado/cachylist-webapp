import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import MediaModalShell from "@/components/app/MediaModalShell";
import MediaDetailBody from "@/components/app/MediaDetailBody";

// Intercepts soft navigation to /app/media_items/[id] and shows the detail in a
// modal over the current page. Hard loads / refreshes fall through to the full
// page (the @modal slot resolves to default.tsx → null).
export default async function MediaModalInterceptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Safety net: [id] could still match a non-numeric sibling (e.g. the reorder
  // route handler). Render no modal for anything that isn't a numeric id.
  const numId = Number(id);
  if (!Number.isInteger(numId)) return null;

  const user = await requireUser();
  const item = await prisma.mediaItem.findFirst({
    where: { id: numId, userId: user.id },
  });
  if (!item) return null;

  return (
    <MediaModalShell id={item.id}>
      <MediaDetailBody item={item} />
    </MediaModalShell>
  );
}
