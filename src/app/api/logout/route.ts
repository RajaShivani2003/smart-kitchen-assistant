import { getApiAuth } from '@/lib/server-auth';

export async function POST(req: Request) {
  const auth = await getApiAuth(req);

  if (!auth) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }

  return Response.json({ message: 'Logged out successfully' });
}
