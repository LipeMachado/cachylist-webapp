"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { X } from "lucide-react";

// Client shell for the intercepting-route media modal: overlays the current
// page, and closing pops the history entry (router.back) so the URL the modal
// was opened from is restored.
export default function MediaModalShell({
  id,
  children,
}: {
  id: number;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  // Parallel-route slots keep their last active state on soft navigation, so
  // navigating to e.g. /media_items/[id]/edit would otherwise leave the modal
  // open on top of the edit page. Only render while the URL is the detail route.
  const active = pathname === `/app/media_items/${id}`;

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.back();
    };
    document.addEventListener("keydown", onKey);
    document.documentElement.classList.add("modal-open");
    document.body.classList.add("modal-open");
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.classList.remove("modal-open");
      document.body.classList.remove("modal-open");
    };
  }, [active, router]);

  if (!active) return null;

  return (
    <>
      <div className="fixed inset-0 z-[95] bg-[var(--overlay-bg)]" onClick={() => router.back()} />
      <section
        className="fixed z-[96] left-1/2 top-1/2 w-[min(900px,calc(100vw-32px))] max-h-[calc(100dvh-32px)] overflow-auto -translate-x-1/2 -translate-y-1/2 bg-[var(--surface)] border border-[var(--line)] shadow-[0_24px_80px_rgba(0,0,0,.65)]"
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Fechar"
          className="absolute right-3 top-3 z-10 w-9 h-9 border border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] grid place-items-center cursor-pointer hover:bg-[var(--hover-bg)] hover:text-[var(--text)]"
        >
          <X size={18} />
        </button>
        {children}
      </section>
    </>
  );
}
