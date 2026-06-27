import Link from "next/link";
import Image from "next/image";
import RegisterForm from "@/components/RegisterForm";
import { registrationEnabled } from "@/lib/config";

export default function RegisterPage() {
  if (!registrationEnabled()) {
    return (
      <section className="w-screen min-h-screen relative grid grid-cols-1 overflow-hidden bg-[var(--page-bg)]">
        <div className="relative z-10 flex flex-col justify-center w-[min(520px,88vw)] mx-auto px-2 md:px-5 text-center">
          <Link href="/">
            <Image src="/logo.png" alt="CachyList" width={160} height={80} className="h-20 w-auto mx-auto block mb-5" />
          </Link>
          <h1 className="text-2xl font-extrabold tracking-[-.03em] mb-3">Cadastro desativado</h1>
          <p className="text-[#c4c0ca] mb-8">
            Esta instância do CachyList não está aceitando novos cadastros.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center w-full min-h-[48px] px-[22px] border border-[var(--line)] text-[var(--accent-strong)] bg-transparent font-bold whitespace-nowrap cursor-pointer transition-[background,opacity,border-color] duration-200 hover:bg-[var(--hover-bg)]"
          >
            Voltar ao login
          </Link>
        </div>
      </section>
    );
  }

  return <RegisterForm />;
}
