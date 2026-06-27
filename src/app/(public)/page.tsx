import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Sparkles, Tv, Film, BookOpen, Gamepad2 } from "lucide-react";
import { auth } from "@/auth";

export default async function HomePage() {
  const session = await auth();
  const signedIn = !!session?.user;

  return (
    <>
      <section className="landing-hero relative h-screen flex flex-col overflow-hidden px-[min(6vw,80px)] py-12">
        <header className="landing-header relative z-10 flex items-center justify-between">
          <Image src="/logo.png" alt="CachyList" width={160} height={80} className="h-20 w-auto" priority />
          <Link
            href={signedIn ? "/app" : "/login"}
            className="landing-login flex items-center gap-2.5 text-[var(--text)] font-bold text-sm px-6 py-2.5 border border-[var(--line)] bg-transparent transition-colors duration-200 hover:bg-[var(--hover-bg)]"
          >
            Entrar <ArrowRight size={14} />
          </Link>
        </header>
        <div className="landing-copy relative z-10 w-[min(560px,92vw)] mt-[12vh]">
          <h1 className="font-display text-[clamp(4.3rem,9vw,8rem)] leading-[.88] m-0 uppercase tracking-[-.03em]">
            Suas histórias.
            <br />
            <span className="text-[var(--purple)]">Seu jeito.</span>
          </h1>
          <span className="title-brush" aria-hidden="true" />
          <p className="text-[#d8d4df] text-xl leading-[1.5] max-w-[470px]">
            O lugar onde animes, séries, filmes, livros e jogos se encontram. Organize, acompanhe e
            aproveite cada momento.
          </p>
          <Link
            href={signedIn ? "/app" : "/register"}
            className="brush-button alt mt-4 min-w-0 uppercase inline-flex items-center justify-center w-fit min-h-[54px] border-0 px-7 text-white font-extrabold cursor-pointer whitespace-nowrap transition-opacity duration-200 hover:opacity-90"
          >
            Começar agora
          </Link>
        </div>
      </section>

      <section className="category-strip py-13 px-[6vw] text-center bg-[#09090a]">
        <p className="text-[var(--purple-2)] font-display text-[1.6rem] italic m-0">
          Tudo que você assiste, lê ou joga.
        </p>
        <h2 className="font-display text-[clamp(3rem,6vw,5rem)]">
          Em um só lugar.
        </h2>
        <div className="landing-categories grid grid-cols-2 md:grid-cols-5 gap-5 mx-auto my-10 max-w-[1080px]">
          {[
            { Icon: Sparkles, label: "Animes" },
            { Icon: Tv, label: "Séries" },
            { Icon: Film, label: "Filmes" },
            { Icon: BookOpen, label: "Livros" },
            { Icon: Gamepad2, label: "Jogos" },
          ].map(({ Icon, label }) => (
            <span key={label} className="text-[var(--purple)] flex flex-col items-center gap-3">
              <Icon size={40} />
              <small className="text-white font-display text-[1.9rem] italic">
                {label}
              </small>
            </span>
          ))}
        </div>
      </section>

      <section className="pace-section relative isolate flex items-center min-h-[320px] px-[min(6vw,84px)] py-[clamp(36px,5vw,72px)] overflow-hidden shadow-[inset_0_-1px_0_rgba(255,255,255,.08),0_30px_90px_rgba(0,0,0,.35)]">
        <div className="pace-copy max-w-[530px]">
          <h2 className="font-display text-[clamp(2.8rem,5vw,4.5rem)] italic leading-[.88] m-0 uppercase tracking-[-.03em] [text-shadow:0_4px_20px_rgba(0,0,0,.72)]">
            Do seu jeito.
            <br />
            No <span className="text-[var(--purple)]">seu ritmo.</span>
          </h2>
          <span className="title-brush" aria-hidden="true" />
          <p className="text-[rgba(232,228,238,.78)] mt-0 leading-[1.5] max-w-[470px] [text-shadow:0_2px_16px_rgba(0,0,0,.8)] text-[clamp(0.9rem,1.2vw,1.1rem)]">
            Acompanhe seu progresso, defina prioridades e nunca perca o que importa.
          </p>
        </div>
      </section>
    </>
  );
}
