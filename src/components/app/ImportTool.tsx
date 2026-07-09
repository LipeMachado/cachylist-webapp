"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import {
  analyzeImport,
  confirmImport,
} from "@/lib/actions/import";
import type { IdentifyResult } from "@/lib/services/identify";
import { CATEGORY_KEYS, categoryLabel, FALLBACK_COVER } from "@/lib/media";

interface Card {
  key: string;
  original_title: string;
  title: string;
  category: string;
  cover_url: string;
  description: string;
  release_year: string;
  platform: string;
  anilist_id: number | null;
  identifying: boolean;
  done: boolean;
}

interface SearchResult {
  id: number;
  title: string;
  poster?: string | null;
  year?: number | null;
  release_date?: string;
}

const LIMIT = 50;
// Space out the auto-identify requests so we stay friendly with the upstream
// APIs' rate limits while covers fill in progressively, top to bottom.
const IDENTIFY_GAP_MS = 250;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function searchPath(category: string): string | null {
  switch (category) {
    case "anime":
    case "anime_movie":
      return "/app/anilist/search";
    case "movie":
    case "series":
      return "/app/tmdb/search";
    case "game":
      return "/app/steam/search";
    default:
      return null;
  }
}

function detailsUrl(category: string, id: number): string | null {
  switch (category) {
    case "anime":
    case "anime_movie":
      return `/app/anilist/details?id=${id}`;
    case "movie":
      return `/app/tmdb/details?id=${id}&type=movie`;
    case "series":
      return `/app/tmdb/details?id=${id}&type=tv`;
    case "game":
      return `/app/steam/details?id=${id}`;
    default:
      return null;
  }
}

function titlesToCards(titles: string[]): Card[] {
  return titles.map((t, i) => ({
    key: `${i}-${t}`,
    original_title: t,
    title: t,
    category: "anime",
    cover_url: "",
    description: "",
    release_year: "",
    platform: "",
    anilist_id: null,
    identifying: false,
    done: false,
  }));
}

