import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

// Returns the authenticated DB user, or redirects to /login. Use in private
// server components / actions (mirrors Devise's authenticate_user!).
export async function requireUser(): Promise<User> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: Number(session.user.id) },
  });
  if (!user) redirect("/login");
  return user;
}

export async function currentUser(): Promise<User | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return prisma.user.findUnique({ where: { id: Number(session.user.id) } });
}
