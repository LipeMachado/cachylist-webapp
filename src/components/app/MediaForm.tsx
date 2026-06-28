"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  CATEGORY_KEYS,
  STATUS_KEYS,
  categoryLabel,
  statusLabel,
  type CategoryKey,
  type StatusKey,
} from "@/lib/media";
import { type MediaFormValues } from "@/lib/media-form";
import { createMedia, updateMedia } from "@/lib/actions/media";

interface SearchResult {
  id: number;
  title: string;
  poster?: string | null;
  year?: number | null;
  media_type?: string;
  category?: string;
}

interface Props {
  mode: "create" | "edit";
  id?: number;
  initial: MediaFormValues;
  onCancel?: () => void;
  onSuccess?: () => void;
  onCategoryChange?: (category: CategoryKey) => void;
  onDirty?: () => void;
}

const labelCls =
  "px-2 md:px-5 py-[18px] md:border-b border-[var(--line)] grid gap-1.5 text-[10px] font-semibold tracking-[.12em] uppercase text-[var(--muted)]";
const inputCls =
  "mt-1.5 border border-[var(--line)] min-h-[40px] px-3 text-[13px] bg-transparent text-[var(--text)] outline-none focus:border-[var(--accent)] placeholder:text-[var(--tertiary)] placeholder:text-[13px] w-full";

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

