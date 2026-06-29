"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { X, Loader2 } from "lucide-react";
import PasswordField from "@/components/PasswordField";
import {
  updateAvatar,
  updatePassword,
  deleteAccount,
  logout,
  type AccountState,
} from "@/lib/actions/account";
import { AVATAR_OPTIONS } from "@/lib/media";
import { useAppModal, type AppUser } from "./app-context";

const ghostBtn =
  "inline-flex items-center justify-center min-h-[44px] px-5 border border-[var(--line)] bg-transparent text-[var(--muted)] text-[11px] font-semibold tracking-[.1em] uppercase cursor-pointer hover:bg-[var(--hover-bg)] hover:text-[var(--text)]";
const confirmGhost =
  "inline-flex items-center justify-center w-fit min-h-[48px] px-5 bg-[var(--panel-muted)] text-[var(--muted)] text-[11px] font-semibold tracking-[.1em] uppercase whitespace-nowrap cursor-pointer transition-[background,color,border-color] duration-150 hover:bg-[var(--hover-bg)] hover:text-[var(--text)]";
const confirmAction =
  "inline-flex items-center justify-center w-fit min-h-[48px] px-5 border border-[var(--line)] bg-transparent text-[var(--text)] text-[11px] font-semibold tracking-[.1em] uppercase whitespace-nowrap cursor-pointer transition-[background,color,border-color] duration-150 hover:bg-[var(--hover-bg)]";

/* ── Avatar ──────────────────────────────────────────────────────────────── */

export function AvatarModal({
  open,
  onClose,
  user,
}: {
  open: boolean;
  onClose: () => void;
  user: AppUser;
}) {
  const { applyAvatar } = useAppModal();
  const [selected, setSelected] = useState(user.avatar);
  const [pending, startSaving] = useTransition();

  // Keep the highlighted option in sync with the current avatar each time the
  // modal opens (the user may have changed it elsewhere since last mount).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setSelected(user.avatar);
  }, [open, user.avatar]);

  if (!open) return null;

  const dirty = !!selected && selected !== user.avatar;

  function save() {
    if (!selected || pending) return;
    // Optimistic: paint the new avatar across the app right away…
    applyAvatar(selected);
    // …then persist in the background and close once it lands.
    const fd = new FormData();
    fd.set("avatar", selected);
    startSaving(async () => {
      await updateAvatar(fd);
      onClose();
    });
  }

  return (
    <>
      <div className="fixed inset-0 z-[85] bg-[var(--overlay-bg)]" onClick={pending ? undefined : onClose} />
      <section className="fixed z-[90] left-1/2 top-1/2 w-[min(720px,calc(100vw-32px))] max-h-[calc(100dvh-32px)] overflow-auto -translate-x-1/2 -translate-y-1/2 bg-[var(--surface)] border border-[var(--line)] p-4 md:p-8 shadow-[0_24px_80px_rgba(0,0,0,.65)]" role="dialog" aria-modal="true">
        <div className="flex items-start justify-between gap-6 mb-6">
          <div>
            <p className="brutalist-kicker mb-2">Perfil</p>
            <h3 className="text-2xl font-black uppercase tracking-[-.06em] m-0">Escolher avatar</h3>
          </div>
          <button className="w-9 h-9 border border-[var(--line)] bg-transparent text-[var(--muted)] grid place-items-center cursor-pointer hover:bg-[var(--hover-bg)] hover:text-[var(--text)] disabled:opacity-50" type="button" onClick={onClose} disabled={pending}>
            <X size={18} />
          </button>
        </div>
        <form
          className="grid gap-6"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <div className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-3">
            {AVATAR_OPTIONS.map((avatar) => (
              <label key={avatar} className="block cursor-pointer">
                <input
                  type="radio"
                  name="avatar"
                  value={avatar}
                  checked={selected === avatar}
                  onChange={() => setSelected(avatar)}
                  disabled={pending}
                  className="peer sr-only"
                />
                <span className="block aspect-square border border-[var(--line)] p-1 bg-[var(--bg)] transition-[border-color,background] duration-150 peer-checked:border-[var(--accent-strong)] peer-checked:bg-[var(--hover-bg)] hover:bg-[var(--hover-bg)] overflow-hidden">
                  <Image src={`/${avatar}`} alt="Avatar" width={72} height={72} className="w-full h-full object-cover grayscale-[15%]" />
                </span>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} disabled={pending} className={`${ghostBtn} disabled:opacity-50`}>
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending || !dirty}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 border border-[var(--line)] bg-[var(--panel-bg)] text-[var(--text)] text-[11px] font-semibold tracking-[.1em] uppercase cursor-pointer hover:bg-[var(--hover-bg)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Salvando…
                </>
              ) : (
                "Salvar avatar"
              )}
            </button>
          </div>
        </form>
      </section>
    </>
  );
}

