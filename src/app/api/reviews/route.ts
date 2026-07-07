import { NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/server-auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export async function GET(req: Request) {
  const auth = await getServerAuth();

  if (!auth) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const recipeId = searchParams.get('recipeId');

  if (!recipeId) {
    return NextResponse.json({ error: 'Recipe ID is required' }, { status: 400 });
  }

  const reviews = await prisma.review.findMany({
    where: { recipeId },
    include: {
      user: { select: { id: true, name: true, image: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  return NextResponse.json({ reviews, averageRating: Math.round(averageRating * 10) / 10 });
}

export async function POST(req: Request) {
  const auth = await getServerAuth();

  if (!auth) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const schema = z.object({
    recipeId: z.string(),
    rating: z.number().int().min(1).max(5),
    comment: z.string().optional(),
  });

  const validation = schema.safeParse(await req.json());

  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.message },
      { status: 400 }
    );
  }

  const existing = await prisma.review.findFirst({
    where: {
      userId: auth.userId,
      recipeId: validation.data.recipeId,
    },
  });

  if (existing) {
    const updated = await prisma.review.update({
      where: { id: existing.id },
      data: validation.data,
    });
    return NextResponse.json(updated);
  }

  const review = await prisma.review.create({
    data: {
      userId: auth.userId,
      ...validation.data,
    },
  });

  return NextResponse.json(review);
}