export default function MediaForm({
  mode,
  id,
  initial,
  onCancel,
  onSuccess,
  onCategoryChange,
  onDirty,
}: Props) {
  const [values, setValues] = useState<MediaFormValues>(initial);
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  // search dropdown state
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const cat = values.category;
  const episodic = cat === "anime" || cat === "series";

  function setField<K extends keyof MediaFormValues>(key: K, value: MediaFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    onDirty?.();
  }

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);

  function runSearch(title: string, category: string) {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    const path = searchPath(category);
    if (!path || title.trim().length < 2) {
      setShowResults(false);
      setResults([]);
      return;
    }
    setLoadingSearch(true);
    setShowResults(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`${path}?query=${encodeURIComponent(title.trim())}`);
        const data = (await res.json()) as SearchResult[];
        setResults(Array.isArray(data) ? data : []);
        setShowResults(true);
      } catch {
        setResults([]);
        setShowResults(false);
      } finally {
        setLoadingSearch(false);
      }
    }, 350);
  }

  async function selectResult(result: SearchResult) {
    setShowResults(false);
    const url = detailsUrl(cat, result.id);
    if (!url) return;
    try {
      const res = await fetch(url);
      const d = (await res.json()) as Record<string, unknown>;
      applyDetails(d);
    } catch {
      // ignore
    }
  }

  function applyDetails(d: Record<string, unknown>) {
    setValues((v) => {
      const next = { ...v };
      if (d.title) next.title = String(d.title);
      if (d.poster_url) next.cover_url = String(d.poster_url);
      if (d.overview) next.description = String(d.overview);
      if (d.release_year != null) next.release_year = String(d.release_year);

      const detailCategory = d.category as string | undefined;
      if (cat === "movie" || cat === "series") {
        if (d.duration_minutes != null) next.duration_minutes = String(d.duration_minutes);
        if (d.total_seasons != null) next.total_seasons = String(d.total_seasons);
        if (d.total_episodes != null) next.total_episodes = String(d.total_episodes);
        if (d.platform) next.platform = String(d.platform);
        if (detailCategory && cat === "movie") next.category = detailCategory as CategoryKey;
        if (next.category === "series") {
          next.current_season = "1";
          next.current_episode = "0";
        }
      } else if (cat === "game") {
        if (d.platform) next.platform = String(d.platform);
        else next.platform = "Steam";
        next.category = "game";
      } else {
        // anilist (anime / anime_movie)
        if (d.total_episodes != null) next.total_episodes = String(d.total_episodes);
        const nextCategory =
          v.category === "anime_movie" ? "anime_movie" : (detailCategory as CategoryKey) || v.category;
        next.category = nextCategory;
        if (nextCategory === "anime" || nextCategory === "series") {
          next.current_season = "1";
          next.current_episode = "0";
        }
      }
      return next;
    });
    onDirty?.();
  }

  function handleTitleChange(value: string) {
    setField("title", value);
    runSearch(value, cat);
  }

  function handleCategoryChange(value: CategoryKey) {
    setField("category", value);
    onCategoryChange?.(value);
    if (values.title.trim().length >= 2) runSearch(values.title, value);
    else setShowResults(false);
  }

  function buildFormData(): FormData {
    const fd = new FormData();
    fd.set("title", values.title);
    fd.set("description", values.description);
    fd.set("category", values.category);
    fd.set("status", values.status);
    fd.set("platform", values.platform);
    fd.set("release_year", values.release_year);
    fd.set("rating", values.rating);
    fd.set("cover_url", values.cover_url);
    fd.set("started_at", values.started_at);
    fd.set("finished_at", values.finished_at);
    fd.set("notes", values.notes);
    if (episodic) {
      fd.set("current_season", values.current_season);
      fd.set("total_seasons", values.total_seasons);
      fd.set("current_episode", values.current_episode);
      fd.set("total_episodes", values.total_episodes);
    }
    if (cat === "book") {
      fd.set("author", values.author);
      fd.set("current_page", values.current_page);
      fd.set("total_pages", values.total_pages);
    }
    if (cat === "movie" || cat === "anime_movie") {
      fd.set("duration_minutes", values.duration_minutes);
    }
    if (cat === "game") {
      fd.set("hours_played", values.hours_played);
      if (values.wants_platinum) fd.set("wants_platinum", "1");
      if (values.platinum_completed) fd.set("platinum_completed", "1");
    }
    return fd;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = buildFormData();
    startTransition(async () => {
      const result =
        mode === "create" ? await createMedia(fd) : await updateMedia(id!, fd);
      if (result.ok) {
        setErrors([]);
        onSuccess?.();
      } else {
        setErrors(result.errors);
      }
    });
  }

  return (
    <form id="media_item_form" className="grid" onSubmit={handleSubmit}>
      {errors.length > 0 && (
        <div className="px-4 md:px-10 py-4 border-b border-[var(--line)] text-[var(--text)] text-[13px] bg-[var(--panel-muted)]">
          <strong className="block mb-1 text-[11px] tracking-[.12em] uppercase text-[var(--text)]">
            Revise os campos:
          </strong>
          {errors.join(". ")}
        </div>
      )}

      <section className="px-4 md:px-10 py-4 md:py-10 border-b border-[var(--line)]">
        <h2 className="text-[11px] font-medium tracking-[.12em] uppercase text-[var(--muted)] mb-6">
          Informações gerais
        </h2>
        <div className="grid bg-transparent grid-cols-1 md:grid-cols-2 gap-y-6 md:gap-x-6 md:gap-y-8">
          <div className="px-2 md:px-5 py-[18px] md:border-b border-[var(--line)]">
            <label className="grid gap-1.5 text-[10px] font-semibold tracking-[.12em] uppercase text-[var(--muted)]">
              Título
              <div className="relative" ref={wrapperRef}>
                <input
                  type="text"
                  required
                  placeholder="One Piece"
                  autoComplete="off"
                  value={values.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className={inputCls}
                />
                {showResults && (
                  <div className="absolute left-0 right-0 top-full z-50 bg-[var(--surface)] border border-[var(--line)] border-t-0 shadow-lg max-h-[360px] overflow-y-auto">
                    {loadingSearch ? (
                      <div className="px-4 py-3 text-[var(--muted)] text-sm">Buscando…</div>
                    ) : results.length === 0 ? (
                      <div className="px-4 py-3 text-[var(--muted)] text-sm">Nenhum resultado.</div>
                    ) : (
                      results.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => selectResult(r)}
                          className="flex items-center gap-3 px-4 py-3 text-left w-full hover:bg-[rgba(255,255,255,.06)] cursor-pointer border-0 bg-transparent text-[var(--text)] text-sm"
                        >
                          {r.poster ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={r.poster} alt="" className="w-9 h-[54px] object-cover flex-[0_0_36px]" />
                          ) : (
                            <span className="w-9 h-[54px] bg-[var(--line)] flex-[0_0_36px]" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="font-medium truncate">{r.title}</div>
                            {r.year ? (
                              <div className="text-[var(--muted)] text-xs">{r.year}</div>
                            ) : null}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </label>
          </div>

          <label className={labelCls}>
            Categoria
            <select
              value={values.category}
              onChange={(e) => handleCategoryChange(e.target.value as CategoryKey)}
              className={`${inputCls} appearance-none`}
            >
              {CATEGORY_KEYS.map((key) => (
                <option key={key} value={key}>
                  {categoryLabel(key)}
                </option>
              ))}
            </select>
          </label>

          <label className={labelCls}>
            Status
            <select
              value={values.status}
              onChange={(e) => setField("status", e.target.value as StatusKey)}
              className={`${inputCls} appearance-none`}
            >
              {STATUS_KEYS.map((key) => (
                <option key={key} value={key}>
                  {statusLabel(key)}
                </option>
              ))}
            </select>
          </label>

          <label className={labelCls}>
            Plataforma
            <input
              type="text"
              placeholder="Crunchyroll, Kindle, Steam..."
              value={values.platform}
              onChange={(e) => setField("platform", e.target.value)}
              className={inputCls}
            />
          </label>

          <label className={labelCls}>
            Ano de lançamento
            <input
              type="number"
              min={1800}
              max={2200}
              placeholder="ex: 2024"
              value={values.release_year}
              onChange={(e) => setField("release_year", e.target.value)}
              className={inputCls}
            />
          </label>

          <label className={labelCls}>
            Avaliação (0-10)
            <input
              type="number"
              min={0}
              max={10}
              placeholder="0-10"
              value={values.rating}
              onChange={(e) => setField("rating", e.target.value)}
              className={inputCls}
            />
          </label>

          <label className={`${labelCls} col-span-1 md:col-span-2`}>
            URL da capa
            <input
              type="url"
              placeholder="https://..."
              value={values.cover_url}
              onChange={(e) => setField("cover_url", e.target.value)}
              className={inputCls}
            />
          </label>

          <label className={`${labelCls} col-span-1 md:col-span-2`}>
            Descrição
            <textarea
              rows={4}
              placeholder="Sinopse, resumo ou observações sobre esta mídia..."
              value={values.description}
              onChange={(e) => setField("description", e.target.value)}
              className={`${inputCls} py-2.5 min-h-20 resize-y`}
            />
          </label>
        </div>
      </section>

      <section className="px-4 md:px-10 py-4 md:py-10 border-b border-[var(--line)]">
        <h2 className="text-[11px] font-medium tracking-[.12em] uppercase text-[var(--muted)] mb-6">
          Progresso
        </h2>
        <div className="grid bg-transparent grid-cols-1 md:grid-cols-3 gap-y-6 md:gap-x-6 md:gap-y-8">
          <label className={labelCls}>
            Data de início
            <input
              type="date"
              value={values.started_at}
              onChange={(e) => setField("started_at", e.target.value)}
              className={inputCls}
            />
          </label>
          <label className={labelCls}>
            Data de conclusão
            <input
              type="date"
              value={values.finished_at}
              onChange={(e) => setField("finished_at", e.target.value)}
              className={inputCls}
            />
          </label>

          {episodic && (
            <>
              <label className={labelCls}>
                Temporada atual
                <input type="number" min={0} placeholder="ex: 1" value={values.current_season} onChange={(e) => setField("current_season", e.target.value)} className={inputCls} />
              </label>
              <label className={labelCls}>
                Total de temporadas
                <input type="number" min={0} placeholder="ex: 4" value={values.total_seasons} onChange={(e) => setField("total_seasons", e.target.value)} className={inputCls} />
              </label>
              <label className={labelCls}>
                Episódio atual
                <input type="number" min={0} placeholder="ex: 12" value={values.current_episode} onChange={(e) => setField("current_episode", e.target.value)} className={inputCls} />
              </label>
              <label className={labelCls}>
                Total de episódios
                <input type="number" min={0} placeholder="ex: 24" value={values.total_episodes} onChange={(e) => setField("total_episodes", e.target.value)} className={inputCls} />
              </label>
            </>
          )}

          {cat === "book" && (
            <>
              <label className={labelCls}>
                Autor
                <input type="text" placeholder="Nome do autor" value={values.author} onChange={(e) => setField("author", e.target.value)} className={inputCls} />
              </label>
              <label className={labelCls}>
                Página atual
                <input type="number" min={0} placeholder="ex: 150" value={values.current_page} onChange={(e) => setField("current_page", e.target.value)} className={inputCls} />
              </label>
              <label className={labelCls}>
                Total de páginas
                <input type="number" min={0} placeholder="ex: 350" value={values.total_pages} onChange={(e) => setField("total_pages", e.target.value)} className={inputCls} />
              </label>
            </>
          )}

          {(cat === "movie" || cat === "anime_movie") && (
            <label className={labelCls}>
              Duração (min)
              <input type="number" min={0} placeholder="ex: 120" value={values.duration_minutes} onChange={(e) => setField("duration_minutes", e.target.value)} className={inputCls} />
            </label>
          )}

          {cat === "game" && (
            <>
              <label className={labelCls}>
                Horas jogadas
                <input type="number" min={0} placeholder="ex: 40" value={values.hours_played} onChange={(e) => setField("hours_played", e.target.value)} className={inputCls} />
              </label>
              <div className="px-2 md:px-5 py-[18px] md:border-b border-[var(--line)] col-span-1 md:col-span-2">
                <div className="flex gap-6 items-end px-2 md:px-[18px] py-[18px] bg-[var(--bg)]">
                  <label className="inline-flex items-center gap-2 cursor-pointer normal-case tracking-normal text-sm text-[var(--text)]">
                    <input type="checkbox" checked={values.wants_platinum} onChange={(e) => setField("wants_platinum", e.target.checked)} className="mt-0 w-[18px] h-[18px] min-h-[18px]" /> Deseja platinar
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer normal-case tracking-normal text-sm text-[var(--text)]">
                    <input type="checkbox" checked={values.platinum_completed} onChange={(e) => setField("platinum_completed", e.target.checked)} className="mt-0 w-[18px] h-[18px] min-h-[18px]" /> Platinado
                  </label>
                </div>
              </div>
            </>
          )}

          <label className={`${labelCls} col-span-1 md:col-span-3`}>
            Notas pessoais
            <textarea
              rows={5}
              placeholder="Suas impressões, anotações, spoilers..."
              value={values.notes}
              onChange={(e) => setField("notes", e.target.value)}
              className={`${inputCls} py-2.5 min-h-20 resize-y`}
            />
          </label>
        </div>
      </section>

      <div className="flex justify-end gap-3 px-4 md:px-10 py-6 border-b border-[var(--line)]">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center justify-center w-fit min-h-[48px] px-5 bg-[var(--panel-muted)] text-[var(--muted)] text-[11px] font-semibold tracking-[.1em] uppercase whitespace-nowrap cursor-pointer font-inherit transition-[background,color,border-color] duration-150 hover:bg-[var(--hover-bg)] hover:text-[var(--text)]"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center w-fit min-h-[48px] px-5 bg-[var(--accent)] text-white text-[11px] font-semibold tracking-[.1em] uppercase whitespace-nowrap cursor-pointer font-inherit border-none transition-[background,color,border-color] duration-150 hover:brightness-110 disabled:opacity-60"
        >
          {mode === "edit" ? "Salvar alterações" : "Criar mídia"}
        </button>
      </div>
    </form>
  );
}
