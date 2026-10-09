import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  // Requests arrive with the Cloudflare Tunnel's public hostname, not
  // localhost — Auth.js rejects that by default (UntrustedHost).
  trustHost: true,
  providers: [],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.role = (user as { role: string }).role;
        token.id = user.id as string;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        (session.user as { role?: string; id?: string }).role = token.role as string;
        (session.user as { role?: string; id?: string }).id = token.id as string;
      }
      return session;
    },
  },
};
