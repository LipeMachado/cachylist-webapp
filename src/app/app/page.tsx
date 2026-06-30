import Link from "next/link";
import Image from "next/image";
import { Plus, Play, GripVertical } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { computeStats } from "@/lib/stats";
import {
  DASHBOARD_STATUSES,
  STATUS_TO_INT,
  statusClass,
  statusKey,
  categoryLabel,
  categoryKey,
  coverFor,
  progressLabel,
  progressPercentage,
  displayName,
  toCardData,
} from "@/lib/media";
import Board from "@/components/app/Board";
import MediaCard from "@/components/app/MediaCard";
import { AddMediaButton, MobileMenuButton, MobileSearchLink } from "@/components/app/buttons";
import SearchDropdownInput from "@/components/app/SearchDropdownInput";
import { AvatarMobileButton } from "@/components/app/profile-mobile";

import type { Prisma } from "@prisma/client";

const boardOrder: Prisma.MediaItemOrderByWithRelationInput[] = [
  { sortOrder: "asc" },
  { updatedAt: "desc" },
  { createdAt: "desc" },
];

// Deterministic pseudo-random horizontal position (0–100%) per pulse bar, so the
// bars scatter across the hero — some clustered, some adjacent — instead of being
// evenly spaced. Stable across renders (no hydration mismatch); as the library
// grows, higher indices fill in at new scattered spots.
function barLeft(index: number): string {
  const x = Math.sin((index + 1) * 12.9898) * 43758.5453;
  return ((x - Math.floor(x)) * 100).toFixed(2);
}

