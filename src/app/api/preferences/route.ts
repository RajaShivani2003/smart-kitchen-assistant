import { NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/server-auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export async function GET() {
  const auth = await getServerAuth();

  if (!auth) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: auth.email },
    select: { dietaryPreferences: true, healthGoals: true },
  });

  return NextResponse.json({ dietaryPreferences: user?.dietaryPreferences || '', healthGoals: user?.healthGoals || null });
}

export async function PUT(req: Request) {
  const auth = await getServerAuth();

  if (!auth) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const schema = z.object({
    dietaryPreferences: z.string().optional(),
    healthGoals: z.string().nullable().optional(),
  });

  const validation = schema.safeParse(await req.json());

  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.message },
      { status: 400 }
    );
  }

  const { dietaryPreferences, healthGoals } = validation.data;

  const user = await prisma.user.update({
    where: { email: auth.email },
    data: {
      dietaryPreferences: dietaryPreferences || '',
      healthGoals: healthGoals || null,
    },
  });

  return NextResponse.json(user);
}
