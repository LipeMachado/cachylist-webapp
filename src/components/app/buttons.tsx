"use client";

import { Plus, Menu, Search } from "lucide-react";
import Link from "next/link";
import { useAppModal } from "./app-context";

export function AddMediaButton({
  className,
  children,
  status,
  category,
}: {
  className: string;
  children: React.ReactNode;
  status?: string;
  category?: string;
}) {
  const { openMediaModal } = useAppModal();
  return (
    <button
      type="button"
      className={className}
      onClick={() => openMediaModal({ status, category })}
    >
      {children}
    </button>
  );
}

export function KanbanAddButton({ status, category }: { status: string; category?: string }) {
  const { openMediaModal } = useAppModal();
  return (
    <span className="ml-2 w-8 h-8 border border-[var(--line)]">
      <button
        type="button"
        className="flex items-center justify-center w-full h-full bg-transparent cursor-pointer transition-[background,color,border-color] duration-150 hover:bg-[var(--hover-bg)] hover:border-[var(--text)]"
        title="Adicionar mídia"
        aria-label="Adicionar mídia"
        onClick={() => openMediaModal({ status, category })}
      >
        <Plus size={16} className="text-[var(--text)]" />
      </button>
    </span>
  );
}

export function MobileMenuButton() {
  const { openMobileMenu } = useAppModal();
  return (
    <button
      className="mobile-icon-button"
      type="button"
      aria-label="Abrir menu"
      onClick={openMobileMenu}
    >
      <Menu size={23} />
    </button>
  );
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  const { openMediaModal } = useAppModal();
  return (
    <div className="flex flex-col items-center gap-4 px-10 py-20 text-center">
      <span>
        <Plus size={20} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      <button
        type="button"
        onClick={() => openMediaModal()}
        className="inline-flex items-center justify-center w-fit min-h-[48px] px-5 bg-[var(--accent)] text-white text-[11px] font-semibold tracking-[.1em] uppercase whitespace-nowrap cursor-pointer border-none transition-[background,color,border-color] duration-150 hover:brightness-110"
      >
        Adicionar mídia
      </button>
    </div>
  );
}

export function MobileSearchLink({ href }: { href: string }) {
  return (
    <Link href={href} className="mobile-icon-button" aria-label="Buscar">
      <Search size={22} />
    </Link>
  );
}
