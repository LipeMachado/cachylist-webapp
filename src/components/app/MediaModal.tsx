"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import MediaForm, { EMPTY_MEDIA_VALUES, type MediaFormValues } from "./MediaForm";
import { categoryLabel, type CategoryKey, type StatusKey } from "@/lib/media";
import type { OpenMediaOptions } from "./app-context";

interface Props {
  options: OpenMediaOptions;
  onClose: () => void;
}

// Mounted only while open (parent guards), so initial state is set via useState
// initializers — no reset effect needed.
export default function MediaModal({ options, onClose }: Props) {
  const router = useRouter();
  const [dirty, setDirty] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [title, setTitle] = useState(() =>
    options.category ? `Adicionar ${categoryLabel(options.category)}` : "Adicionar mídia"
  );

  const initial: MediaFormValues = {
    ...EMPTY_MEDIA_VALUES,
    category: (options.category as CategoryKey) || "anime",
    status: (options.status as StatusKey) || "planned",
  };

  useEffect(() => {
    document.body.classList.add("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (confirmOpen) setConfirmOpen(false);
      else if (dirty) setConfirmOpen(true);
      else onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmOpen, dirty, onClose]);

  function requestClose() {
    if (dirty) setConfirmOpen(true);
    else onClose();
  }

  function handleSuccess() {
    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-[80] flex flex-col items-center overflow-auto px-2 py-4 md:px-8 md:py-8">
      <button
        className="fixed inset-0 bg-[var(--overlay-bg)] cursor-pointer border-0"
        type="button"
        aria-label="Fechar modal"
        onClick={requestClose}
      />
      <section
        className="relative z-10 w-[min(1100px,calc(100vw-16px))] my-auto bg-[var(--bg)] border border-[var(--line)] shadow-[0_30px_90px_rgba(0,0,0,.65)]"
        role="dialog"
        aria-modal="true"
      >
        <header className="min-h-[72px] px-4 md:px-8 py-5 border-b border-[var(--line)] flex justify-between items-center gap-[18px] bg-[var(--surface)]">
          <div>
            <p className="text-[10px] font-semibold tracking-[.18em] uppercase text-[var(--accent-strong)] m-0 mb-0.5">
              Nova entrada
            </p>
            <h2 className="text-2xl font-black uppercase tracking-[-.06em] m-0">{title}</h2>
          </div>
          <button
            className="w-9 h-9 border border-[var(--line)] bg-transparent text-[var(--muted)] grid place-items-center cursor-pointer flex-[0_0_36px] hover:bg-[var(--surface)] hover:text-[var(--text)]"
            type="button"
            onClick={requestClose}
          >
            <X size={18} />
          </button>
        </header>
        <MediaForm
          mode="create"
          initial={initial}
          onCancel={requestClose}
          onSuccess={handleSuccess}
          onDirty={() => setDirty(true)}
          onCategoryChange={(c) => setTitle(`Adicionar ${categoryLabel(c)}`)}
        />
      </section>

      {confirmOpen && (
        <>
          <div className="fixed inset-0 z-[85] bg-[var(--overlay-bg)]" onClick={() => setConfirmOpen(false)} />
          <section className="fixed z-[90] left-1/2 top-1/2 w-[min(480px,calc(100vw-48px))] -translate-x-1/2 -translate-y-1/2 bg-[var(--surface)] border border-[var(--line)] p-4 md:p-8 shadow-[0_24px_80px_rgba(0,0,0,.65)]" role="alertdialog" aria-modal="true">
            <h3 className="text-xl font-extrabold tracking-[-.03em] m-0 mb-2.5">Sair sem criar?</h3>
            <p className="text-[13px] leading-[1.6] text-[var(--muted)] m-0 mb-6 tracking-[.01em]">
              Você alterou campos do formulário. Se sair agora, as informações serão perdidas.
            </p>
            <div className="flex gap-3 justify-end flex-wrap">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="inline-flex items-center justify-center w-fit min-h-[48px] px-5 bg-[var(--panel-muted)] text-[var(--muted)] text-[11px] font-semibold tracking-[.1em] uppercase whitespace-nowrap cursor-pointer transition-[background,color,border-color] duration-150 hover:bg-[var(--hover-bg)] hover:text-[var(--text)]"
              >
                Continuar editando
              </button>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center w-fit min-h-[48px] px-5 border border-[var(--line)] bg-transparent text-[var(--text)] text-[11px] font-semibold tracking-[.1em] uppercase whitespace-nowrap cursor-pointer transition-[background,color,border-color] duration-150 hover:bg-[var(--hover-bg)]"
              >
                Sair sem salvar
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
