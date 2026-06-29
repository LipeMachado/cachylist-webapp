import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { MobileMenuButton } from "@/components/app/buttons";
import MediaDetailBody from "@/components/app/MediaDetailBody";

export default async function MediaShowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId)) notFound();

  const user = await requireUser();
  const item = await prisma.mediaItem.findFirst({
    where: { id: numId, userId: user.id },
  });
  if (!item) notFound();

  return (
    <>
      <header className="mobile-library-topbar">
        <MobileMenuButton />
        <Link href={`/app/media_items/${item.id}`} className="mobile-brand">
          Detalhes
        </Link>
        <Link href="/app/library" className="mobile-icon-button" aria-label="Voltar para biblioteca">
          <ArrowLeft size={21} />
        </Link>
      </header>

      <MediaDetailBody item={item} />
    </>
  );
}
