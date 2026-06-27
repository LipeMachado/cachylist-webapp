import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { categoryKey, statusKey } from "@/lib/media";
import { mediaItemToFormValues } from "@/components/app/MediaForm";
import MediaFormPage from "@/components/app/MediaFormPage";

export default async function EditMediaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const item = await prisma.mediaItem.findFirst({
    where: { id: Number(id), userId: user.id },
  });
  if (!item) notFound();

  const initial = mediaItemToFormValues(
    item,
    categoryKey(item.category),
    statusKey(item.status)
  );

  return (
    <>
      <div className="px-10 py-10 border-b border-[var(--line)]">
        <h1 className="text-xl font-extrabold tracking-[-.03em] m-0">Editar Mídia</h1>
        <p className="mt-3 text-sm leading-[1.7] text-[var(--muted)]">
          Atualize informações, status e progresso de {item.title}.
        </p>
      </div>
      <MediaFormPage
        mode="edit"
        id={item.id}
        initial={initial}
        cancelHref={`/app/media_items/${item.id}`}
        successHref={`/app/media_items/${item.id}?notice=${encodeURIComponent("Mídia atualizada com sucesso.")}`}
      />
    </>
  );
}
