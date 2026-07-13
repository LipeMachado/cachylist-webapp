import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";

// A precomputed bcrypt hash (cost 12, matching BCRYPT_COST) of an arbitrary
// string nobody will ever type. Used so a nonexistent email still pays the
// same bcrypt.compare cost as a real one — otherwise the ~150-300ms gap
// between "no user" (skip the compare) and "wrong password" (run it) is a
// login-timing side channel for enumerating registered emails.
const DUMMY_HASH = "$2b$12$aXK2joX86sAib22CiWF8KuYCt5mmzPUHHSi4Sn.3/QZKJIaara6Qy";

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

        // Devise stores bcrypt hashes ($2a$12$...). bcryptjs verifies them directly
        // (no pepper configured in the Rails app).
        const ok = await bcrypt.compare(password, user?.encryptedPassword ?? DUMMY_HASH);
        if (!user || !user.encryptedPassword || !ok) return null;

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
