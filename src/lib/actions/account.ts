"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { signOut } from "@/auth";
import { AVATAR_OPTIONS } from "@/lib/media";

const BCRYPT_COST = 12;

export interface AccountState {
  ok?: boolean;
  error?: string;
}

export async function updateAccount(
  _prev: AccountState,
  formData: FormData
): Promise<AccountState> {
  const user = await requireUser();
  const username = String(formData.get("username") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  const errors: string[] = [];
  if (!email) errors.push("E-mail é obrigatório");
  else if (email.length > 255) errors.push("E-mail muito longo");
  else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.push("E-mail inválido");

  if (username) {
    if (!/^[a-zA-Z0-9_]+$/.test(username))
      errors.push("Nome de usuário: somente letras, números e underscore");
    if (username.length < 3 || username.length > 30)
      errors.push("Nome de usuário deve ter entre 3 e 30 caracteres");
  }

  if (errors.length === 0) {
    if (email !== user.email) {
      const dupe = await prisma.user.findFirst({
        where: { email, id: { not: user.id } },
      });
      if (dupe) errors.push("E-mail já está em uso");
    }
    if (username && username !== user.username) {
      const dupe = await prisma.user.findFirst({
        where: { username, id: { not: user.id } },
      });
      if (dupe) errors.push("Nome de usuário já está em uso");
    }
  }

  if (errors.length) return { error: errors.join(". ") };

  await prisma.user.update({
    where: { id: user.id },
    data: { email, username: username || null },
  });
  revalidatePath("/edit");
  revalidatePath(`/app/users/${user.id}`);
  redirect(`/app/users/${user.id}`);
}

export async function updatePassword(
  _prev: AccountState,
  formData: FormData
): Promise<AccountState> {
  const user = await requireUser();
  const current = String(formData.get("current_password") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("password_confirmation") ?? "");

  if (!(await bcrypt.compare(current, user.encryptedPassword)))
    return { error: "Senha atual incorreta." };
  if (password.length < 6 || password.length > 200)
    return { error: "Nova senha deve ter entre 6 e 200 caracteres." };
  if (password !== confirmation)
    return { error: "A confirmação de senha não confere." };

  const encryptedPassword = await bcrypt.hash(password, BCRYPT_COST);
  await prisma.user.update({ where: { id: user.id }, data: { encryptedPassword } });
  return { ok: true };
}

export async function updateAvatar(formData: FormData): Promise<void> {
  const user = await requireUser();
  const avatar = String(formData.get("avatar") ?? "");
  if (AVATAR_OPTIONS.includes(avatar)) {
    await prisma.user.update({ where: { id: user.id }, data: { avatar } });
    // Refresh the server-rendered pages that show the avatar, but don't redirect:
    // the client already updated optimistically, so we just persist in the background.
    revalidatePath(`/app/users/${user.id}`);
    revalidatePath("/app");
    revalidatePath("/app", "layout");
  }
}

export async function deleteAccount(): Promise<void> {
  const user = await requireUser();
  await prisma.user.delete({ where: { id: user.id } });
  await signOut({ redirectTo: "/" });
}

export async function logout(): Promise<void> {
  await signOut({ redirectTo: "/" });
}
