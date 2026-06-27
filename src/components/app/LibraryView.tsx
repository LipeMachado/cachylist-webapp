import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import {
  LIBRARY_STATUSES,
  CATEGORY_KEYS,
  STATUS_TO_INT,
  CATEGORY_TO_INT,
  statusLabel,
  statusClass,
  categoryLabel,
  toCardData,
  type CategoryKey,
  type StatusKey,
} from "@/lib/media";
import Kanban from "@/components/app/Kanban";
import MediaCard from "@/components/app/MediaCard";
import SearchDropdownInput from "@/components/app/SearchDropdownInput";
import { AddMediaButton, KanbanAddButton, MobileMenuButton } from "@/components/app/buttons";
import { EmptyState } from "@/components/app/buttons";

export interface LibrarySearchParams {
  query?: string;
  category?: string;
  status?: string;
  platform?: string;
}

function normalize(value: string): string {
  return value.toString().normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function pluralize(word: string): string {
  if (/s$/i.test(word)) return word;
  return `${word}s`;
}

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

  // category filter: route slug takes precedence, else the dropdown param
  const filterCategory =
    selectedCategory ??
    (searchParams.category && searchParams.category in CATEGORY_TO_INT
      ? (searchParams.category as CategoryKey)
      : null);

  let items = allItems;
  if (filterCategory) items = items.filter((i) => i.category === CATEGORY_TO_INT[filterCategory]);
  if (searchParams.status && searchParams.status in STATUS_TO_INT)
    items = items.filter((i) => i.status === STATUS_TO_INT[searchParams.status as StatusKey]);
  if (searchParams.platform)
    items = items.filter((i) => i.platform === searchParams.platform);
  if (searchParams.query) {
    const q = normalize(searchParams.query);
    items = items.filter((i) =>
      normalize([i.title, i.platform, i.author, i.releaseYear].filter(Boolean).join(" ")).includes(q)
    );
  }

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
    items: items.filter((i) => i.status === STATUS_TO_INT[status]),
  }));

  const title = selectedCategory ? pluralize(categoryLabel(selectedCategory)) : "Biblioteca";
  const hasFilters = Boolean(
    searchParams.query || searchParams.category || searchParams.status || searchParams.platform
  );

  const selectCls =
    "min-h-[58px] border-0 bg-[var(--panel-bg)] text-[var(--text)] px-5 outline-none text-sm w-full font-inherit appearance-none border-r border-[var(--line)] hover:bg-[var(--hover-bg)] focus:bg-[var(--hover-bg)] focus:shadow-[inset_0_-2px_0_var(--accent)]";

  return (
    <>
      <header className="mobile-library-topbar">
        <MobileMenuButton />
        <Link href="/app/library" className="mobile-brand">
          {title}
        </Link>
        <Link href="#library-search" className="mobile-icon-button" aria-label="Buscar">
          {/* search icon */}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
        </Link>
      </header>

      <div className="library-hero grid grid-cols-[1fr_auto] items-center min-h-[150px] overflow-hidden border-b border-[var(--line)] bg-[var(--panel-bg)]">
        <div className="px-10 py-9 flex flex-col justify-center">
          <p className="brutalist-kicker mb-5">Acervo filtrável</p>
          <h1 className="text-[clamp(42px,5vw,76px)] leading-[.92] m-0 font-black uppercase tracking-[-.08em]">{title}</h1>
          <p className="mt-5 text-sm leading-6 text-[var(--muted)] tracking-[.01em] max-w-[620px]">
            Pesquise, filtre e mova seus itens entre status. Tudo em grade dura, bordas expostas e zero decoração desnecessária.
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
        <form method="get" action={basePath} className="library-filters grid grid-cols-[minmax(260px,1.4fr)_repeat(3,minmax(180px,.8fr))_auto] border-b border-[var(--line)] bg-[var(--panel-bg)]">
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
          {!selectedCategory && (
            <select name="category" defaultValue={searchParams.category ?? ""} className={selectCls}>
              <option value="">Todas as categorias</option>
              {CATEGORY_KEYS.map((key) => (
                <option key={key} value={key}>
                  {categoryLabel(key)}
                </option>
              ))}
            </select>
          )}
          <select name="status" defaultValue={searchParams.status ?? ""} className={selectCls}>
            <option value="">Todos os status</option>
            {LIBRARY_STATUSES.map((key) => (
              <option key={key} value={key}>
                {statusLabel(key)}
              </option>
            ))}
          </select>
          <select name="platform" defaultValue={searchParams.platform ?? ""} className={selectCls}>
            <option value="">Todas as plataformas</option>
            {platforms.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <div className="flex justify-end border-l border-[var(--line)]">
            {hasFilters && (
              <Link
                href={basePath}
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

        {items.length > 0 ? (
          <Kanban className="library-board flex overflow-x-auto border-b border-[var(--line)]">
            {itemsByStatus.map(({ status, items: colItems }) => (
              <div
                key={status}
                className="kanban-column border-r border-[var(--line)] bg-[var(--column-bg)] [&:last-child]:border-r-0"
                data-kanban-target="column"
                data-kanban-status={status}
              >
                <header className="min-h-[60px] px-6 border-b border-[var(--line)] flex items-center gap-2 text-[10px] font-bold tracking-[.16em] uppercase text-[var(--muted)]">
                  <span className={`w-1.5 h-1.5 bg-[var(--accent)] inline-block flex-[0_0_6px] ${statusClass(status)}`} />
                  <strong className="font-bold text-[var(--muted)] truncate">{statusLabel(status)}</strong>
                  <small className="ml-auto text-[var(--tertiary)] text-[11px] tracking-[.04em]">{colItems.length}</small>
                  <KanbanAddButton status={status} category={selectedCategory ?? undefined} />
                </header>
                {colItems.map((item) => (
                  <MediaCard key={item.id} item={toCardData(item)} />
                ))}
              </div>
            ))}
          </Kanban>
        ) : (
          <EmptyState
            title="Sua lista está vazia"
            text="Adicione animes, séries, filmes, livros e jogos para começar."
          />
        )}
      </section>
    </>
  );
}
