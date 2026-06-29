import { Suspense } from "react";
import { requireUser } from "@/lib/session";
import { displayName, avatarPath } from "@/lib/media";
import AppChrome from "./AppChrome";
import AppMotion from "./AppMotion";
import Toaster from "./Toaster";
import type { AppUser } from "./app-context";

// Server wrapper for every authenticated page. Mirrors `render layout: "shared/app_shell"`.
export default async function AppShell({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal?: React.ReactNode;
}) {
  const user = await requireUser();
  const name = displayName(user);

  const appUser: AppUser = {
    id: user.id,
    email: user.email,
    username: user.username,
    avatar: user.avatar,
    displayName: name,
    avatarUrl: avatarPath(user.avatar),
    initial: name.charAt(0).toUpperCase(),
    createdAt: user.createdAt.toISOString(),
  };

  return (
    <div className="app-body antialiased m-0 min-h-screen">
      <AppMotion />
      <Suspense fallback={null}>
        <Toaster />
      </Suspense>
      <AppChrome user={appUser}>{children}</AppChrome>
      {modal}
    </div>
  );
}
