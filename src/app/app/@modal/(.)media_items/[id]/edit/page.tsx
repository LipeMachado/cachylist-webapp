import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { categoryKey, statusKey } from "@/lib/media";
import { mediaItemToFormValues } from "@/lib/media-form";
import MediaModalShell from "@/components/app/MediaModalShell";
import MediaFormModal from "@/components/app/MediaFormModal";

// Intercepts /app/media_items/[id]/edit and shows the edit form in a modal over
// the current page. Hard load / refresh falls through to the full edit page.
export default async function MediaEditModalInterceptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId)) return null;

  const user = await requireUser();
  const item = await prisma.mediaItem.findFirst({
    where: { id: numId, userId: user.id },
  });
  if (!item) return null;

  const initial = mediaItemToFormValues(
    item,
    categoryKey(item.category),
    statusKey(item.status)
  );

  return (
    <MediaModalShell path={`/app/media_items/${item.id}/edit`}>
      <div className="px-6 md:px-10 py-8">
        <h2 className="text-xl font-extrabold tracking-[-.03em] m-0 mb-1.5">Editar Mídia</h2>
        <p className="text-sm leading-[1.6] text-[var(--muted)] mb-6">
          Atualize informações, status e progresso de {item.title}.
        </p>
        <MediaFormModal id={item.id} initial={initial} />
      </div>
    </MediaModalShell>
  );
}
