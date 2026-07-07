import { NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/server-auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getServerAuth();

  if (!auth) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;

  const mealPlan = await prisma.mealPlan.findUnique({
    where: { id },
  });

  if (!mealPlan || mealPlan.userId !== auth.userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.mealPlan.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
