import { NextResponse } from 'next/server';
import { getApiAuth } from '@/lib/server-auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getApiAuth(req);

  if (!auth) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const data = await req.json();

  const collection = await prisma.collection.findUnique({ where: { id } });

  if (!collection || collection.userId !== auth.userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const updated = await prisma.collection.update({
    where: { id },
    data: {
      name: data.name || collection.name,
      description: data.description || collection.description,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getApiAuth(req);

  if (!auth) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;

  const collection = await prisma.collection.findUnique({ where: { id } });

  if (!collection || collection.userId !== auth.userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.collection.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