/* ── Password ────────────────────────────────────────────────────────────── */

export function PasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [state, formAction, pending] = useActionState<AccountState, FormData>(
    updatePassword,
    {}
  );

  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  if (!open) return null;

  const fieldLabel = "grid gap-1.5 text-[10px] font-semibold tracking-[.12em] uppercase text-[var(--muted)]";
  const fieldCls = "w-full border border-[var(--line)] min-h-[40px] px-3 text-[13px] bg-transparent text-[var(--text)]";

  return (
    <>
      <div className="fixed inset-0 z-[85] bg-[var(--overlay-bg)]" onClick={onClose} />
      <section className="fixed z-[90] left-1/2 top-1/2 w-[min(480px,calc(100vw-48px))] -translate-x-1/2 -translate-y-1/2 bg-[var(--surface)] border border-[var(--line)] p-4 md:p-8 shadow-[0_24px_80px_rgba(0,0,0,.65)]" role="dialog" aria-modal="true">
        <h3 className="text-xl font-extrabold tracking-[-.03em] m-0 mb-2.5">Alterar senha</h3>
        {state.error && (
          <p className="mb-4 text-[13px] text-[var(--danger)]">{state.error}</p>
        )}
        <form action={formAction} className="grid gap-4">
          <label className={fieldLabel}>
            Senha atual
            <PasswordField name="current_password" autoComplete="current-password" placeholder="••••••••" required className={fieldCls} />
          </label>
          <label className={fieldLabel}>
            Nova senha
            <PasswordField name="password" autoComplete="new-password" placeholder="mínimo 6 caracteres" className={fieldCls} />
          </label>
          <label className={fieldLabel}>
            Confirmar nova senha
            <PasswordField name="password_confirmation" autoComplete="new-password" placeholder="repita a nova senha" className={fieldCls} />
          </label>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onClose} className={confirmGhost}>
              Cancelar
            </button>
            <button type="submit" disabled={pending} className="inline-flex items-center justify-center w-fit min-h-[48px] px-5 bg-[var(--accent)] text-white text-[11px] font-semibold tracking-[.1em] uppercase whitespace-nowrap cursor-pointer border-none transition-[background,color,border-color] duration-150 hover:brightness-110 disabled:opacity-60">
              Salvar senha
            </button>
          </div>
        </form>
      </section>
    </>
  );
}

/* ── Logout ──────────────────────────────────────────────────────────────── */

export function LogoutModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center p-6" role="alertdialog" aria-modal="true">
      <button className="absolute inset-0 bg-[var(--overlay-bg)] cursor-pointer border-0" type="button" aria-label="Fechar modal" onClick={onClose} />
      <section className="relative z-10 w-[min(480px,calc(100vw-48px))] bg-[var(--surface)] border border-[var(--line)] p-4 md:p-8 shadow-[0_24px_80px_rgba(0,0,0,.65)]">
        <h3 className="text-xl font-extrabold tracking-[-.03em] m-0 mb-2.5">Sair da conta?</h3>
        <p className="text-[13px] leading-[1.6] text-[var(--muted)] m-0 mb-6 tracking-[.01em]">
          Você será desconectado da sua conta CachyList.
        </p>
        <div className="flex gap-3 justify-end flex-wrap">
          <button type="button" onClick={onClose} className={confirmGhost}>
            Voltar
          </button>
          <form action={logout}>
            <button type="submit" className={confirmAction}>
              Sim, sair
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

/* ── Delete account ──────────────────────────────────────────────────────── */

export function DeleteAccountModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-[85] bg-[var(--overlay-bg)]" onClick={onClose} />
      <section className="fixed z-[90] left-1/2 top-1/2 w-[min(480px,calc(100vw-48px))] -translate-x-1/2 -translate-y-1/2 bg-[var(--surface)] border border-[var(--line)] p-4 md:p-8 shadow-[0_24px_80px_rgba(0,0,0,.65)]" role="alertdialog" aria-modal="true">
        <h3 className="text-xl font-extrabold tracking-[-.03em] m-0 mb-2.5">Cancelar conta?</h3>
        <p className="text-[13px] leading-[1.6] text-[var(--muted)] m-0 mb-6 tracking-[.01em]">
          Esta ação é irreversível. Todos os seus dados serão permanentemente removidos.
        </p>
        <div className="flex gap-3 justify-end flex-wrap">
          <button type="button" onClick={onClose} className={confirmGhost}>
            Voltar
          </button>
          <form action={deleteAccount}>
            <button type="submit" className={confirmAction}>
              Sim, cancelar conta
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
