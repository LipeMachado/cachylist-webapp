"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { avatarPath } from "@/lib/media";
import { AppModalContext, type AppUser, type OpenMediaOptions } from "./app-context";
import Sidebar from "./Sidebar";
import MediaModal from "./MediaModal";
import SpatialTransition from "./SpatialTransition";
import {
  AvatarModal,
  PasswordModal,
  LogoutModal,
  DeleteAccountModal,
} from "./SharedModals";

type ModalName = "avatar" | "password" | "logout" | "delete" | null;

export default function AppChrome({
  user,
  children,
}: {
  user: AppUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [mediaOptions, setMediaOptions] = useState<OpenMediaOptions>({});
  const [modal, setModal] = useState<ModalName>(null);

  // Optimistic avatar: updated instantly on save so the sidebar/header reflect
  // the new avatar while the server action persists in the background. `null`
  // means "no override" — fall back to whatever the server sent.
  const [optimisticAvatar, setOptimisticAvatar] = useState<string | null>(null);
  const effectiveUser = useMemo<AppUser>(() => {
    if (!optimisticAvatar || optimisticAvatar === user.avatar) return user;
    return {
      ...user,
      avatar: optimisticAvatar,
      avatarUrl: avatarPath(optimisticAvatar),
    };
  }, [user, optimisticAvatar]);
  const applyAvatar = useCallback((avatar: string) => setOptimisticAvatar(avatar), []);

  // Restore persisted collapse state (localStorage is client-only, so post-mount).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCollapsed(localStorage.getItem("sidebar-collapsed") === "true");
  }, []);

  // Close the mobile drawer on navigation.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileOpen(false);
    document.documentElement.classList.remove("modal-open");
    document.body.classList.remove("modal-open");
  }, [pathname]);

  const collapse = useCallback(() => {
    setCollapsed(true);
    localStorage.setItem("sidebar-collapsed", "true");
  }, []);
  const expand = useCallback(() => {
    setCollapsed(false);
    localStorage.setItem("sidebar-collapsed", "false");
  }, []);

  const openMobileMenu = useCallback(() => {
    setMobileOpen(true);
    document.documentElement.classList.add("modal-open");
    document.body.classList.add("modal-open");
  }, []);
  const closeMobileMenu = useCallback(() => {
    setMobileOpen(false);
    document.documentElement.classList.remove("modal-open");
    document.body.classList.remove("modal-open");
  }, []);

  const openMediaModal = useCallback((opts: OpenMediaOptions = {}) => {
    setMediaOptions(opts);
    setMediaOpen(true);
  }, []);

  const ctx = {
    user: effectiveUser,
    applyAvatar,
    openMediaModal,
    openAvatarModal: () => setModal("avatar"),
    openPasswordModal: () => setModal("password"),
    openLogoutModal: () => setModal("logout"),
    openDeleteModal: () => setModal("delete"),
    openMobileMenu,
  };

  const frameClasses = [
    "app-frame grid grid-cols-[280px_1fr] overflow-hidden border border-[var(--line)] bg-[var(--bg)]",
    collapsed ? "sidebar-collapsed" : "",
    mobileOpen ? "mobile-menu-open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <AppModalContext.Provider value={ctx}>
      <div className={frameClasses}>
        <Sidebar onCollapse={collapse} onExpand={expand} onMobileClose={closeMobileMenu} />
        <button
          className="mobile-menu-overlay"
          type="button"
          aria-label="Fechar menu"
          onClick={closeMobileMenu}
          hidden={!mobileOpen}
        />
        <main className="app-main">
          <SpatialTransition>{children}</SpatialTransition>
        </main>
      </div>

      {mediaOpen && <MediaModal options={mediaOptions} onClose={() => setMediaOpen(false)} />}
      <AvatarModal open={modal === "avatar"} onClose={() => setModal(null)} user={effectiveUser} />
      <PasswordModal open={modal === "password"} onClose={() => setModal(null)} />
      <LogoutModal open={modal === "logout"} onClose={() => setModal(null)} />
      <DeleteAccountModal open={modal === "delete"} onClose={() => setModal(null)} />
    </AppModalContext.Provider>
  );
}
