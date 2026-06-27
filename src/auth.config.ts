import type { NextAuthConfig } from "next-auth";

// Edge-safe Auth.js config (no Prisma / bcrypt here). Used by middleware and
// extended in auth.ts with the Credentials provider.
export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = (user as { username?: string | null }).username ?? null;
        token.avatar = (user as { avatar?: string | null }).avatar ?? null;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.username = (token.username as string | null) ?? null;
        session.user.avatar = (token.avatar as string | null) ?? null;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
