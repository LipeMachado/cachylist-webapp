import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    username?: string | null;
    avatar?: string | null;
  }

  interface Session {
    user: {
      id: string;
      username?: string | null;
      avatar?: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    username?: string | null;
    avatar?: string | null;
  }
}