export default async function DashboardPage() {
  const user = await requireUser();

  // Single query — everything else is derived in memory (a user's library is small).
  const items = await prisma.mediaItem.findMany({ where: { userId: user.id }, orderBy: boardOrder });
  const stats = computeStats(items);

  const suggestions = Array.from(
    new Set(
      items.flatMap((i) => [i.title, i.platform, i.author]).filter((s): s is string => !!s && s.trim().length > 0)
    )
  ).sort((a, b) => a.localeCompare(b));

  const recentSorted = [...items].sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime() || b.createdAt.getTime() - a.createdAt.getTime()
  );
  const inProgressOrPaused = recentSorted.filter(
    (i) => i.status === STATUS_TO_INT.in_progress || i.status === STATUS_TO_INT.paused
  );
  const continueItems = (inProgressOrPaused.length > 0 ? inProgressOrPaused : recentSorted).slice(0, 3);
  const latestItems = recentSorted.slice(0, 3);

  const itemsByStatus = DASHBOARD_STATUSES.map((status) => ({
    status,
    items: items.filter((i) => statusKey(i.status) === status),
  }));

  const highlightedBars = stats.total > 0 ? Math.min(Math.ceil(stats.total / 5), 72) : 0;

  return (
    <>
      {/* ── Mobile ─────────────────────────────────────────── */}
      <section className="dashboard-mobile">
        <header className="mobile-topbar">
          <MobileMenuButton />
          <Link href="/app" className="mobile-brand">
            <Image src="/logo.png" alt="CachyList" width={120} height={32} className="h-8 w-auto" />
          </Link>
          <MobileSearchLink href="/app/library" />
        </header>
        <div className="mobile-profile-row">
          <AvatarMobileButton avatarUrl={user.avatar ? `/${user.avatar}` : null} initial={displayName(user).charAt(0).toUpperCase()} />
          <Link href={`/app/users/${user.id}`} className="mobile-profile-link">
            <strong>{displayName(user)}</strong>
            <span>Ver perfil ↗</span>
          </Link>
        </div>
        <div className="mobile-hero brutalist-noise">
          <div className="brutalist-noise-content">
            <p className="brutalist-kicker mb-5">Resumo geral</p>
            <h1>
              Sua biblioteca.
              <br />
              Seu mundo.
            </h1>
            <p>Organize tudo o que você assiste, joga, lê e acompanha. Um painel seco, escuro e direto para seu acervo.</p>
          </div>
        </div>
        <div className="mobile-stats-grid">
          <div><strong data-dashboard-stat="total">{stats.total}</strong><span>Total</span></div>
          <div><strong data-dashboard-stat="completed">{stats.count("completed")}</strong><span>Finalizadas</span></div>
          <div><strong data-dashboard-stat="in_progress">{stats.count("in_progress")}</strong><span>Ativas</span></div>
          <div><strong data-dashboard-stat="planned">{stats.count("planned")}</strong><span>Planejadas</span></div>
          <div><strong data-dashboard-stat="completed_percentage">{stats.percentage("completed")}%</strong><span>Conclusão</span></div>
        </div>
        <section className="mobile-section">
          <div className="mobile-section-header">
            <h2>Continue de onde parou</h2>
            <Link href="/app/library">Ver tudo →</Link>
          </div>
          <div className="mobile-progress-list">
            {continueItems.map((item) => {
              const progress = progressPercentage(item);
              return (
                <Link key={item.id} href={`/app/media_items/${item.id}`} className="mobile-progress-card">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverFor(item)} alt={`Capa de ${item.title}`} />
                  <div className="mobile-card-copy">
                    <div className="mobile-card-title">
                      <strong>{item.title}</strong>
                      <span className={`status-dot ${statusClass(statusKey(item.status))}`} />
                    </div>
                    <p>{categoryLabel(categoryKey(item.category))} • {item.releaseYear ?? "----"}</p>
                    <small>{progressLabel(item) || item.platform || "-"}</small>
                    <div className="mobile-progress-line"><span style={{ width: `${progress}%` }} /></div>
                  </div>
                  <div className="mobile-progress-meta">
                    <span>{progress}%</span>
                    <span className="mobile-play"><Play size={13} /></span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
        <section className="mobile-section">
          <div className="mobile-section-header">
            <h2>Últimos adicionados</h2>
            <Link href="/app/library">Ver tudo →</Link>
          </div>
          <div className="mobile-latest-list">
            {latestItems.map((item) => (
              <Link key={item.id} href={`/app/media_items/${item.id}`} className="mobile-latest-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={coverFor(item)} alt={`Capa de ${item.title}`} />
                <div className="mobile-card-copy">
                  <div className="mobile-card-title">
                    <strong>{item.title}</strong>
                    <span className={`status-dot ${statusClass(statusKey(item.status))}`} />
                  </div>
                  <p>{categoryLabel(categoryKey(item.category))} • {item.releaseYear ?? "----"}</p>
                  <small>{progressLabel(item) || item.platform || "-"}</small>
                </div>
                <span className="mobile-grip">
                  <GripVertical size={14} />
                </span>
              </Link>
            ))}
          </div>
        </section>
      </section>

      {/* ── Desktop ────────────────────────────────────────── */}
      <div className="dashboard-desktop">
        <div data-motion className="grid grid-cols-[1fr_minmax(280px,360px)_auto] items-stretch h-20 overflow-hidden border-b border-[var(--line)] bg-[var(--panel-bg)]">
          <div className="px-8 py-3 border-r border-[var(--line)] flex flex-col justify-center">
            <h1 className="text-[13px] leading-none m-0 font-black tracking-[.32em] uppercase">Seu acervo</h1>
          </div>
          <form action="/app/library" method="get" className="relative grid items-center h-full">
            <SearchDropdownInput
              name="query"
              placeholder="Buscar por título, plataforma, categoria..."
              suggestions={suggestions}
              className="min-h-0 border-0 py-3 px-8 text-sm bg-transparent text-[var(--text)] w-full outline-none placeholder:text-[var(--tertiary)] placeholder:text-[13px] hover:bg-[var(--hover-bg)] focus:bg-[var(--hover-bg)]"
            />
          </form>
          <AddMediaButton className="inline-flex items-center gap-2 justify-center min-h-full px-8 bg-transparent border-l border-[var(--line)] text-[var(--text)] text-[11px] font-bold tracking-[.16em] uppercase whitespace-nowrap cursor-pointer transition-[background,color] duration-150 hover:bg-[var(--hover-bg)]">
            <Plus size={16} /> Adicionar
          </AddMediaButton>
        </div>

        <section data-motion className="grid grid-cols-[minmax(0,1fr)_340px] border-b border-[var(--line)] min-h-[390px]">
          <div className="relative px-8 lg:px-10 py-12 border-r border-[var(--line)] overflow-hidden brutalist-noise">
            {highlightedBars > 0 && (
              <div className="library-pulse-bars" aria-hidden="true">
                {Array.from({ length: highlightedBars }).map((_, index) => (
                  <span key={index} style={{ "--bar-left": `${barLeft(index)}%` } as React.CSSProperties}>
                    <i />
                  </span>
                ))}
              </div>
            )}
            <div className="brutalist-noise-content">
              <p className="brutalist-kicker mb-7">Resumo geral</p>
              <h2 className="max-w-[720px] text-[clamp(46px,6vw,82px)] leading-[.92] font-black uppercase tracking-[-.08em] m-0">
                Sua biblioteca.
                <br />
                Seu mundo.
              </h2>
              <p className="mt-8 max-w-[520px] text-[15px] leading-7 text-[var(--muted)]">
                Organize tudo o que você assiste, joga, lê e acompanha. Um painel seco, escuro e direto para seu acervo.
              </p>
              <div className="mt-9 pt-7 border-t border-[var(--line)] grid grid-cols-5 gap-6 max-w-[760px]">
                <div><strong className="block text-2xl font-black" data-dashboard-stat="total">{stats.total}</strong><span className="brutalist-kicker">Total</span></div>
                <div><strong className="block text-2xl font-black" data-dashboard-stat="completed">{stats.count("completed")}</strong><span className="brutalist-kicker">Finalizadas</span></div>
                <div><strong className="block text-2xl font-black" data-dashboard-stat="in_progress">{stats.count("in_progress")}</strong><span className="brutalist-kicker">Ativas</span></div>
                <div><strong className="block text-2xl font-black" data-dashboard-stat="planned">{stats.count("planned")}</strong><span className="brutalist-kicker">Planejadas</span></div>
                <div><strong className="block text-2xl font-black" data-dashboard-stat="completed_percentage">{stats.percentage("completed")}%</strong><span className="brutalist-kicker">Conclusão</span></div>
              </div>
            </div>
          </div>
          <aside className="px-7 py-8 bg-[var(--panel-bg)]">
            <p className="brutalist-kicker mb-8">Indicadores</p>
            <div className="grid gap-0 border-y border-[var(--line)]">
              <div className="py-5 border-b border-[var(--line)]"><strong className="text-4xl font-black" data-dashboard-stat="total">{stats.total}</strong><span className="ml-3 brutalist-kicker">itens na biblioteca</span></div>
              <div className="py-5 border-b border-[var(--line)]"><strong className="text-4xl font-black" data-dashboard-stat="completed">{stats.count("completed")}</strong><span className="ml-3 brutalist-kicker">concluídas</span></div>
              <div className="py-5 border-b border-[var(--line)]"><strong className="text-4xl font-black" data-dashboard-stat="paused">{stats.count("paused")}</strong><span className="ml-3 brutalist-kicker">pausadas</span></div>
              <div className="py-5"><strong className="text-4xl font-black" data-dashboard-stat="completed_percentage">{stats.percentage("completed")}%</strong><span className="ml-3 brutalist-kicker">conclusão média</span></div>
            </div>
          </aside>
        </section>

        <section data-motion className="bg-transparent p-0">
          <div className="min-h-[72px] px-10 border-b border-[var(--line)] flex justify-between items-center">
            <h2 className="m-0 brutalist-kicker">Continue de onde parou</h2>
            <Link href="/app/library" className="brutalist-link inline-flex items-center justify-center w-fit min-h-[48px] border-0 px-[22px] whitespace-nowrap cursor-pointer transition-opacity duration-200 hover:opacity-75">
              Ver tudo →
            </Link>
          </div>
          <Board
            className="flex overflow-x-auto border-b border-[var(--line)] min-h-[420px]"
            columns={itemsByStatus.map(({ status, items }) => ({
              status,
              items: items.map((item) => ({
                id: item.id,
                node: <MediaCard key={item.id} item={toCardData(item)} />,
              })),
            }))}
            addButton
          />
        </section>
      </div>
    </>
  );
}
