import { getApiAuth } from '@/lib/server-auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const auth = await getApiAuth(req);

  if (!auth) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const cookieHeader = req.headers.get('cookie') || '';
  const cookiesArr = cookieHeader.split(';').map(c => c.trim());
  const sessionCookie = cookiesArr.find(c => c.startsWith('session='));
  if (sessionCookie) {
    const token = sessionCookie.split('=')[1];
    if (token) {
      await prisma.session.deleteMany({
        where: { sessionToken: token },
      });
    }
  }

  const response = Response.json({ message: 'Logged out successfully' });
  response.headers.set('set-cookie', 'session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure');
  return response;
}
