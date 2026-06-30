import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

// Returns the authenticated DB user, or redirects to /login. Use in private
// server components / actions (mirrors Devise's authenticate_user!).
// Wrapped in React cache(): layout + page + modal slot all call this during a
// single render. Without dedup each was a separate query — enough concurrent
// load to exhaust the Supabase pooler's single connection (connection_limit=1).
export const requireUser = cache(async (): Promise<User> => {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: Number(session.user.id) },
  });
  if (!user) redirect("/login");
  return user;
});

export const currentUser = cache(async (): Promise<User | null> => {
  const session = await auth();
  if (!session?.user?.id) return null;
  return prisma.user.findUnique({ where: { id: Number(session.user.id) } });
});
