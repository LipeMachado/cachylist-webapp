import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import {
  categoryKey,
  categoryLabel,
  statusKey,
  statusLabel,
  statusClass,
  coverFor,
  progressLabel,
  progressPercentage,
} from "@/lib/media";
import { MobileMenuButton } from "@/components/app/buttons";
import DeleteMediaButton from "@/components/app/DeleteMediaButton";

export default async function MediaShowPage({
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

  const pLabel = progressLabel(item);
  const pPct = progressPercentage(item);

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

      <section className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6 md:gap-9 px-4 md:px-10 py-8 md:py-12 border-b border-[var(--line)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={coverFor(item)}
          alt={`Capa de ${item.title}`}
          className="w-full max-w-[260px] md:max-w-none mx-auto aspect-[2/3] object-cover"
        />
        <div className="min-w-0 text-center md:text-left">
          <span className="inline-block text-[11px] font-medium tracking-[.12em] uppercase text-[var(--accent)] mb-3.5">
            {categoryLabel(categoryKey(item.category))}
          </span>
          <h1 className="text-[clamp(32px,9vw,48px)] leading-[.95] break-words">{item.title}</h1>
          <p className="my-[18px] text-sm leading-[1.7] text-[var(--muted)] max-w-[640px] break-words">
            {item.description || "Sem descrição cadastrada."}
          </p>
          <div className="flex flex-wrap gap-3 items-center justify-center md:justify-start mt-7">
            <Link
              href={`/app/media_items/${item.id}/edit`}
              className="inline-flex items-center justify-center w-fit min-h-[48px] px-5 bg-[var(--accent)] text-white text-[11px] font-semibold tracking-[.1em] uppercase whitespace-nowrap cursor-pointer border-none transition-[background,color,border-color] duration-150 hover:brightness-110"
            >
              Editar
            </Link>
            <DeleteMediaButton id={item.id} />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 border-b border-[var(--line)]">
        <article className="min-w-0 p-4 md:p-8 border-r border-b md:border-b-0 border-[var(--line)] [&:last-child]:border-r-0">
          <h2 className="text-[11px] font-medium tracking-[.12em] uppercase text-[var(--muted)] mb-2.5">Status</h2>
          <p className="text-sm text-[var(--text)] leading-[1.6] break-words">
            <span className={`w-1.5 h-1.5 bg-[var(--accent)] inline-block flex-[0_0_6px] ${statusClass(statusKey(item.status))}`} />{" "}
            {statusLabel(statusKey(item.status))}
          </p>
        </article>
        <article className="min-w-0 p-4 md:p-8 border-r border-b md:border-b-0 border-[var(--line)] [&:last-child]:border-r-0">
          <h2 className="text-[11px] font-medium tracking-[.12em] uppercase text-[var(--muted)] mb-2.5">Progresso</h2>
          <p className="text-sm text-[var(--text)] leading-[1.6] break-words">{pLabel || "Sem progresso definido"}</p>
          <div className="h-[3px] bg-[var(--line)] overflow-hidden mt-2.5">
            <span className="block h-full bg-[var(--accent)]" style={{ width: `${pPct}%` }} />
          </div>
        </article>
        <article className="min-w-0 p-4 md:p-8 border-r border-[var(--line)] [&:last-child]:border-r-0">
          <h2 className="text-[11px] font-medium tracking-[.12em] uppercase text-[var(--muted)] mb-2.5">Avaliação</h2>
          <p className="text-sm text-[var(--text)] leading-[1.6] break-words">
            {item.rating != null ? `${item.rating}/10` : "Não avaliado"}
          </p>
        </article>
        <article className="min-w-0 p-4 md:p-8 border-r border-[var(--line)] [&:last-child]:border-r-0">
          <h2 className="text-[11px] font-medium tracking-[.12em] uppercase text-[var(--muted)] mb-2.5">Plataforma</h2>
          <p className="text-sm text-[var(--text)] leading-[1.6] break-words">{item.platform || "Não informada"}</p>
        </article>
      </section>

      <section className="px-4 md:px-10 py-8 md:py-10 border-b border-[var(--line)]">
        <h2 className="text-[11px] font-medium tracking-[.12em] uppercase text-[var(--muted)] mb-4">Notas pessoais</h2>
        <p className="text-sm leading-[1.7] text-[var(--muted)] break-words whitespace-pre-line">
          {item.notes || "Nenhuma nota pessoal adicionada."}
        </p>
      </section>
    </>
  );
}
