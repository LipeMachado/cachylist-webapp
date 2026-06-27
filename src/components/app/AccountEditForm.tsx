"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { updateAccount, type AccountState } from "@/lib/actions/account";
import { useAppModal } from "./app-context";

export default function AccountEditForm({
  username,
  email,
  userId,
}: {
  username: string;
  email: string;
  userId: number;
}) {
  const [state, formAction, pending] = useActionState<AccountState, FormData>(
    updateAccount,
    {}
  );
  const { openPasswordModal, openDeleteModal } = useAppModal();

  const labelCls = "grid gap-1.5 text-[10px] font-semibold tracking-[.12em] uppercase text-[var(--muted)]";
  const inputCls = "mt-1.5 border border-[var(--line)] min-h-[40px] px-3 text-[13px] bg-transparent text-[var(--text)]";

  return (
    <>
      {state.error && (
        <div className="px-10 py-4 border-b border-[var(--line)] text-[var(--text)] text-[13px] bg-[var(--panel-muted)]">
          {state.error}
        </div>
      )}
      <form action={formAction} className="grid">
        <section className="px-10 py-5 grid gap-5">
          <div className="grid grid-cols-1 bg-transparent">
            <label className={labelCls}>
              Nome de usuário
              <input type="text" name="username" autoComplete="username" placeholder="seu_usuario" defaultValue={username} className={inputCls} />
            </label>
          </div>
          <div className="grid grid-cols-1 bg-transparent">
            <label className={labelCls}>
              E-mail
              <input type="email" name="email" autoComplete="email" placeholder="seu@email.com" defaultValue={email} className={inputCls} />
            </label>
          </div>
        </section>
        <div className="px-10 py-5 flex">
          <button
            type="button"
            onClick={openPasswordModal}
            className="inline-flex items-center justify-center w-fit min-h-[48px] px-5 border border-[var(--line)] bg-transparent text-[var(--text)] text-[11px] font-semibold tracking-[.1em] uppercase whitespace-nowrap cursor-pointer transition-[background,color,border-color] duration-150 hover:bg-[var(--surface)] gap-2"
          >
            <Lock size={16} /> Alterar senha
          </button>
        </div>
        <div className="flex justify-end gap-3 px-10 py-6 border-b border-[var(--line)]">
          <Link
            href={`/app/users/${userId}`}
            className="inline-flex items-center justify-center w-fit min-h-[48px] px-5 border border-[var(--line)] bg-transparent text-[var(--text)] text-[11px] font-semibold tracking-[.1em] uppercase whitespace-nowrap cursor-pointer transition-[background,color,border-color] duration-150 hover:bg-[var(--surface)]"
          >
            Voltar
          </Link>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center w-fit min-h-[48px] px-5 border border-[var(--accent)] bg-[var(--accent)] text-white text-[11px] font-semibold tracking-[.1em] uppercase whitespace-nowrap cursor-pointer transition-[background,color,border-color] duration-150 disabled:opacity-60"
          >
            Salvar perfil
          </button>
        </div>
      </form>
      <div className="px-10 py-[30px] border-b border-[var(--line)] flex flex-col gap-5">
        <h2 className="text-[11px] font-medium tracking-[.12em] uppercase text-[var(--muted)]">Zona de perigo</h2>
        <button
          type="button"
          onClick={openDeleteModal}
          className="inline-flex items-center justify-center w-fit min-h-[48px] px-5 border-0 bg-[var(--accent)] text-white text-[11px] font-semibold tracking-[.1em] uppercase whitespace-nowrap cursor-pointer transition-[background,color,border-color] duration-150 hover:brightness-110"
        >
          Cancelar minha conta
        </button>
      </div>
    </>
  );
}
