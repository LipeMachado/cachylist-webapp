"use server";

import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { registrationEnabled } from "@/lib/config";

const BCRYPT_COST = 12; // matches Devise stretches=12 → hashes interoperate both ways
const PASSWORD_MIN = 6;
const PASSWORD_MAX = 200;
const RESET_WINDOW_MS = 6 * 60 * 60 * 1000; // Devise default reset_password_within (6h)

export interface AuthFormState {
  error?: string;
  notice?: string;
}

/* ── Login ───────────────────────────────────────────────────────────────── */

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  try {
    await signIn("credentials", { email, password, redirectTo: "/app" });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "E-mail ou senha inválidos." };
    }
    throw error; // re-throw redirect
  }
}

/* ── Register ────────────────────────────────────────────────────────────── */

export async function registerAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  if (!registrationEnabled()) {
    return { error: "Cadastro desativado nesta instância." };
  }

  const username = String(formData.get("username") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("password_confirmation") ?? "");

  const errors: string[] = [];

  if (!email) errors.push("E-mail é obrigatório");
  else if (email.length > 255) errors.push("E-mail muito longo");
  else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.push("E-mail inválido");

  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX)
    errors.push(`Senha deve ter entre ${PASSWORD_MIN} e ${PASSWORD_MAX} caracteres`);
  if (password !== confirmation) errors.push("A confirmação de senha não confere");

  if (username) {
    if (!/^[a-zA-Z0-9_]+$/.test(username))
      errors.push("Nome de usuário: somente letras, números e underscore");
    if (username.length < 3 || username.length > 30)
      errors.push("Nome de usuário deve ter entre 3 e 30 caracteres");
  }

  // Both lookups only matter once the rest of the form is valid, and are
  // independent of each other — run them concurrently.
  const preValidated = errors.length === 0;
  const [existingUsername, existingEmail] = await Promise.all([
    preValidated && username ? prisma.user.findUnique({ where: { username } }) : null,
    preValidated ? prisma.user.findUnique({ where: { email } }) : null,
  ]);
  if (existingUsername) errors.push("Nome de usuário já está em uso");
  if (errors.length > 0) return { error: errors.join(". ") };

  const GENERIC_NOTICE =
    "Cadastro processado. Se era uma conta nova, você já está conectado. Se este e-mail já tinha conta, entre pela tela de login.";

  if (existingEmail) {
    // Don't attempt sign-in with the submitted password for an email that's
    // already registered: that would (a) leak a redirect/response-based
    // oracle for enumerating registered emails, and (b) if the guess happened
    // to be the real password, silently sign the caller into someone else's
    // account. Return the same generic outcome as a fresh signup instead.
    return { notice: GENERIC_NOTICE };
  }

  const encryptedPassword = await bcrypt.hash(password, BCRYPT_COST);
  try {
    await prisma.user.create({
      data: { email, username: username || null, encryptedPassword },
    });
  } catch (error) {
    // Unique-constraint race: another request registered this email between
    // our lookup above and this insert. Same generic outcome either way.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { notice: GENERIC_NOTICE };
    }
    throw error;
  }

  try {
    await signIn("credentials", { email, password, redirectTo: "/app" });
    return {};
  } catch (error) {
    if (error instanceof AuthError)
      return { error: "Não foi possível concluir o cadastro. Se você já tem uma conta, faça login." };
    throw error;
  }
}

/* ── Password reset ──────────────────────────────────────────────────────── */

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function requestPasswordReset(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const notice =
    "Se o e-mail existir, você receberá instruções para redefinir sua senha em alguns minutos.";

  if (!email) return { error: "Informe seu e-mail." };

  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const raw = randomBytes(20).toString("hex");
    await prisma.user.update({
      where: { id: user.id },
      data: { resetPasswordToken: hashToken(raw), resetPasswordSentAt: new Date() },
    });
    // Email transport is not configured in this environment; log the link so the
    // flow remains testable in development.
    console.info(`[password reset] /password/edit?reset_password_token=${raw}`);
  }

  return { notice };
}

export async function resetPassword(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const raw = String(formData.get("reset_password_token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("password_confirmation") ?? "");

  if (!raw) return { error: "Token de redefinição ausente ou inválido." };
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX)
    return { error: `Senha deve ter entre ${PASSWORD_MIN} e ${PASSWORD_MAX} caracteres.` };
  if (password !== confirmation) return { error: "A confirmação de senha não confere." };

  const user = await prisma.user.findFirst({
    where: { resetPasswordToken: hashToken(raw) },
  });
  if (
    !user ||
    !user.resetPasswordSentAt ||
    Date.now() - user.resetPasswordSentAt.getTime() > RESET_WINDOW_MS
  ) {
    return { error: "Token inválido ou expirado. Solicite novamente." };
  }

  const encryptedPassword = await bcrypt.hash(password, BCRYPT_COST);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      encryptedPassword,
      resetPasswordToken: null,
      resetPasswordSentAt: null,
    },
  });

  try {
    await signIn("credentials", { email: user.email, password, redirectTo: "/app" });
    return {};
  } catch (error) {
    if (error instanceof AuthError) return { notice: "Senha alterada. Faça login." };
    throw error;
  }
}
