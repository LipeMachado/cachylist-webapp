import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        const email = (credentials?.email as string | undefined)?.trim().toLowerCase();
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.encryptedPassword) return null;

        // Devise stores bcrypt hashes ($2a$12$...). bcryptjs verifies them directly
        // (no pepper configured in the Rails app).
        const ok = await bcrypt.compare(password, user.encryptedPassword);
        if (!ok) return null;

        return {
          id: String(user.id),
          email: user.email,
          username: user.username,
          avatar: user.avatar,
        };
      },
    }),
  ],
});
