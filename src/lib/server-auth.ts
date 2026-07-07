import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export interface AuthUser {
  userId: string;
  email: string;
  name: string;
}

export async function getServerAuth(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');
  if (!sessionCookie?.value) return null;
  
  const session = await prisma.session.findUnique({
    where: { sessionToken: sessionCookie.value },
    include: { user: true },
  });

  if (!session || session.expires < new Date()) return null;

  return {
    userId: session.userId,
    email: session.user.email,
    name: session.user.name,
  };
}
