"use client";

import { useActionState } from "react";
import Link from "next/link";
import Image from "next/image";
import { requestPasswordReset, type AuthFormState } from "../../actions";

export default function PasswordNewPage() {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    requestPasswordReset,
    {}
  );

  return (
    <section className="w-screen min-h-screen relative grid grid-cols-1 overflow-hidden bg-[var(--page-bg)]">
      <div className="auth-art min-h-screen hidden" />
      <div className="relative z-10 flex flex-col justify-center w-[min(520px,88vw)] mx-auto px-2 md:px-5">
        <Link href="/">
          <Image src="/logo.png" alt="CachyList" width={160} height={80} className="h-20 w-auto mx-auto block mb-5" />
        </Link>
        <p className="text-[#c4c0ca] text-[1.15rem] m-0 mb-[42px] text-center">
          Informe seu e-mail para recuperar a senha.
        </p>

        {state.error && (
          <p className="mb-5 border border-[var(--line)] p-3.5 text-[var(--text)] text-sm bg-[rgba(216,212,204,.08)]">{state.error}</p>
        )}
        {state.notice && (
          <p className="mb-5 border border-[var(--line)] p-3.5 text-[var(--text)] text-sm bg-[rgba(216,212,204,.08)]">{state.notice}</p>
        )}

        <form action={formAction} className="grid gap-5">
          <label className="text-[var(--text)] grid gap-2.5 font-semibold">
            E-mail
            <input
              type="email"
              name="email"
              autoFocus
              autoComplete="email"
              placeholder="seu@email.com"
              required
              className="w-full border border-[var(--line)] text-[var(--text)] bg-[var(--field-bg)] px-3 py-[15px] outline-none"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="primary-button inline-flex items-center justify-center w-full min-h-[54px] border-0 px-7 text-white font-extrabold cursor-pointer whitespace-nowrap disabled:opacity-60"
          >
            {pending ? "Enviando..." : "Enviar instruções"}
          </button>
        </form>
        <Link
          href="/login"
          className="auth-link text-[var(--purple-2)] mt-7 text-center font-bold transition-opacity duration-200 hover:opacity-75"
        >
          Voltar ao login
        </Link>
      </div>
    </section>
  );
}
