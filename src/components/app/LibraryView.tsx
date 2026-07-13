import Link from "next/link";
import { Plus } from "lucide-react";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import {
  LIBRARY_STATUSES,
  CATEGORY_KEYS,
  STATUS_TO_INT,
  CATEGORY_TO_INT,
  statusLabel,
  statusClass,
  statusKey,
  categoryLabel,
  toCardData,
  type CategoryKey,
  type StatusKey,
} from "@/lib/media";
import Board from "@/components/app/Board";
import MediaCard from "@/components/app/MediaCard";
import InfiniteMediaGrid from "@/components/app/InfiniteMediaGrid";
import SearchDropdownInput from "@/components/app/SearchDropdownInput";
import { AddMediaButton, MobileMenuButton } from "@/components/app/buttons";
import { EmptyState } from "@/components/app/buttons";
import ViewToggle from "@/components/app/ViewToggle";
import {
  LIBRARY_PAGE_SIZE,
  filterMediaItems,
  filterByStatus,
  sortMediaItems,
} from "@/lib/library-query";

export interface LibrarySearchParams {
  query?: string;
  category?: string;
  status?: string;
  platform?: string;
  sort?: string;
  view?: string;
}

function pluralize(word: string): string {
  if (/s$/i.test(word)) return word;
  return `${word}s`;
}

// Build a URL from the current params plus overrides; empty/undefined drops a key.
function hrefWith(
  basePath: string,
  sp: LibrarySearchParams,
  overrides: Partial<LibrarySearchParams>
): string {
  const merged: Record<string, string | undefined> = { ...sp, ...overrides };
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v) qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `${basePath}?${s}` : basePath;
}

const SORTS: { key: string; label: string }[] = [
  { key: "", label: "Ordem manual" },
  { key: "recent", label: "Recentes" },
  { key: "title", label: "Título A–Z" },
  { key: "year", label: "Ano (novo→antigo)" },
];

