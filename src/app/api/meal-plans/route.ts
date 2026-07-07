import { NextResponse } from 'next/server';
import { getApiAuth } from '@/lib/server-auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const auth = await getApiAuth(req);

  if (!auth) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const weekStart = searchParams.get('weekStart');

  const where: any = {
    user: { email: auth.email },
  };

  if (weekStart) {
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    where.date = { gte: start, lt: end };
  }

  const mealPlans = await prisma.mealPlan.findMany({
    where,
    orderBy: { date: 'asc' },
  });

  // Fetch recipes separately to handle deleted recipes gracefully
  const recipeIds = mealPlans.map(mp => mp.recipeId).filter(Boolean);
  const recipes = recipeIds.length > 0
    ? await prisma.recipe.findMany({
        where: { id: { in: recipeIds } },
        include: { recipeIngredients: true },
      })
    : [];

  const recipeMap = new Map(recipes.map(r => [r.id, r]));

  const validPlans = mealPlans
    .filter(mp => recipeMap.has(mp.recipeId))
    .map(mp => ({
      ...mp,
      recipe: recipeMap.get(mp.recipeId),
    }));

  return NextResponse.json(validPlans);
}

export async function POST(req: Request) {
  const auth = await getApiAuth(req);

  if (!auth) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const data = await req.json();

  if (!data.date || !data.mealType || !data.recipeId) {
    return NextResponse.json(
      { error: 'Date, meal type, and recipe ID are required' },
      { status: 400 }
    );
  }

  const existing = await prisma.mealPlan.findFirst({
    where: {
      user: { email: auth.email },
      date: new Date(data.date),
      mealType: data.mealType,
    },
  });

  if (existing) {
    await prisma.mealPlan.update({
      where: { id: existing.id },
      data: { recipeId: data.recipeId },
    });
    return NextResponse.json({ updated: true });
  }

  const mealPlan = await prisma.mealPlan.create({
    data: {
      userId: auth.userId,
      date: new Date(data.date),
      mealType: data.mealType,
      recipeId: data.recipeId,
    },
  });

  return NextResponse.json(mealPlan);
}
