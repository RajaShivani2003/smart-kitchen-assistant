import { NextResponse } from 'next/server';
import { getApiAuth } from '@/lib/server-auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const auth = await getApiAuth(req);

  if (!auth) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const shoppingLists = await prisma.shoppingList.findMany({
    where: {
      user: { email: auth.email },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(shoppingLists);
}

export async function POST(req: Request) {
  const auth = await getApiAuth(req);

  if (!auth) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const data = await req.json();

  if (!data.item) {
    return NextResponse.json(
      { error: 'Item name is required' },
      { status: 400 }
    );
  }

  const shoppingList = await prisma.shoppingList.create({
    data: {
      user: { connect: { email: auth.email } },
      item: data.item,
      quantity: data.quantity || null,
      unit: data.unit || null,
      category: data.category || null,
    },
  });

  return NextResponse.json(shoppingList);
}
