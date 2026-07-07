import { NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/server-auth';
import { prisma } from '@/lib/prisma';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getServerAuth();

  if (!auth) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const data = await req.json();

  const item = await prisma.shoppingList.findUnique({
    where: { id },
  });

  if (!item || item.userId !== auth.userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const updated = await prisma.shoppingList.update({
    where: { id },
    data: {
      item: data.item || item.item,
      quantity: data.quantity,
      unit: data.unit,
      category: data.category,
      isPurchased: data.isPurchased !== undefined ? data.isPurchased : item.isPurchased,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getServerAuth();

  if (!auth) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;

  const item = await prisma.shoppingList.findUnique({
    where: { id },
  });

  if (!item || item.userId !== auth.userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.shoppingList.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
