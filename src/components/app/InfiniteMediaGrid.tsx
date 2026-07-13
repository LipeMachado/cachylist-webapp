"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { statusClass, type CardData } from "@/lib/media";
import type { LibraryPage } from "@/lib/library-query";

export interface LibraryGridFilters {
  category: string;
  status: string;
  platform: string;
  query: string;
  sort: string;
}

// Poster grid with 40-at-a-time infinite scroll. The server renders the first
// page (SSR, no spinner flash); scrolling near the bottom fetches the next
// page from /app/library/items and appends it, showing a spinner only while
// that request is in flight.
//
// LibraryView remounts this component (via `key`) whenever the filters/sort/
// status tab change, so a fresh instance always starts from the new
// initialItems — no effect needed to resync state on filter changes.
export default function InfiniteMediaGrid({
  initialItems,
  initialHasMore,
  filters,
}: {
  initialItems: CardData[];
  initialHasMore: boolean;
  filters: LibraryGridFilters;
}) {
  const [items, setItems] = useState(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const nextPageRef = useRef(1); // page 0 is the server-rendered initialItems
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ ...filters, page: String(nextPageRef.current) });
      const res = await fetch(`/app/library/items?${qs.toString()}`);
      if (!res.ok) throw new Error(`failed to load more: ${res.status}`);
      const data: LibraryPage = await res.json();
      setItems((prev) => [...prev, ...data.items]);
      setHasMore(data.hasMore);
      nextPageRef.current += 1;
    } catch {
      // Leave hasMore untouched — the sentinel stays on screen, so scrolling
      // triggers a retry automatically.
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loading) loadMore();
      },
      { rootMargin: "600px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loadMore]);

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(116px,1fr))] border-t border-l border-[var(--line)]">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/app/media_items/${item.id}`}
            prefetch={false}
            className="group block bg-[var(--card-bg)] p-2.5 border-r border-b border-[var(--line)] hover:bg-[var(--hover-bg)] transition-colors"
          >
            <div className="aspect-[2/3] overflow-hidden border border-[var(--line-soft)] bg-[var(--surface-2)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.cover}
                alt={`Capa de ${item.title}`}
                loading="lazy"
                className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 transition duration-200"
              />
            </div>
            <div className="mt-2 flex items-start gap-1.5">
              <span className={`status-dot mt-[3px] flex-[0_0_auto] ${statusClass(item.statusKey)}`} />
              <strong className="text-[11px] font-bold leading-tight tracking-[.04em] uppercase line-clamp-2 text-[var(--text)]">
                {item.title}
              </strong>
            </div>
          </Link>
        ))}
      </div>
      {hasMore && (
        <div
          ref={sentinelRef}
          className="flex items-center justify-center py-10 border-l border-r border-b border-[var(--line)]"
        >
          <Loader2 size={22} className="animate-spin text-[var(--muted)]" aria-label="Carregando mais itens" />
        </div>
      )}
    </>
  );
}
