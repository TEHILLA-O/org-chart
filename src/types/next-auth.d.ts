import type { OrgRole } from '@prisma/client';
import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      id: string;
      organisationId: string | null;
      role: OrgRole | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    organisationId?: string;
    role?: OrgRole;
  }
}
