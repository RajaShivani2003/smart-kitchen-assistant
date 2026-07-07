import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';

export interface AuthUser {
  userId: string;
  email: string;
  name: string;
}

export async function getServerAuth(): Promise<AuthUser | null> {
  try {
    const headerStore = await headers();
    const cookieHeader = headerStore.get('cookie') || '';
    if (!cookieHeader) return null;

    const cookiesArr = cookieHeader.split(';').map(c => c.trim());
    const sessionCookie = cookiesArr.find(c => c.startsWith('session='));
    if (!sessionCookie) return null;

    const token = sessionCookie.split('=')[1];
    if (!token) return null;

    const session = await prisma.session.findUnique({
      where: { sessionToken: token },
      include: { user: true },
    });

    if (!session || session.expires < new Date()) return null;

    return {
      userId: session.userId,
      email: session.user.email,
      name: session.user.name,
    };
  } catch (error) {
    console.error('getServerAuth error:', error);
    return null;
  }
}

export async function getApiAuth(req: Request): Promise<AuthUser | null> {
  try {
    const cookieHeader = req.headers.get('cookie') || '';
    const cookiesArr = cookieHeader.split(';').map(c => c.trim());
    const sessionCookie = cookiesArr.find(c => c.startsWith('session='));
    if (!sessionCookie) return null;

    const token = sessionCookie.split('=')[1];
    if (!token) return null;

    const session = await prisma.session.findUnique({
      where: { sessionToken: token },
      include: { user: true },
    });

    if (!session || session.expires < new Date()) return null;

    return {
      userId: session.userId,
      email: session.user.email,
      name: session.user.name,
    };
  } catch (error) {
    console.error('getApiAuth error:', error);
    return null;
  }
}
