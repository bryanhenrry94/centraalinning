import { IdTokenInput, LoginFormData } from "@/modules/auth/services/auth.validators";
import { signInWithPassword } from "@/modules/auth/actions/auth.actions";
import { type AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { UserRole } from "@/shared/constants/user-role";
import { Membership } from "@/modules/auth/services/membership.validators";

// Extend NextAuth types to include custom properties
declare module "next-auth" {
  interface User extends IdTokenInput {}

  interface Session {
    user: User;
  }
}

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const params: LoginFormData = {
          email: credentials?.email as string,
          password: credentials?.password as string,
        };

        const response = await signInWithPassword(params);

        console.log("signInWithPassword response:", response);

        if (!response.success || !response.data) {
          throw new Error(response.error || "Authentication failed");
        }

        return response.data;
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET, // 👈 obligatorio
  session: {
    strategy: "jwt", // ✅ ahora sí es válido
  },
  callbacks: {
    async redirect({ url }) {
      return url;
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;

        token.code = user.code;

        token.fullname = user.fullname;

        token.email = user.email || "";

        token.phone = user.phone;

        token.tenant_id = user.tenant_id;

        token.subdomain = user.subdomain;

        token.company = user.company;

        token.roles = user.roles as UserRole[];

        token.email_verified = user.email_verified;

        token.memberships = user.memberships as Membership[];
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;

        session.user.code = token.code as string;

        session.user.fullname = token.fullname as string;

        session.user.email = token.email as string;

        session.user.phone = token.phone as string;

        session.user.tenant_id = token.tenant_id as string;

        session.user.subdomain = token.subdomain as string;

        session.user.company = token.company as string;

        session.user.roles = token.roles as UserRole[];

        session.user.email_verified = token.email_verified as boolean;

        session.user.memberships = (token.memberships as Membership[]) || [];
      }

      return session;
    },
  },
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.session-token"
          : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        domain: process.env.COOKIE_DOMAIN,
      },
    },
  },

  pages: {
    signIn: "/auth/login",
    // signOut: "/",
  },
};