export default async function LibraryView({
  selectedCategory,
  basePath,
  searchParams,
}: {
  selectedCategory: CategoryKey | null;
  basePath: string;
  searchParams: LibrarySearchParams;
}) {
  const user = await requireUser();

  const allItems = await prisma.mediaItem.findMany({
    where: { userId: user.id },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }, { createdAt: "desc" }],
  });

  // View comes from the URL when set, else from the saved cookie preference.
  const savedView = (await cookies()).get("cachy-view")?.value;
  const isBoard = (searchParams.view ?? savedView) === "board";

  // category filter: route slug takes precedence, else the dropdown param
  const filterCategory =
    selectedCategory ??
    (searchParams.category && searchParams.category in CATEGORY_TO_INT
      ? (searchParams.category as CategoryKey)
      : null);

  // `base` = everything filtered EXCEPT status (so the status tabs can show counts
  // and the board can populate every column).
  const base = filterMediaItems(allItems, {
    category: filterCategory ?? undefined,
    platform: searchParams.platform,
    query: searchParams.query,
  });

  const activeStatus =
    searchParams.status && searchParams.status in STATUS_TO_INT
      ? (searchParams.status as StatusKey)
      : null;

  // Grid items: also filtered by the active status tab, then sorted. Group by
  // statusKey() so legacy "backlog" (int 5) items fold into Para Depois. Only
  // the first page is rendered here — InfiniteMediaGrid fetches the rest
  // (LIBRARY_PAGE_SIZE at a time) from /app/library/items as the user scrolls.
  const gridItems = sortMediaItems(filterByStatus(base, searchParams.status), searchParams.sort);
  const gridFirstPage = gridItems.slice(0, LIBRARY_PAGE_SIZE).map(toCardData);
  const gridHasMore = gridItems.length > LIBRARY_PAGE_SIZE;

  const countFor = (status: StatusKey) =>
    base.filter((i) => statusKey(i.status) === status).length;

  const platforms = Array.from(
    new Set(allItems.map((i) => i.platform).filter((p): p is string => !!p && p.trim().length > 0))
  ).sort((a, b) => a.localeCompare(b));

  const suggestions = Array.from(
    new Set(
      allItems.flatMap((i) => [i.title, i.platform, i.author]).filter((s): s is string => !!s && s.trim().length > 0)
    )
  ).sort((a, b) => a.localeCompare(b));

  const itemsByStatus = LIBRARY_STATUSES.map((status) => ({
    status,
    items: base.filter((i) => statusKey(i.status) === status),
  }));

  const title = selectedCategory ? pluralize(categoryLabel(selectedCategory)) : "Biblioteca";
  const hasFilters = Boolean(
    searchParams.query || searchParams.category || searchParams.status || searchParams.platform || searchParams.sort
  );

  const selectCls =
    "min-h-[58px] border-0 bg-[var(--panel-bg)] text-[var(--text)] px-5 outline-none text-sm w-full font-inherit appearance-none border-r border-[var(--line)] hover:bg-[var(--hover-bg)] focus:bg-[var(--hover-bg)] focus:shadow-[inset_0_-2px_0_var(--accent)]";

  const tabBase =
    "inline-flex items-center gap-2 px-4 min-h-[44px] text-[11px] font-bold tracking-[.12em] uppercase whitespace-nowrap border-r border-[var(--line)] transition-[background,color] duration-150";
  const tabOn = "bg-[var(--hover-bg)] text-[var(--text)] shadow-[inset_0_-2px_0_var(--accent)]";
  const tabOff = "bg-transparent text-[var(--muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--text)]";

  return (
    <>
      <header className="mobile-library-topbar">
        <MobileMenuButton />
        <Link href="/app/library" className="mobile-brand">
          {title}
        </Link>
        <Link href="#library-search" className="mobile-icon-button" aria-label="Buscar">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
        </Link>
      </header>

      <div className="library-hero grid grid-cols-[1fr_auto] items-center min-h-[150px] overflow-hidden border-b border-[var(--line)] bg-[var(--panel-bg)]">
        <div className="px-10 py-9 flex flex-col justify-center">
          <p className="brutalist-kicker mb-5">Acervo filtrável</p>
          <h1 className="text-[clamp(42px,5vw,76px)] leading-[.92] m-0 font-black uppercase tracking-[-.08em]">{title}</h1>
          <p className="mt-5 text-sm leading-6 text-[var(--muted)] tracking-[.01em] max-w-[620px]">
            Pesquise, filtre e organize seu acervo. Grade de capas pra varrer rápido, ou modo quadro pra arrastar entre status.
          </p>
        </div>
        <div className="flex items-center pr-10">
          <AddMediaButton
            category={selectedCategory ?? undefined}
            className="inline-flex gap-3 items-center justify-center w-fit min-h-[48px] px-6 border border-[var(--line)] bg-transparent text-[var(--text)] text-[11px] font-bold tracking-[.16em] uppercase whitespace-nowrap transition-[background,color,border-color] duration-150 hover:bg-[var(--hover-bg)] hover:border-[var(--accent-strong)]"
          >
            <Plus size={16} /> Nova mídia
          </AddMediaButton>
        </div>
      </div>

      <section className="bg-transparent p-0">
        <form method="get" action={basePath} className="library-filters grid grid-cols-[minmax(260px,1.4fr)_repeat(3,minmax(160px,.8fr))_auto] border-b border-[var(--line)] bg-[var(--panel-bg)]">
          {/* preserve the current view/status across a filter submit */}
          {searchParams.view && <input type="hidden" name="view" value={searchParams.view} />}
          {!isBoard && searchParams.status && <input type="hidden" name="status" value={searchParams.status} />}
          <div className="border-r border-[var(--line)]">
            <SearchDropdownInput
              id="library-search"
              name="query"
              defaultValue={searchParams.query}
              placeholder="Buscar na biblioteca..."
              suggestions={suggestions}
              className="min-h-[58px] border-0 bg-transparent text-[var(--text)] px-5 outline-none text-sm w-full font-inherit placeholder:text-[var(--tertiary)] placeholder:text-[13px] hover:bg-[var(--hover-bg)] focus:bg-[var(--hover-bg)]"
            />
          </div>
          {!selectedCategory ? (
            <select name="category" defaultValue={searchParams.category ?? ""} className={selectCls}>
              <option value="">Todas as categorias</option>
              {CATEGORY_KEYS.map((key) => (
                <option key={key} value={key}>
                  {categoryLabel(key)}
                </option>
              ))}
            </select>
          ) : (
            <span className="border-r border-[var(--line)]" />
          )}
          <select name="platform" defaultValue={searchParams.platform ?? ""} className={selectCls}>
            <option value="">Todas as plataformas</option>
            {platforms.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select name="sort" defaultValue={searchParams.sort ?? ""} className={selectCls} aria-label="Ordenar">
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
          <div className="flex justify-end border-l border-[var(--line)]">
            {hasFilters && (
              <Link
                href={hrefWith(basePath, {}, { view: searchParams.view })}
                className="brutalist-link inline-flex items-center justify-center min-h-[58px] border-r border-[var(--line)] px-6 whitespace-nowrap cursor-pointer hover:bg-[var(--hover-bg)]"
              >
                Limpar
              </Link>
            )}
            <button
              type="submit"
              className="inline-flex items-center justify-center min-h-[58px] px-6 bg-[var(--panel-muted)] text-[var(--text)] text-[11px] font-bold tracking-[.14em] uppercase whitespace-nowrap cursor-pointer transition-[background,color,border-color] duration-150 hover:bg-[var(--hover-bg)]"
            >
              Filtrar
            </button>
          </div>
        </form>

        {/* status tabs (grid mode) + view toggle */}
        <div className="flex items-stretch justify-between border-b border-[var(--line)] bg-[var(--panel-bg)] overflow-x-auto">
          <div className="flex items-stretch">
            {!isBoard && (
              <>
                <Link href={hrefWith(basePath, searchParams, { status: "" })} className={`${tabBase} ${!activeStatus ? tabOn : tabOff}`}>
                  Todos <small className="text-[var(--tertiary)]">{base.length}</small>
                </Link>
                {LIBRARY_STATUSES.map((s) => (
                  <Link
                    key={s}
                    href={hrefWith(basePath, searchParams, { status: s })}
                    className={`${tabBase} ${activeStatus === s ? tabOn : tabOff}`}
                  >
                    <span className={`w-1.5 h-1.5 inline-block flex-[0_0_6px] ${statusClass(s)}`} />
                    {statusLabel(s)} <small className="text-[var(--tertiary)]">{countFor(s)}</small>
                  </Link>
                ))}
              </>
            )}
          </div>
          <ViewToggle
            gridHref={hrefWith(basePath, searchParams, { view: "grid" })}
            boardHref={hrefWith(basePath, searchParams, { view: "board", status: "" })}
            isBoard={isBoard}
          />
        </div>

        {base.length === 0 ? (
          <EmptyState
            title="Sua lista está vazia"
            text="Adicione animes, séries, filmes, livros e jogos para começar."
          />
        ) : isBoard ? (
          <Board
            className="library-board flex overflow-x-auto border-b border-[var(--line)]"
            columns={itemsByStatus.map(({ status, items }) => ({
              status,
              items: items.map((item) => ({
                id: item.id,
                node: <MediaCard key={item.id} item={toCardData(item)} />,
              })),
            }))}
            category={selectedCategory ?? undefined}
            addButton
          />
        ) : gridItems.length === 0 ? (
          <div className="px-10 py-20 text-center text-sm text-[var(--muted)]">
            Nenhum item neste status.
          </div>
        ) : (
          <InfiniteMediaGrid
            key={`${basePath}?${filterCategory ?? ""}|${activeStatus ?? ""}|${searchParams.platform ?? ""}|${searchParams.query ?? ""}|${searchParams.sort ?? ""}`}
            initialItems={gridFirstPage}
            initialHasMore={gridHasMore}
            filters={{
              category: filterCategory ?? "",
              status: activeStatus ?? "",
              platform: searchParams.platform ?? "",
              query: searchParams.query ?? "",
              sort: searchParams.sort ?? "",
            }}
          />
        )}
      </section>
    </>
  );
}
