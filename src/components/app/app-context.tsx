"use client";

import { createContext, useContext } from "react";

export interface AppUser {
  id: number;
  email: string;
  username: string | null;
  avatar: string | null;
  displayName: string;
  avatarUrl: string | null;
  initial: string;
  createdAt: string;
}

export interface OpenMediaOptions {
  status?: string;
  category?: string;
}

interface AppModalContextValue {
  user: AppUser;
  openMediaModal: (opts?: OpenMediaOptions) => void;
  openAvatarModal: () => void;
  openPasswordModal: () => void;
  openLogoutModal: () => void;
  openDeleteModal: () => void;
  openMobileMenu: () => void;
}

export const AppModalContext = createContext<AppModalContextValue | null>(null);

export function useAppModal(): AppModalContextValue {
  const ctx = useContext(AppModalContext);
  if (!ctx) throw new Error("useAppModal must be used within AppChrome");
  return ctx;
}
