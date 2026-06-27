"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteMedia } from "@/lib/actions/media";

export default function DeleteMediaButton({ id }: { id: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!window.confirm("Remover esta mídia?")) return;
    startTransition(async () => {
      await deleteMedia(id);
      router.push("/app/library?notice=" + encodeURIComponent("Mídia removida com sucesso."));
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="inline-flex items-center justify-center w-fit min-h-[48px] px-5 border border-[var(--line)] bg-transparent text-[var(--text)] text-[11px] font-semibold tracking-[.1em] uppercase whitespace-nowrap cursor-pointer transition-[background,color,border-color] duration-150 hover:bg-[var(--hover-bg)] disabled:opacity-60"
    >
      Remover
    </button>
  );
}
