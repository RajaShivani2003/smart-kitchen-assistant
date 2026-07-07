import { getServerAuth } from '@/lib/server-auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const auth = await getServerAuth();

  if (!auth) {
    return Response.json({ session: null }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: auth.email },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      dietaryPreferences: true,
      healthGoals: true,
      createdAt: true,
    },
  });

  return Response.json({ session: { user }, user });
}