export default function ImportTool() {
  const [phase, setPhase] = useState<"upload" | "preview" | "done">("upload");
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [page, setPage] = useState(0);
  const [count, setCount] = useState(0);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  // The auto-identify queue reads the freshest cards via this ref. A card is
  // verified exactly once: the `done` flag (in state, so it survives re-mounts /
  // Fast Refresh) gates re-runs, and `inFlight` prevents concurrent duplicates.
  const cardsRef = useRef<Card[]>(cards);
  const inFlight = useRef<Set<string>>(new Set());

  // Keep the queue's view of the cards fresh without restarting it. Declared
  // before the identify effect so the ref is synced before the queue reads it.
  useEffect(() => {
    cardsRef.current = cards;
  });

  const total = cards.length;
  const start = page * LIMIT;
  const visible = cards.slice(start, start + LIMIT);
  const stillIdentifying = visible.some((c) => c.identifying);

  function updateCard(key: string, patch: Partial<Card>) {
    setCards((cs) => cs.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  }

  function removeCard(key: string) {
    inFlight.current.delete(key);
    setCards((cs) => cs.filter((c) => c.key !== key));
  }

  async function identifyCard(card: Card) {
    try {
      const res = await fetch(`/app/identify?query=${encodeURIComponent(card.title.trim())}`);
      const d: IdentifyResult | null = await res.json();
      if (d && d.title) {
        updateCard(card.key, {
          title: d.title || card.title,
          category: d.category || card.category,
          cover_url: d.poster || card.cover_url,
          release_year: d.year != null ? String(d.year) : card.release_year,
          anilist_id: d.source === "anilist" ? d.id : card.anilist_id,
          identifying: false,
          done: true,
        });
      } else {
        updateCard(card.key, { identifying: false, done: true });
      }
    } catch {
      updateCard(card.key, { identifying: false, done: true });
    }
  }

  // Auto-identify the visible page once, one request at a time with a small gap.
  // A card is verified a single time: `done` (in state) gates it permanently and
  // `inFlight` blocks concurrent dupes, so re-mounts / Fast Refresh don't re-check.
  useEffect(() => {
    if (phase !== "preview") return;
    let cancelled = false;
    (async () => {
      for (const card of cardsRef.current.slice(page * LIMIT, page * LIMIT + LIMIT)) {
        if (cancelled) break;
        if (card.done || inFlight.current.has(card.key)) continue;
        inFlight.current.add(card.key);
        setCards((cs) => cs.map((c) => (c.key === card.key ? { ...c, identifying: true } : c)));
        await identifyCard(card);
        inFlight.current.delete(card.key);
        if (cancelled) break;
        await sleep(IDENTIFY_GAP_MS);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, phase]);

  function handleAnalyze(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setError(null);
    startTransition(async () => {
      const fd = new FormData(form);
      const result = await analyzeImport(fd);
      if (!result.ok) {
        setError(result.error ?? "Erro ao analisar.");
        return;
      }
      inFlight.current = new Set();
      setCards(titlesToCards(result.titles ?? []));
      setPage(0);
      setPhase("preview");
    });
  }

  function handleConfirm() {
    startTransition(async () => {
      const payload = cards.map((c) => ({
        title: c.title,
        category: c.category,
        status: "planned",
        cover_url: c.cover_url,
        description: c.description,
        release_year: c.release_year,
        platform: c.platform,
      }));
      const result = await confirmImport(payload);
      setCount(result.count);
      setPhase("done");
    });
  }

  return (
    <div className={`min-h-full bg-[var(--bg)] ${pending ? "is-importing" : ""}`}>
      <div className="px-10 py-10 border-b border-[var(--line)]">
        <h1 className="text-xl font-extrabold tracking-[-.03em] m-0">Importar Lista</h1>
        <p className="mt-3 text-sm leading-[1.7] text-[var(--muted)]">
          Faça upload de um arquivo .txt (um título por linha) ou .csv (com coluna <strong>title</strong>) para importar
          vários itens de uma vez. As capas e dados são buscados automaticamente, aos poucos, conforme você revisa a lista.
        </p>
      </div>

      {error && (
        <div className="px-10 py-4 border-b border-[var(--line)] text-[var(--text)] text-[13px] bg-[var(--panel-muted)]">
          {error}
        </div>
      )}

      {phase === "upload" && (
        <div className="px-10 py-16 border-b border-[var(--line)]">
          <form onSubmit={handleAnalyze}>
            <div className="max-w-lg">
              <label className="grid gap-2 text-[11px] font-semibold tracking-[.12em] uppercase text-[var(--muted)]">
                Arquivo (.txt ou .csv)
                <input
                  ref={fileRef}
                  type="file"
                  name="file"
                  accept=".txt,.csv"
                  required
                  className="mt-1 border border-[var(--line)] min-h-[40px] px-3 text-[13px] bg-transparent text-[var(--text)] outline-none focus:border-[var(--accent)] file:border-0 file:bg-[var(--panel-muted)] file:text-[var(--text)] file:text-[11px] file:font-semibold file:tracking-[.12em] file:uppercase file:min-h-[38px] file:px-3 file:cursor-pointer file:mr-3"
                />
              </label>
              <p className="mt-2 text-xs text-[var(--tertiary)]">
                Formatos aceitos: .txt (1 título por linha) ou .csv (colunas: title). Máximo 5000 itens, arquivo até 2MB.
              </p>
              <button
                type="submit"
                disabled={pending}
                className="mt-8 inline-flex items-center justify-center w-fit min-h-[48px] px-6 bg-[var(--accent)] text-white text-[11px] font-bold tracking-[.14em] uppercase whitespace-nowrap cursor-pointer border-none transition-[background,color,border-color] duration-150 hover:brightness-110 disabled:opacity-60"
              >
                {pending ? "Analisando..." : "Analisar arquivo"}
              </button>
            </div>
          </form>
        </div>
      )}

      {phase === "preview" && (
        <>
          <div className="px-10 py-6 border-b border-[var(--line)]">
            <p className="text-xs text-[var(--tertiary)]">
              {total} {total === 1 ? "título encontrado" : "títulos encontrados"}
              {total > LIMIT ? ` (página ${page + 1})` : ""}. Revise os dados abaixo e ajuste títulos e categorias antes de importar.
              {stillIdentifying ? " Buscando capas…" : ""}
            </p>
          </div>
          <div className="divide-y divide-[var(--line)] border-b border-[var(--line)]">
            {visible.map((card) => (
              <ImportCardRow key={card.key} card={card} onChange={(p) => updateCard(card.key, p)} onRemove={() => removeCard(card.key)} />
            ))}
          </div>
          <div className="px-10 py-6 border-b border-[var(--line)] flex items-center gap-4">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={pending || cards.length === 0}
              className="inline-flex items-center justify-center w-fit min-h-[48px] px-6 bg-[var(--accent)] text-white text-[11px] font-bold tracking-[.14em] uppercase whitespace-nowrap cursor-pointer border-none transition-[background,color,border-color] duration-150 hover:brightness-110 disabled:opacity-60"
            >
              {pending ? "Importando…" : `Importar ${cards.length} ${cards.length === 1 ? "item" : "itens"} →`}
            </button>
            {page > 0 && (
              <button type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} className="inline-flex items-center justify-center w-fit min-h-[48px] px-5 border border-[var(--line)] bg-transparent text-[var(--muted)] text-[11px] font-bold tracking-[.14em] uppercase whitespace-nowrap cursor-pointer transition-[background,color,border-color] duration-150 hover:text-[var(--text)] hover:border-[var(--accent)]">
                ← Página anterior
              </button>
            )}
            {total > (page + 1) * LIMIT && (
              <button type="button" onClick={() => setPage((p) => p + 1)} className="inline-flex items-center justify-center w-fit min-h-[48px] px-5 border border-[var(--line)] bg-transparent text-[var(--muted)] text-[11px] font-bold tracking-[.14em] uppercase whitespace-nowrap cursor-pointer transition-[background,color,border-color] duration-150 hover:text-[var(--text)] hover:border-[var(--accent)]">
                Próxima página →
              </button>
            )}
          </div>
        </>
      )}

      {phase === "done" && (
        <div className="px-10 py-16 border-b border-[var(--line)]">
          <p className="text-sm text-[var(--text)] font-semibold">
            {count} {count === 1 ? "item importado" : "itens importados"} com sucesso!
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Os itens foram adicionados à coluna <strong>Backlog</strong> na biblioteca. Você pode revisar e organizar cada um deles lá.
          </p>
          <Link href="/app/library" className="mt-6 inline-flex items-center justify-center w-fit min-h-[48px] px-6 bg-[var(--accent)] text-white text-[11px] font-bold tracking-[.14em] uppercase whitespace-nowrap cursor-pointer border-none transition-[background,color,border-color] duration-150 hover:brightness-110">
            Ir para Biblioteca →
          </Link>
        </div>
      )}
    </div>
  );
}

function ImportCardRow({
  card,
  onChange,
  onRemove,
}: {
  card: Card;
  onChange: (patch: Partial<Card>) => void;
  onRemove: () => void;
}) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [selectingId, setSelectingId] = useState<number | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchAbort = useRef<AbortController | null>(null);
  const detailsAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      searchAbort.current?.abort();
      detailsAbort.current?.abort();
    };
  }, []);

  async function runSearch(title: string, category: string) {
    if (timeout.current) clearTimeout(timeout.current);
    searchAbort.current?.abort();
    const path = searchPath(category);
    if (!path || title.trim().length < 2) {
      setOpen(false);
      return;
    }
    timeout.current = setTimeout(async () => {
      const controller = new AbortController();
      searchAbort.current = controller;
      try {
        let res = await fetch(`${path}?query=${encodeURIComponent(title.trim())}`, {
          signal: controller.signal,
        });
        let data: SearchResult[] = await res.json();
        if (data.length === 0 && category === "movie") {
          res = await fetch(`/app/anilist/search?query=${encodeURIComponent(title.trim())}`, {
            signal: controller.signal,
          });
          if (res.ok) data = await res.json();
        }
        setResults(data);
        setOpen(true);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setOpen(false);
      }
    }, 350);
  }

  async function select(result: SearchResult) {
    const url = detailsUrl(card.category, result.id);
    if (!url) {
      onChange({ title: result.title, cover_url: result.poster ?? card.cover_url });
      setOpen(false);
      return;
    }
    detailsAbort.current?.abort();
    const controller = new AbortController();
    detailsAbort.current = controller;
    setSelectingId(result.id);
    try {
      const res = await fetch(url, { signal: controller.signal });
      const d = await res.json();
      onChange({
        title: d.title || result.title,
        cover_url: d.poster_url || result.poster || card.cover_url,
        description: d.overview || card.description,
        release_year: d.release_year != null ? String(d.release_year) : card.release_year,
        platform: d.platform || card.platform,
        category: d.category || card.category,
      });
      setOpen(false);
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      onChange({ title: result.title, cover_url: result.poster ?? card.cover_url });
      setOpen(false);
    } finally {
      if (detailsAbort.current === controller) setSelectingId(null);
    }
  }

  const showSkeleton = card.identifying && !card.cover_url;

  return (
    <div className="flex gap-4 px-10 py-5 items-start hover:bg-[var(--hover-bg)] transition-colors">
      {showSkeleton ? (
        <div className="skeleton w-[68px] h-[96px] flex-[0_0_68px] border border-[var(--line-soft)]" aria-label="Buscando capa" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={card.cover_url || FALLBACK_COVER}
          alt=""
          className="w-[68px] h-[96px] object-cover flex-[0_0_68px] border border-[var(--line-soft)]"
          onError={(e) => {
            (e.target as HTMLImageElement).src = FALLBACK_COVER;
          }}
        />
      )}
      <div className="flex-1 min-w-0 grid grid-cols-[1fr_200px_auto] gap-x-4 gap-y-3">
        <div className="relative">
          <label className="grid gap-1 text-[10px] font-semibold tracking-[.12em] uppercase text-[var(--muted)]">
            Título
            <input
              type="text"
              required
              value={card.title}
              onChange={(e) => {
                onChange({ title: e.target.value });
                runSearch(e.target.value, card.category);
              }}
              className="mt-1 border border-[var(--line)] min-h-[36px] px-3 text-[13px] bg-transparent text-[var(--text)] outline-none focus:border-[var(--accent)] w-full"
            />
          </label>
          {open && results.length > 0 && (
            <div className="import-search-results absolute left-0 top-full w-full z-50 border border-[var(--line)] bg-[var(--panel-bg)] shadow-xl max-h-[240px] overflow-y-auto">
              <div className="divide-y divide-[var(--line)]">
                {results.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => select(r)}
                    disabled={selectingId !== null}
                    className="flex items-center gap-3 px-4 py-3 text-left w-full hover:bg-[var(--hover-bg)] cursor-pointer border-0 bg-transparent text-[var(--text)] text-sm disabled:opacity-50 disabled:cursor-wait"
                  >
                    {r.poster ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.poster} alt="" className="w-9 h-[54px] object-cover flex-[0_0_36px]" />
                    ) : (
                      <span className="w-9 h-[54px] bg-[var(--line)] flex-[0_0_36px]" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{r.title}</div>
                      {r.year || r.release_date ? (
                        <div className="text-[var(--muted)] text-[10px] mt-0.5">
                          {r.year || (r.release_date || "").split("-")[0]}
                        </div>
                      ) : null}
                    </div>
                    {selectingId === r.id && (
                      <span className="text-[var(--muted)] text-[10px] shrink-0">Carregando…</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div>
          <label className="grid gap-1 text-[10px] font-semibold tracking-[.12em] uppercase text-[var(--muted)]">
            Categoria
            <select
              value={card.category}
              onChange={(e) => {
                onChange({ category: e.target.value });
                if (card.title.trim().length >= 2) runSearch(card.title, e.target.value);
              }}
              className="mt-1 border border-[var(--line)] min-h-[36px] px-3 text-[13px] bg-transparent text-[var(--text)] outline-none focus:border-[var(--accent)] appearance-none w-full"
            >
              {CATEGORY_KEYS.map((cat) => (
                <option key={cat} value={cat}>
                  {categoryLabel(cat)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="self-stretch flex items-end">
          <button
            type="button"
            onClick={onRemove}
            className="w-12 min-h-[36px] flex items-center justify-center bg-[#991b1b] text-[var(--text)] cursor-pointer transition-[filter] border-0 hover:brightness-110"
            title="Remover"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
