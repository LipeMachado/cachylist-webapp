"use client";

import Image from "next/image";
import { Pencil } from "lucide-react";
import { useAppModal } from "./app-context";

// Editable avatar on the profile page (opens the avatar modal). Owner only.
export function AvatarProfileButton({
  avatarUrl,
  initial,
}: {
  avatarUrl: string | null;
  initial: string;
}) {
  const { openAvatarModal } = useAppModal();
  return (
    <button
      type="button"
      className="group relative w-16 h-16 mx-auto mb-4 inline-grid place-items-center text-[22px] font-extrabold tracking-[.02em] uppercase bg-[var(--surface)] text-[var(--accent)] border border-[var(--line)] overflow-hidden cursor-pointer"
      onClick={openAvatarModal}
      aria-label="Editar avatar"
    >
      {avatarUrl ? (
        <Image src={avatarUrl} alt="Avatar" width={64} height={64} className="w-full h-full object-cover" />
      ) : (
        <span>{initial}</span>
      )}
      <span className="absolute inset-0 hidden place-items-center bg-[var(--overlay-bg)] text-[var(--text)] group-hover:grid">
        <Pencil size={20} />
      </span>
    </button>
  );
}

// Mobile avatar button that opens the avatar modal (ports the dashboard mobile header).
export function AvatarMobileButton({
  avatarUrl,
  initial,
}: {
  avatarUrl: string | null;
  initial: string;
}) {
  const { openAvatarModal } = useAppModal();
  return (
    <button type="button" className="mobile-avatar" onClick={openAvatarModal} aria-label="Editar avatar">
      {avatarUrl ? (
        <Image src={avatarUrl} alt="Avatar" width={50} height={50} />
      ) : (
        <span>{initial}</span>
      )}
    </button>
  );
}
