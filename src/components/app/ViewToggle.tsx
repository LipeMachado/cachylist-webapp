"use client";

import Link from "next/link";
import { LayoutGrid, Columns3 } from "lucide-react";

// Grade/Quadro switch. Besides navigating, it stores the choice in a cookie so
// the preference sticks across category pages, refreshes and sessions (read
// server-side in LibraryView).
export default function ViewToggle({
  gridHref,
  boardHref,
  isBoard,
}: {
  gridHref: string;
  boardHref: string;
  isBoard: boolean;
}) {
  const remember = (v: "grid" | "board") => {
    document.cookie = `cachy-view=${v}; path=/; max-age=31536000; samesite=lax`;
  };

  const base = "inline-flex items-center gap-2 px-4 min-h-[44px] text-[11px] font-bold tracking-[.12em] uppercase";
  const on = "bg-[var(--hover-bg)] text-[var(--text)] shadow-[inset_0_-2px_0_var(--accent)]";
  const off = "bg-transparent text-[var(--muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--text)]";

  return (
    <div className="flex items-stretch border-l border-[var(--line)]">
      <Link href={gridHref} onClick={() => remember("grid")} aria-label="Visão em grade" className={`${base} ${!isBoard ? on : off}`}>
        <LayoutGrid size={15} /> Grade
      </Link>
      <Link
        href={boardHref}
        onClick={() => remember("board")}
        aria-label="Visão em quadro"
        className={`${base} border-l border-[var(--line)] ${isBoard ? on : off}`}
      >
        <Columns3 size={15} /> Quadro
      </Link>
    </div>
  );
}
