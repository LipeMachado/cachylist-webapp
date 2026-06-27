"use client";

import { useActionState } from "react";
import Link from "next/link";
import Image from "next/image";
import PasswordField from "@/components/PasswordField";
import { loginAction, type AuthFormState } from "../actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    loginAction,
    {}
  );

  return (
    <section className="w-screen min-h-screen relative grid grid-cols-1 overflow-hidden bg-[var(--page-bg)]">
      <div className="auth-art min-h-screen hidden" />
      <div className="relative z-10 flex flex-col justify-center w-[min(520px,88vw)] mx-auto px-2 md:px-5">
        <Link href="/">
          <Image src="/logo.png" alt="CachyList" width={160} height={80} className="h-20 w-auto mx-auto block mb-5" />
        </Link>
        <p className="text-[#c4c0ca] text-[1.15rem] mb-[42px] text-center">Seu lugar. Suas histórias.</p>

        {state.error && (
          <p className="mb-5 border border-[var(--line)] p-3.5 text-[var(--text)] text-sm bg-[rgba(216,212,204,.08)]">
            {state.error}
          </p>
        )}
        {state.notice && (
          <p className="mb-5 border border-[var(--line)] p-3.5 text-[var(--text)] text-sm bg-[rgba(216,212,204,.08)]">
            {state.notice}
          </p>
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
          <label className="text-[#ddd9e7] grid gap-2.5 font-semibold">
            Senha
            <PasswordField name="password" autoComplete="current-password" placeholder="••••••••" required />
          </label>
          <label className="flex items-center gap-2.5 text-[var(--muted)] cursor-pointer select-none remember-container">
            <input type="checkbox" name="remember_me" className="remember-input" />
            <span className="remember-box">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            Lembrar de mim
          </label>
          <button
            type="submit"
            disabled={pending}
            className="primary-button inline-flex items-center justify-center w-full min-h-[54px] border-0 px-7 text-white font-extrabold cursor-pointer whitespace-nowrap disabled:opacity-60"
          >
            {pending ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="flex items-center gap-[18px] text-[#878493] my-7">
          <span>ou</span>
        </div>
        <Link
          href="/register"
          className="inline-flex items-center justify-center w-full min-h-[48px] px-[22px] border border-[var(--line)] text-[var(--accent-strong)] bg-transparent font-bold whitespace-nowrap cursor-pointer transition-[background,opacity,border-color] duration-200 hover:bg-[var(--hover-bg)]"
        >
          Criar conta
        </Link>
        <Link
          href="/password/new"
          className="auth-link text-[var(--purple-2)] mt-7 text-center font-bold transition-opacity duration-200 hover:opacity-75"
        >
          Esqueceu sua senha?
        </Link>
      </div>
    </section>
  );
}
