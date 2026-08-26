"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { unstable_rethrow } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteMedia } from "@/lib/actions/media";

export default function DeleteMediaButton({ id }: { id: number }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function confirmDelete() {
    setError(null);
    startTransition(async () => {
      try {
        await deleteMedia(id);
        setOpen(false);
      } catch (e) {
        unstable_rethrow(e);
        setError("Não foi possível remover. Tente novamente.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center w-fit min-h-[48px] px-5 border border-[var(--line)] bg-transparent text-[var(--text)] text-[11px] font-semibold tracking-[.1em] uppercase whitespace-nowrap cursor-pointer transition-[background,color,border-color] duration-150 hover:bg-[var(--hover-bg)]"
      >
        Remover
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <section
              className="fixed z-[111] left-1/2 top-1/2 w-[min(440px,calc(100vw-40px))] -translate-x-1/2 -translate-y-1/2 bg-[#1a1a1a] p-6 md:p-8 shadow-[0_24px_80px_rgba(0,0,0,.65)]"
              role="alertdialog"
              aria-modal="true"
            >
              <div className="flex items-center gap-3 mb-3.5">
                <span className="w-10 h-10 grid place-items-center border border-[var(--line)] text-[#e06666]">
                  <Trash2 size={18} />
                </span>
                <h3 className="text-xl text-white font-extrabold tracking-[-.03em] m-0">Remover esta mídia?</h3>
              </div>
              <p className="text-[13px] leading-[1.6] text-[var(--muted)] m-0 mb-6 tracking-[.01em]">
                Esta ação é irreversível. O item será removido permanentemente da sua biblioteca.
              </p>
              {error && (
                <p className="text-[13px] leading-[1.6] text-[#e06666] m-0 mb-6 tracking-[.01em]">{error}</p>
              )}
              <div className="flex gap-3 justify-end flex-wrap">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center justify-center min-h-[48px] px-5 border border-[var(--line)] bg-transparent text-[var(--muted)] text-[11px] font-semibold tracking-[.1em] uppercase cursor-pointer transition-[background,color,border-color] duration-150 hover:bg-[var(--hover-bg)] hover:text-[var(--text)]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="inline-flex items-center justify-center min-h-[48px] px-5 border-0 bg-[#991b1b] text-white text-[11px] font-semibold tracking-[.1em] uppercase whitespace-nowrap cursor-pointer transition-[filter] duration-150 hover:brightness-110"
                >
                  {pending ? "Removendo…" : "Sim, remover"}
                </button>
              </div>
            </section>
          </>,
          document.body
        )}
    </>
  );
}
