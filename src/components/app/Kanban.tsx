"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const STATUS_CLASSES = [
  "status-planned",
  "status-in-progress",
  "status-completed",
  "status-paused",
  "status-no-date",
  "status-backlog",
];

// Ports kanban_controller.js (pointer drag path). Operates imperatively on the
// real DOM rendered by the server; persists order to /app/media_items/reorder.
export default function Kanban({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const columns = () =>
      Array.from(root.querySelectorAll<HTMLElement>("[data-kanban-target='column']"));

    let mouseState: {
      card: HTMLElement;
      startX: number;
      startY: number;
      dragging: boolean;
      pointerId: number;
    } | null = null;
    let ghost: HTMLElement | null = null;
    let sourceColumn: HTMLElement | null = null;
    let sourceNextSibling: Element | null = null;
    let currentDropColumn: HTMLElement | null = null;
    let suppressNextClick = false;

    const dragAfterElement = (column: HTMLElement, y: number): HTMLElement | null => {
      const cards = Array.from(
        column.querySelectorAll<HTMLElement>("[data-kanban-card-id]:not(.is-dragging)")
      );
      return cards.reduce<{ offset: number; element: HTMLElement | null }>(
        (closest, child) => {
          const box = child.getBoundingClientRect();
          const offset = y - box.top - box.height / 2;
          if (offset < 0 && offset > closest.offset) return { offset, element: child };
          return closest;
        },
        { offset: Number.NEGATIVE_INFINITY, element: null }
      ).element;
    };

    const autoScroll = (x: number) => {
      const box = root.getBoundingClientRect();
      const edge = 48;
      const speed = 16;
      if (x > box.right - edge) root.scrollLeft += speed;
      else if (x < box.left + edge) root.scrollLeft -= speed;
    };

    const statusCounts = () =>
      columns().reduce<Record<string, number>>((counts, col) => {
        counts[col.dataset.kanbanStatus!] =
          col.querySelectorAll("[data-kanban-card-id]").length;
        return counts;
      }, {});

    const updateDashboardStats = (counts: Record<string, number>) => {
      const total = Object.values(counts).reduce((s, c) => s + c, 0);
      const values: Record<string, string | number> = {
        total,
        planned: counts.planned || 0,
        in_progress: counts.in_progress || 0,
        completed: counts.completed || 0,
        paused: counts.paused || 0,
        no_date: counts.no_date || 0,
        completed_percentage:
          total === 0 ? "0%" : `${Math.round(((counts.completed || 0) / total) * 100)}%`,
      };
      Object.entries(values).forEach(([key, value]) => {
        document
          .querySelectorAll(`[data-dashboard-stat='${key}']`)
          .forEach((el) => (el.textContent = String(value)));
      });
    };

    const recalcCounts = () => {
      const counts = statusCounts();
      columns().forEach((col) => {
        const badge = col.querySelector("header small");
        if (badge) badge.textContent = String(counts[col.dataset.kanbanStatus!] || 0);
      });
      updateDashboardStats(counts);
    };

    const updateCardStatusColor = (card: HTMLElement, status: string) => {
      const dot = card.querySelector(".status-dot");
      if (!dot) return;
      dot.classList.remove(...STATUS_CLASSES);
      dot.classList.add(`status-${status.replaceAll("_", "-")}`);
    };

    const orderedColumnsPayload = () =>
      columns().reduce<Record<string, string[]>>((payload, column) => {
        payload[column.dataset.kanbanStatus!] = Array.from(
          column.querySelectorAll<HTMLElement>("[data-kanban-card-id]")
        ).map((card) => card.dataset.kanbanCardId!);
        return payload;
      }, {});

    const persist = (card: HTMLElement, oldStatus: string, srcCol: HTMLElement | null, srcNext: Element | null) => {
      fetch("/app/media_items/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ columns: orderedColumnsPayload() }),
      })
        .then((r) => {
          if (!r.ok) throw new Error();
          router.refresh();
        })
        .catch(() => {
          srcCol?.insertBefore(card, srcNext);
          card.dataset.kanbanStatus = oldStatus;
          updateCardStatusColor(card, oldStatus);
          recalcCounts();
        });
    };

    const cleanup = () => {
      if (ghost) {
        ghost.remove();
        ghost = null;
      }
      mouseState?.card.classList.remove("is-dragging");
      columns().forEach((col) => col.classList.remove("is-drag-over"));
      currentDropColumn = null;
      sourceColumn = null;
      sourceNextSibling = null;
      mouseState = null;
    };

    const initiateDrag = (card: HTMLElement, e: PointerEvent) => {
      sourceColumn = card.closest<HTMLElement>("[data-kanban-target='column']");
      sourceNextSibling = card.nextElementSibling;
      currentDropColumn = null;
      card.classList.add("is-dragging");

      ghost = card.cloneNode(true) as HTMLElement;
      Object.assign(ghost.style, {
        position: "fixed",
        pointerEvents: "none",
        zIndex: "9999",
        opacity: "0.9",
        border: "1px solid var(--accent)",
        outline: "2px solid var(--accent)",
        outlineOffset: "-2px",
        width: `${card.offsetWidth}px`,
        background: "var(--surface)",
        left: `${e.clientX - card.offsetWidth / 2}px`,
        top: `${e.clientY - 10}px`,
      });
      ghost.style.setProperty("border-radius", "0", "important");
      ghost.style.setProperty("box-shadow", "none", "important");
      document.body.appendChild(ghost);
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const card = (e.target as HTMLElement).closest<HTMLElement>("[data-kanban-card-id]");
      if (!card || mouseState) return;
      mouseState = {
        card,
        startX: e.clientX,
        startY: e.clientY,
        dragging: false,
        pointerId: e.pointerId,
      };
      document.addEventListener("pointermove", onPointerMove, { passive: false });
      document.addEventListener("pointerup", onPointerUp);
      document.addEventListener("pointercancel", onPointerUp);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!mouseState || mouseState.pointerId !== e.pointerId) return;

      if (!mouseState.dragging) {
        const dx = e.clientX - mouseState.startX;
        const dy = e.clientY - mouseState.startY;
        if (Math.abs(dx) <= 5 && Math.abs(dy) <= 5) return;
        e.preventDefault();
        mouseState.dragging = true;
        suppressNextClick = true;
        initiateDrag(mouseState.card, e);
        return;
      }

      e.preventDefault();
      autoScroll(e.clientX);

      if (ghost) {
        ghost.style.left = `${e.clientX - ghost.offsetWidth / 2}px`;
        ghost.style.top = `${e.clientY - 10}px`;
      }

      columns().forEach((col) => col.classList.remove("is-drag-over"));
      currentDropColumn = null;
      if (!ghost) return;

      ghost.style.display = "none";
      const element = document.elementFromPoint(e.clientX, e.clientY);
      ghost.style.display = "";

      const column = element?.closest<HTMLElement>("[data-kanban-target='column']");
      if (column) {
        column.classList.add("is-drag-over");
        currentDropColumn = column;
        const after = dragAfterElement(column, e.clientY);
        column.insertBefore(mouseState.card, after);
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!mouseState || (e.pointerId && mouseState.pointerId !== e.pointerId)) return;

      if (mouseState.dragging) {
        const targetColumn = currentDropColumn;
        const card = mouseState.card;
        const srcCol = sourceColumn;
        const srcNext = sourceNextSibling;
        columns().forEach((col) => col.classList.remove("is-drag-over"));

        if (!targetColumn) {
          srcCol?.insertBefore(card, srcNext);
        } else {
          const newStatus = targetColumn.dataset.kanbanStatus!;
          const oldStatus = card.dataset.kanbanStatus!;
          card.dataset.kanbanStatus = newStatus;
          updateCardStatusColor(card, newStatus);
          recalcCounts();
          persist(card, oldStatus, srcCol, srcNext);
        }
      }

      cleanup();
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("pointercancel", onPointerUp);
    };

    const onClickCapture = (e: MouseEvent) => {
      if (!suppressNextClick) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      suppressNextClick = false;
    };

    root.addEventListener("pointerdown", onPointerDown);
    root.addEventListener("click", onClickCapture, true);

    return () => {
      root.removeEventListener("pointerdown", onPointerDown);
      root.removeEventListener("click", onClickCapture, true);
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("pointercancel", onPointerUp);
      cleanup();
    };
  }, [router]);

  return (
    <div ref={rootRef} className={className} data-controller="kanban">
      {children}
    </div>
  );
}
