import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <div className="public-body antialiased min-h-screen grid place-items-center px-6">
      <div className="text-center w-[min(440px,92vw)]">
        <Image src="/logo.png" alt="CachyList" width={140} height={70} className="h-16 w-auto mx-auto mb-8" />
        <p className="brutalist-kicker mb-3">Erro 404</p>
        <h1 className="text-[clamp(40px,9vw,64px)] font-black uppercase tracking-[-.06em] leading-[.95] mb-4">
          Página não encontrada
        </h1>
        <p className="text-[var(--muted)] text-sm leading-7 mb-8">
          O endereço que você tentou acessar não existe ou foi movido.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/app"
            className="inline-flex items-center justify-center min-h-[48px] px-5 bg-[var(--accent)] text-white text-[11px] font-semibold tracking-[.1em] uppercase whitespace-nowrap border-none transition-[filter] duration-150 hover:brightness-110"
          >
            Ir para o app
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center min-h-[48px] px-5 border border-[var(--line)] bg-transparent text-[var(--text)] text-[11px] font-semibold tracking-[.1em] uppercase whitespace-nowrap transition-[background] duration-150 hover:bg-[var(--hover-bg)]"
          >
            Início
          </Link>
        </div>
      </div>
    </div>
  );
}
