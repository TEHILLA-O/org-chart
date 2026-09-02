import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id';
import { compare } from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { config } from '@/lib/config';
import { logger } from '@/lib/logger';
import type { OrgRole } from '@prisma/client';

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const entraConfigured = Boolean(
  process.env.AUTH_MICROSOFT_ENTRA_ID_ID &&
    process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET &&
    process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID,
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: config().AUTH_SECRET,
  session: { strategy: 'jwt', maxAge: 60 * 60 * 12 },
  pages: {
    signIn: '/login',
  },
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const email = parsed.data.email.toLowerCase();
        const user = await prisma.user.findUnique({
          where: { email },
          include: { memberships: { take: 1, orderBy: { createdAt: 'asc' } } },
        });

        if (!user?.passwordHash) {
          return null;
        }

        const valid = await compare(parsed.data.password, user.passwordHash);
        if (!valid) {
          const organisationId = user.memberships[0]?.organisationId;
          if (organisationId) {
            await prisma.auditEvent
              .create({
                data: {
                  organisationId,
                  actorId: user.id,
                  actorType: 'USER',
                  action: 'LOGIN_FAILED',
                  entityType: 'User',
                  entityId: user.id,
                  source: 'LOCAL',
                },
              })
              .catch(() => undefined);
          }
          return null;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        const membership = user.memberships[0];
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          organisationId: membership?.organisationId,
          role: membership?.role,
        };
      },
    }),
    ...(entraConfigured
      ? [
          MicrosoftEntraID({
            clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID!,
            clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET!,
            issuer: `https://login.microsoftonline.com/${process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID}/v2.0`,
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.organisationId = (user as { organisationId?: string }).organisationId;
        token.role = (user as { role?: OrgRole }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? '';
        session.user.organisationId = (token.organisationId as string | undefined) ?? null;
        session.user.role = (token.role as OrgRole | undefined) ?? null;
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      logger.info({ userId: user.id }, 'user signed in');
    },
  },
});
