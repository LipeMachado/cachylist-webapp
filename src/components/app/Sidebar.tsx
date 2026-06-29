"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Library,
  Sparkles,
  Tv,
  Film,
  BookOpen,
  Gamepad2,
  Upload,
  PanelLeftOpen,
  PanelLeftClose,
  Pencil,
  LogOut,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAppModal } from "./app-context";

interface NavItem {
  label: string;
  path: string;
  Icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", path: "/app", Icon: LayoutDashboard },
  { label: "Biblioteca", path: "/app/library", Icon: Library },
  { label: "Animes", path: "/app/library/animes", Icon: Sparkles },
  { label: "Séries", path: "/app/library/series", Icon: Tv },
  { label: "Filmes", path: "/app/library/movies", Icon: Film },
  { label: "Livros", path: "/app/library/books", Icon: BookOpen },
  { label: "Jogos", path: "/app/library/games", Icon: Gamepad2 },
  { label: "Importar", path: "/app/import", Icon: Upload },
];

function normalize(path: string): string {
  return path.replace(/\/$/, "") || "/";
}

function useActivePath(): string {
  const pathname = normalize(usePathname());
  const matches = NAV_ITEMS.filter((item) => {
    const p = normalize(item.path);
    return pathname === p || pathname.startsWith(`${p}/`);
  }).sort((a, b) => normalize(b.path).length - normalize(a.path).length);
  return matches[0] ? normalize(matches[0].path) : "";
}

interface Props {
  onCollapse: () => void;
  onExpand: () => void;
  onMobileClose: () => void;
}

export default function Sidebar({ onCollapse, onExpand, onMobileClose }: Props) {
  const activePath = useActivePath();
  const { user, openAvatarModal, openLogoutModal } = useAppModal();

  return (
    <aside
      id="app-sidebar"
      className="sticky top-0 h-full bg-[var(--panel-bg)] border-r border-[var(--line)] grid grid-rows-[auto_auto_1fr_auto]"
    >
      {/* collapsed rail */}
      <div className="sidebar-rail">
        <Link href="/app" className="sidebar-rail-logo" aria-label="CachyList">
          <Image src="/logo.png" alt="CachyList" width={26} height={26} className="h-5 w-auto" />
        </Link>
        <button className="sidebar-expand-button" type="button" aria-label="Abrir menu lateral" onClick={onExpand}>
          <PanelLeftOpen size={18} />
        </button>
        <nav className="sidebar-rail-nav" aria-label="Navegação compacta">
          {NAV_ITEMS.map(({ label, path, Icon }) => (
            <Link
              key={path}
              href={path}
              className={`sidebar-rail-link ${normalize(path) === activePath ? "active" : ""}`}
              title={label}
              aria-label={label}
            >
              <Icon size={18} />
            </Link>
          ))}
        </nav>
      </div>

      {/* mobile drawer header */}
      <div className="mobile-drawer-header">
        <Link href="/app" className="block w-fit" onClick={onMobileClose}>
          <Image src="/logo.png" alt="CachyList" width={20} height={20} className="h-5 w-auto" />
        </Link>
        <button type="button" aria-label="Fechar menu" onClick={onMobileClose}>
          <X size={26} />
        </button>
      </div>

      {/* profile row */}
      <div className="sidebar-profile-row px-6 py-3 border-b border-[var(--line)] grid items-center gap-4">
        <button
          type="button"
          className="group relative w-[54px] h-[54px] border border-[var(--line)] grid place-items-center font-black text-lg text-[var(--text)] bg-[var(--surface-2)] overflow-hidden cursor-pointer"
          onClick={openAvatarModal}
          aria-label="Editar avatar"
        >
          {user.avatarUrl ? (
            <Image src={user.avatarUrl} alt={`Avatar de ${user.displayName}`} width={54} height={54} className="w-full h-full object-cover" />
          ) : (
            <span>{user.initial}</span>
          )}
          <span className="absolute inset-0 hidden place-items-center bg-[var(--overlay-bg)] text-[var(--text)] group-hover:grid">
            <Pencil size={18} />
          </span>
        </button>
        <Link
          href={`/app/users/${user.id}`}
          className="min-w-0 transition-opacity duration-150 hover:opacity-80"
          onClick={onMobileClose}
        >
          <span className="block text-sm font-semibold text-[var(--text)] truncate">{user.displayName}</span>
          <span className="block mt-1 brutalist-link">Ver perfil ↗</span>
        </Link>
        <button className="sidebar-collapse-button" type="button" aria-label="Recolher menu lateral" onClick={onCollapse}>
          <PanelLeftClose size={18} />
        </button>
      </div>

      {/* nav */}
      <nav className="block py-4">
        <p className="px-6 mb-3 brutalist-kicker">Navegação</p>
        {NAV_ITEMS.map(({ label, path, Icon }) => {
          const active = normalize(path) === activePath;
          return (
            <Link
              key={path}
              href={path}
              onClick={onMobileClose}
              className={`min-h-[44px] px-6 flex items-center gap-3 text-[var(--muted)] text-[12px] font-semibold tracking-[.14em] uppercase whitespace-nowrap transition-[background,color] duration-150 hover:text-[var(--text)] hover:bg-[var(--hover-bg)] ${
                active
                  ? "active text-[var(--text)] bg-[var(--hover-bg)] shadow-[inset_3px_0_0_var(--accent)]"
                  : ""
              }`}
            >
              <span className="w-[18px] h-[18px] text-current inline-grid place-items-center">
                <Icon size={19} />
              </span>
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* footer */}
      <div className="px-6 py-6 border-t border-[var(--line)] flex flex-col justify-end">
        <button
          className="w-full min-h-[42px] border border-[var(--line)] bg-transparent text-[var(--muted)] grid grid-cols-[20px_1fr] items-center gap-2 px-3 text-left text-[11px] font-bold tracking-[.14em] uppercase cursor-pointer transition-[color,background,border-color] duration-150 hover:text-[var(--text)] hover:bg-[var(--hover-bg)] hover:border-[var(--muted)]"
          type="button"
          aria-label="Sair"
          onClick={openLogoutModal}
        >
          <LogOut size={16} />
          <span>Sair</span>
        </button>
        <p className="mt-5 mb-0 text-[10px] leading-5 text-[var(--muted)] tracking-[.14em] uppercase">
          <span className="inline-block w-2.5 h-2.5 bg-[var(--accent)] mr-2" />
          Cachylist v1.0
        </p>
      </div>
    </aside>
  );
}
