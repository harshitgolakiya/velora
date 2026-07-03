import { randomUUID } from "node:crypto";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import FacebookProvider from "next-auth/providers/facebook";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { checkAuthRateLimit } from "./auth-rate-limit";
import { passwordSchema } from "./password-policy";
import { prisma } from "./prisma";

const credentialsSchema = z.object({
  email: z.email().transform((email) => email.toLowerCase().trim()),
  password: passwordSchema,
});

function configuredSocialProviders() {
  const providers: NextAuthOptions["providers"] = [];
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.push(GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: false,
    }));
  }
  if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) {
    providers.push(FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: false,
    }));
  }
  return providers;
}

function providerEmailVerified(profile: unknown) {
  if (!profile || typeof profile !== "object") return true;
  if (!("email_verified" in profile)) return true;
  return Boolean((profile as { email_verified?: unknown }).email_verified);
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
    updateAge: 30 * 60,
  },
  jwt: {
    maxAge: 8 * 60 * 60,
  },
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;
        if (!checkAuthRateLimit(`signin:${parsed.data.email}`).allowed) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });
        if (!user?.passwordHash) return null;
        if (user.deletedAt) return null;
        if (user.role === "CUSTOMER" && !user.emailVerifiedAt) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
    ...configuredSocialProviders(),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account || account.provider === "credentials") return true;
      if (!user.email || !account.providerAccountId || !providerEmailVerified(profile)) return false;

      const email = user.email.toLowerCase().trim();
      let dbUser = await prisma.user.findUnique({ where: { email } });
      if (dbUser?.deletedAt) return false;
      if (!dbUser) {
        dbUser = await prisma.user.create({
          data: {
            email,
            name: user.name,
            emailVerifiedAt: new Date(),
            marketingEmails: false,
            productAlertEmails: true,
            postPurchaseEmails: true,
          },
        });
      }

      await prisma.socialProviderAccount.upsert({
        where: {
          provider_providerAccountId: {
            provider: account.provider,
            providerAccountId: account.providerAccountId,
          },
        },
        create: {
          userId: dbUser.id,
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          email,
          lastLoginAt: new Date(),
        },
        update: {
          userId: dbUser.id,
          email,
          lastLoginAt: new Date(),
        },
      });

      user.id = dbUser.id;
      user.name = dbUser.name ?? user.name;
      user.email = dbUser.email;
      user.role = dbUser.role;
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = "role" in user ? user.role : "CUSTOMER";
        token.sessionId = randomUUID();
        token.sessionRevoked = false;
        await prisma.accountSession.create({
          data: {
            sessionToken: token.sessionId,
            userId: user.id,
            deviceLabel: "Signed-in device",
          },
        }).catch(() => undefined);
        return token;
      }

      if (token.sub && token.sessionId) {
        const session = await prisma.accountSession.findUnique({
          where: { sessionToken: token.sessionId },
          select: { revokedAt: true },
        }).catch(() => null);
        token.sessionRevoked = Boolean(session?.revokedAt);
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sessionRevoked ? "" : token.sub ?? "";
        session.user.role = String(token.role ?? "CUSTOMER");
        session.user.sessionId = token.sessionRevoked ? undefined : token.sessionId;
        if (token.sessionRevoked) {
          session.user.email = null;
          session.user.name = null;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/account",
  },
};
