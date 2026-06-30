import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Layers, CheckCircle, Play, Pause, Clock, LayoutDashboard } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { computeStats } from "@/lib/stats";
import {
  DASHBOARD_STATUSES,
  statusKey,
  statusLabel,
  statusClass,
  displayName,
  avatarPath,
  toCardData,
} from "@/lib/media";
import MediaCard from "@/components/app/MediaCard";
import StatCard from "@/components/app/StatCard";
import { MobileMenuButton } from "@/components/app/buttons";
import { AvatarProfileButton } from "@/components/app/profile-mobile";

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const currentUser = await requireUser();
  const profileUser = await prisma.user.findUnique({ where: { id: Number(id) } });
  if (!profileUser) notFound();

  const isOwner = profileUser.id === currentUser.id;
  const name = displayName(profileUser);
  const initial = name.charAt(0).toUpperCase();
  const avatarUrl = avatarPath(profileUser.avatar);

  // Single query — recent list and board are derived in memory.
  const allItems = await prisma.mediaItem.findMany({ where: { userId: profileUser.id } });
  const stats = computeStats(allItems);

  const recentItems = [...allItems]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime() || b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 10);

  const boardItems = [...allItems].sort(
    (a, b) =>
      a.sortOrder - b.sortOrder ||
      b.updatedAt.getTime() - a.updatedAt.getTime() ||
      b.createdAt.getTime() - a.createdAt.getTime()
  );
  const itemsByStatus = DASHBOARD_STATUSES.map((status) => ({
    status,
    items: boardItems.filter((i) => statusKey(i.status) === status),
  }));

  const memberSince = new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(profileUser.createdAt);

  return (
    <>
      <header className="mobile-library-topbar">
        <MobileMenuButton />
        <Link href={`/app/users/${profileUser.id}`} className="mobile-brand">
          Perfil
        </Link>
        <Link href="/app" className="mobile-icon-button" aria-label="Voltar ao dashboard">
          <LayoutDashboard size={21} />
        </Link>
      </header>

      <div className="px-4 py-10 md:py-[25px] text-center border-b border-[var(--line)] bg-[var(--panel-bg)]">
        {isOwner ? (
          <AvatarProfileButton avatarUrl={avatarUrl} initial={initial} />
        ) : (
          <span className="w-16 h-16 mx-auto mb-4 inline-grid place-items-center text-[22px] font-extrabold tracking-[.02em] uppercase bg-[var(--surface)] text-[var(--accent)] border border-[var(--line)] overflow-hidden">
            {avatarUrl ? (
              <Image src={avatarUrl} alt={`Avatar de ${name}`} width={64} height={64} className="w-full h-full object-cover" />
            ) : (
              <span>{initial}</span>
            )}
          </span>
        )}
        <h1 className="text-[clamp(32px,10vw,42px)] font-extrabold tracking-[-.04em] mb-1.5 break-words">{name}</h1>
        <p className="text-[13px] text-[var(--muted)] tracking-[.02em]">Membro desde {memberSince}</p>
        <div className="flex gap-3 justify-center mt-6">
          {isOwner ? (
            <Link href="/edit" className="inline-flex items-center justify-center w-fit min-h-[48px] px-5 bg-[var(--accent)] text-white text-[11px] font-semibold tracking-[.1em] uppercase whitespace-nowrap cursor-pointer border-none transition-[background,color,border-color] duration-150 hover:brightness-110">
              Editar perfil
            </Link>
          ) : (
            <Link href="/app/library" className="inline-flex items-center justify-center w-fit min-h-[48px] px-5 bg-[var(--accent)] text-white text-[11px] font-semibold tracking-[.1em] uppercase whitespace-nowrap cursor-pointer border-none transition-[background,color,border-color] duration-150 hover:brightness-110">
              Biblioteca de {initial}
            </Link>
          )}
        </div>
      </div>

      <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 border-b border-[var(--line)]">
        <StatCard icon={<Layers size={18} />} label="Total" value={stats.total} accent="purple" />
        <StatCard icon={<CheckCircle size={18} />} label="Concluídas" value={stats.count("completed")} meta={`${stats.percentage("completed")}%`} accent="green" />
        <StatCard icon={<Play size={18} />} label="Em Andamento" value={stats.count("in_progress")} meta={`${stats.percentage("in_progress")}%`} accent="blue" />
        <StatCard icon={<Pause size={18} />} label="Pausadas" value={stats.count("paused")} meta={`${stats.percentage("paused")}%`} accent="orange" />
        <StatCard icon={<Clock size={18} />} label="Para Depois" value={stats.count("planned")} meta={`${stats.percentage("planned")}%`} accent="gray" />
      </section>

      {recentItems.length > 0 && (
        <section className="bg-transparent p-0">
          <div className="min-h-[72px] px-4 md:px-10 border-b border-[var(--line)] flex flex-wrap justify-between items-center gap-3">
            <h2 className="m-0 text-[11px] font-medium tracking-[.12em] uppercase text-[var(--muted)]">Mídias recentes</h2>
            <small>{stats.total} itens no total</small>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 overflow-hidden border-y border-[var(--line)] min-h-[420px]">
            {itemsByStatus.map(({ status, items }) => (
              <div
                key={status}
                className="min-w-0 border-r border-b xl:border-b-0 border-[var(--line)] bg-[var(--column-bg)] [&:last-child]:border-r-0"
              >
                <header className="min-h-[60px] px-4 md:px-6 border-b border-[var(--line)] flex items-center gap-2 text-[11px] font-medium tracking-[.12em] uppercase text-[var(--muted)]">
                  <span className={`w-1.5 h-1.5 bg-[var(--accent)] inline-block flex-[0_0_6px] ${statusClass(status)}`} />
                  <strong className="font-medium text-[var(--muted)]">{statusLabel(status)}</strong>
                  <small className="ml-auto text-[var(--tertiary)] text-[11px] tracking-[.04em]">{items.length}</small>
                </header>
                {items.map((item) => (
                  <MediaCard key={item.id} item={toCardData(item)} />
                ))}
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
