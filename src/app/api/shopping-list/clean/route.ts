import { NextResponse } from 'next/server';
import { getApiAuth } from '@/lib/server-auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const auth = await getApiAuth(req);

  if (!auth) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const items = await prisma.shoppingList.findMany({
    where: {
      user: { email: auth.email },
    },
  });

  let cleanedCount = 0;

  for (const item of items) {
    const cleanName = item.item.replace(/^Auto-generated:\s*/i, '').trim();
    if (cleanName !== item.item) {
      await prisma.shoppingList.update({
        where: { id: item.id },
        data: { item: cleanName },
      });
      cleanedCount++;
    }
  }

  return NextResponse.json({ cleaned: cleanedCount });
}
