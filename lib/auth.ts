import { IdTokenInput, LoginFormData } from "@/lib/validations/auth";
import { signInWithPassword } from "@/actions/auth";
import { type AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

// Extend NextAuth types to include custom properties
declare module "next-auth" {
  interface User extends IdTokenInput {
    name?: string;
    phone?: string;
    tenant_id: string;
    role: string;
    email_verified?: boolean;
  }
  interface Session {
    user?: User;
  }
}

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        subdomain: { label: "Subdomain", type: "text" },
      },
      async authorize(credentials, req) {
        const params: LoginFormData = {
          email: credentials?.email as string,
          password: credentials?.password as string,
          subdomain: credentials?.subdomain as string,
        };

        try {
          // llama logica para validar las credenciales
          const response = await signInWithPassword(params);

          // Si la autenticación es exitosa, devuelve el usuario
          if (response && response.success === true) {
            if (!response.data) {
              return null;
            }

            // Ensure all expected properties exist, even if undefined
            return {
              ...response.data,
              role: response.data.role ?? "",
              tenant_id: response.data.tenant_id ?? "",
              name: response.data.fullname ?? "",
              email_verified: response.data.email_verified ?? false,
            };
          } else {
            return null;
          }
        } catch (error) {
          console.error("Error en authorize:", error);
          return null;
        }
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET, // 👈 obligatorio
  session: {
    strategy: "jwt", // ✅ ahora sí es válido
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.subdomain = user.subdomain;
        token.role = user.role;
        token.id = user.id;
        token.name = user.name;
        token.phone = user.phone;
        token.tenant_id = user.tenant_id;
        token.email_verified = user.email_verified;
        // Agrega aquí cualquier otra propiedad de iIdToken si es necesario
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.subdomain = token.subdomain as string;
        session.user.role = token.role as string;
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.phone = token.phone as string;
        session.user.tenant_id = token.tenant_id as string;
        session.user.email_verified = token.email_verified as boolean;
        // Agrega aquí cualquier otra propiedad si es necesario
      }
      return session;
    },
  },

  pages: {
    signIn: "/auth/login",
    // signOut: "/",
  },
};
