"use client";

import { use, useActionState } from "react";
import Link from "next/link";
import Image from "next/image";
import PasswordField from "@/components/PasswordField";
import { resetPassword, type AuthFormState } from "../../actions";

export default function PasswordEditPage({
  searchParams,
}: {
  searchParams: Promise<{ reset_password_token?: string }>;
}) {
  const params = use(searchParams);
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    resetPassword,
    {}
  );

  return (
    <section className="w-screen min-h-screen relative grid grid-cols-1 overflow-hidden bg-[var(--page-bg)]">
      <div className="auth-art min-h-screen hidden" />
      <div className="relative z-10 flex flex-col justify-center w-[min(520px,88vw)] mx-auto px-2 md:px-5">
        <Link href="/">
          <Image src="/logo.png" alt="CachyList" width={160} height={80} className="h-20 w-auto mx-auto block mb-5" />
        </Link>
        <p className="text-[#c4c0ca] text-[1.15rem] m-0 mb-[42px] text-center">Defina uma nova senha.</p>

        {state.error && (
          <p className="mb-5 border border-[var(--line)] p-3.5 text-[var(--text)] text-sm bg-[rgba(216,212,204,.08)]">{state.error}</p>
        )}
        {state.notice && (
          <p className="mb-5 border border-[var(--line)] p-3.5 text-[var(--text)] text-sm bg-[rgba(216,212,204,.08)]">{state.notice}</p>
        )}

        <form action={formAction} className="grid gap-5">
          <input type="hidden" name="reset_password_token" defaultValue={params.reset_password_token ?? ""} />
          <label className="text-[#ddd9e7] grid gap-2.5 font-semibold">
            Nova senha
            <PasswordField name="password" autoComplete="new-password" required autoFocus />
          </label>
          <label className="text-[#ddd9e7] grid gap-2.5 font-semibold">
            Confirmar senha
            <PasswordField name="password_confirmation" autoComplete="new-password" required />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="primary-button inline-flex items-center justify-center w-full min-h-[54px] border-0 px-7 text-white font-extrabold cursor-pointer whitespace-nowrap disabled:opacity-60"
          >
            {pending ? "Alterando..." : "Alterar senha"}
          </button>
        </form>
      </div>
    </section>
  );
}
