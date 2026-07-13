"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { KanbanAddButton } from "./buttons";
import { statusClass, statusLabel, type StatusKey } from "@/lib/media";
import { MEDIA_PAGE_SIZE } from "@/lib/pagination";

export interface BoardItem {
  id: number;
  node: ReactNode;
}
export interface BoardColumn {
  status: StatusKey;
  items: BoardItem[];
}

const DRAG_THRESHOLD = 5;
const PERSIST_DELAY = 350;

// Reveals the next MEDIA_PAGE_SIZE cards for one column once it scrolls near
// the bottom — same visual pattern as the library grid's infinite scroll, but
// with no fetch: the board already holds every item for every column in
// memory (drag-and-drop needs the full, correctly-ordered list to persist
// sort order right), so "loading more" here is just rendering more of what's
// already there.
function ColumnLoadMoreSentinel({
  status,
  onReach,
}: {
  status: StatusKey;
  onReach: (status: StatusKey) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onReach(status);
      },
      { rootMargin: "600px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [status, onReach]);

  return (
    <div ref={ref} className="flex items-center justify-center py-6">
      <Loader2 size={18} className="animate-spin text-[var(--muted)]" aria-label="Carregando mais itens" />
    </div>
  );
}

// Declarative drag-and-drop board. React owns the order via state; drops update
// state and React re-renders. The cards are server-rendered RSC nodes (passed in
// as `node`), so they are NOT hydrated as client components — which avoids both
// the hydration cost and hydration mismatches on the card markup.
export default function Board({
  columns: serverColumns,
  className,
  category,
  addButton = false,
}: {
  columns: BoardColumn[];
  className?: string;
  category?: string;
  addButton?: boolean;
}) {
  const [columns, setColumns] = useState(serverColumns);
  const [persistFailed, setPersistFailed] = useState(false);
  const retryPersistRef = useRef<() => void>(() => {});

  // How many cards to *render* per column — independent of `columns`, which
  // always holds every item (drag-and-drop and persistence need the full
  // order). Starts at one page per column, same as the library grid.
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(serverColumns.map((c) => [c.status, MEDIA_PAGE_SIZE]))
  );
  const revealMore = useCallback((status: StatusKey) => {
    setVisibleCounts((prev) => ({
      ...prev,
      [status]: (prev[status] ?? MEDIA_PAGE_SIZE) + MEDIA_PAGE_SIZE,
    }));
  }, []);

  // Re-sync only when the server data actually changes (add / edit / delete),
  // gated by a lightweight signature so optimistic drags aren't clobbered.
  const signature = serverColumns
    .map((c) => `${c.status}:${c.items.map((i) => i.id).join(",")}`)
    .join("|");
  const sigRef = useRef(signature);
  useEffect(() => {
    if (sigRef.current !== signature) {
      sigRef.current = signature;
      setColumns(serverColumns);
      setVisibleCounts(Object.fromEntries(serverColumns.map((c) => [c.status, MEDIA_PAGE_SIZE])));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  const columnsRef = useRef(columns);
  useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);

  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let startX = 0;
    let startY = 0;
    let pointerId = -1;
    let activeId: number | null = null;
    let dragging = false;
    let ghost: HTMLElement | null = null;
    let suppressClick = false;
    let lastTarget = "";

    /* ── persistence: debounced + single-flight, no router.refresh ─────────── */
    let timer: ReturnType<typeof setTimeout> | null = null;
    let inFlight = false;
    let again = false;
    const runPersist = () => {
      if (inFlight) {
        again = true;
        return;
      }
      inFlight = true;
      const payload: Record<string, string[]> = {};
      for (const c of columnsRef.current) payload[c.status] = c.items.map((i) => String(i.id));
      fetch("/app/media_items/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ columns: payload }),
      })
        .then((res) => {
          if (!res.ok) throw new Error(`reorder failed: ${res.status}`);
          setPersistFailed(false);
        })
        .catch(() => setPersistFailed(true))
        .finally(() => {
          inFlight = false;
          if (again) {
            again = false;
            runPersist();
          }
        });
    };
    retryPersistRef.current = runPersist;
    const schedulePersist = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(runPersist, PERSIST_DELAY);
    };

    /* ── drop-target maths ─────────────────────────────────────────────────── */
    const columnAt = (x: number, y: number): HTMLElement | null => {
      const el = document.elementFromPoint(x, y) as HTMLElement | null;
      return el?.closest<HTMLElement>("[data-board-status]") ?? null;
    };
    const beforeIdIn = (column: HTMLElement, y: number): number | null => {
      const cards = Array.from(
        column.querySelectorAll<HTMLElement>("[data-kanban-card-id]")
      ).filter((c) => Number(c.dataset.kanbanCardId) !== activeId);
      for (const card of cards) {
        const box = card.getBoundingClientRect();
        if (y < box.top + box.height / 2) return Number(card.dataset.kanbanCardId);
      }
      return null;
    };

    const applyMove = (toStatus: StatusKey, beforeId: number | null) => {
      const id = activeId;
      if (id == null) return;
      setColumns((prev) => {
        let moved: BoardItem | undefined;
        const stripped = prev.map((c) => {
          const i = c.items.findIndex((x) => x.id === id);
          if (i < 0) return c;
          moved = c.items[i];
          return { ...c, items: [...c.items.slice(0, i), ...c.items.slice(i + 1)] };
        });
        if (!moved) return prev;
        return stripped.map((c) => {
          if (c.status !== toStatus) return c;
          const items = [...c.items];
          const idx = beforeId == null ? items.length : items.findIndex((x) => x.id === beforeId);
          items.splice(idx < 0 ? items.length : idx, 0, moved!);
          return { ...c, items };
        });
      });
    };

    const makeGhost = (card: HTMLElement, x: number, y: number) => {
      ghost = card.cloneNode(true) as HTMLElement;
      Object.assign(ghost.style, {
        position: "fixed",
        pointerEvents: "none",
        zIndex: "9999",
        opacity: "0.92",
        margin: "0",
        width: `${card.offsetWidth}px`,
        background: "var(--surface)",
        outline: "2px solid var(--accent)",
        outlineOffset: "-2px",
        left: `${x - card.offsetWidth / 2}px`,
        top: `${y - 10}px`,
      });
      ghost.style.setProperty("box-shadow", "none", "important");
      // Append inside the board (not document.body) so the clone inherits the
      // theme CSS variables (--text, --card-bg, --tertiary…), which are scoped to
      // .app-body. Otherwise the ghost loses its colours (white text, wrong bg).
      // position: fixed still tracks the viewport — no transformed ancestor.
      root.appendChild(ghost);
    };

    const autoScroll = (x: number) => {
      const box = root.getBoundingClientRect();
      const edge = 48;
      if (x > box.right - edge) root.scrollLeft += 16;
      else if (x < box.left + edge) root.scrollLeft -= 16;
    };

    const cleanup = () => {
      ghost?.remove();
      ghost = null;
      root.querySelectorAll(".is-drag-over").forEach((c) => c.classList.remove("is-drag-over"));
      dragging = false;
      activeId = null;
      lastTarget = "";
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      if (!dragging) {
        if (Math.abs(e.clientX - startX) <= DRAG_THRESHOLD && Math.abs(e.clientY - startY) <= DRAG_THRESHOLD) return;
        dragging = true;
        suppressClick = true;
        const card = root.querySelector<HTMLElement>(`[data-kanban-card-id="${activeId}"]`);
        if (card) makeGhost(card, e.clientX, e.clientY);
      }
      e.preventDefault();
      autoScroll(e.clientX);
      if (ghost) {
        ghost.style.left = `${e.clientX - ghost.offsetWidth / 2}px`;
        ghost.style.top = `${e.clientY - 10}px`;
        ghost.style.display = "none";
      }
      const column = columnAt(e.clientX, e.clientY);
      if (ghost) ghost.style.display = "";
      root.querySelectorAll(".is-drag-over").forEach((c) => c.classList.remove("is-drag-over"));
      if (!column) return;
      column.classList.add("is-drag-over");
      const status = column.dataset.boardStatus as StatusKey;
      const beforeId = beforeIdIn(column, e.clientY);
      const key = `${status}:${beforeId}`;
      if (key !== lastTarget) {
        lastTarget = key;
        applyMove(status, beforeId); // live preview
      }
    };

    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
      const wasDragging = dragging;
      cleanup();
      if (wasDragging) schedulePersist();
    };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const card = (e.target as HTMLElement).closest<HTMLElement>("[data-kanban-card-id]");
      if (!card) return;
      activeId = Number(card.dataset.kanbanCardId);
      startX = e.clientX;
      startY = e.clientY;
      pointerId = e.pointerId;
      dragging = false;
      document.addEventListener("pointermove", onMove, { passive: false });
      document.addEventListener("pointerup", onUp);
      document.addEventListener("pointercancel", onUp);
    };

    const onClickCapture = (e: MouseEvent) => {
      if (!suppressClick) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      suppressClick = false;
    };
    const onDragStart = (e: Event) => e.preventDefault();

    root.addEventListener("pointerdown", onDown);
    root.addEventListener("click", onClickCapture, true);
    root.addEventListener("dragstart", onDragStart);
    return () => {
      if (timer) clearTimeout(timer);
      root.removeEventListener("pointerdown", onDown);
      root.removeEventListener("click", onClickCapture, true);
      root.removeEventListener("dragstart", onDragStart);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
      cleanup();
    };
  }, []);

  return (
    <div ref={rootRef} className={className} data-controller="board">
      {persistFailed && (
        <div className="fixed z-50 right-5.5 bottom-5.5 grid gap-2.5 w-[min(380px,calc(100vw-32px))]">
          <p className="flash-message m-0 border border-[var(--line)] p-3.5 bg-[var(--panel-bg)] text-[var(--text)] flex items-center justify-between gap-3">
            <span>Não foi possível salvar a nova ordem.</span>
            <button
              type="button"
              onClick={() => {
                setPersistFailed(false);
                retryPersistRef.current();
              }}
              className="shrink-0 text-[11px] font-bold tracking-[.1em] uppercase text-[var(--accent)] bg-transparent border-0 cursor-pointer hover:underline"
            >
              Tentar novamente
            </button>
          </p>
        </div>
      )}
      {columns.map((col) => {
        const visibleCount = visibleCounts[col.status] ?? MEDIA_PAGE_SIZE;
        const windowed = col.items.slice(0, visibleCount);
        const hasMore = col.items.length > visibleCount;
        return (
          <div
            key={col.status}
            data-board-status={col.status}
            className="kanban-column border-r border-[var(--line)] bg-[var(--column-bg)] [&:last-child]:border-r-0"
          >
            <header className="min-h-[60px] px-6 border-b border-[var(--line)] flex items-center gap-2 text-[10px] font-bold tracking-[.16em] uppercase text-[var(--muted)]">
              <span className={`w-1.5 h-1.5 bg-[var(--accent)] inline-block flex-[0_0_6px] ${statusClass(col.status)}`} />
              <strong className="font-bold text-[var(--muted)] truncate">{statusLabel(col.status)}</strong>
              <small className="ml-auto text-[var(--tertiary)] text-[11px] tracking-[.04em]">{col.items.length}</small>
              {addButton && <KanbanAddButton status={col.status} category={category} />}
            </header>
            {windowed.map((item) => (
              <div key={item.id} className="contents">
                {item.node}
              </div>
            ))}
            {hasMore && <ColumnLoadMoreSentinel status={col.status} onReach={revealMore} />}
          </div>
        );
      })}
    </div>
  );
}
