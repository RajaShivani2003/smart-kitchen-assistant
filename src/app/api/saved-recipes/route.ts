import { NextResponse } from 'next/server';
import { getApiAuth } from '@/lib/server-auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export async function GET(req: Request) {
  const auth = await getApiAuth(req);

  if (!auth) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const savedRecipes = await prisma.savedRecipe.findMany({
    where: { user: { email: auth.email } },
    select: {
      id: true,
      recipeId: true,
      collectionId: true,
      savedAt: true,
      collection: { select: { id: true, name: true } },
    },
    orderBy: { savedAt: 'desc' },
  });

  // Fetch recipe data separately, skipping any orphaned records
  const recipes = await prisma.recipe.findMany({
    where: {
      id: { in: savedRecipes.map((s) => s.recipeId) },
    },
    select: {
      id: true,
      title: true,
      description: true,
      image: true,
      cuisine: true,
      mealType: true,
      cookingTime: true,
      servings: true,
      difficulty: true,
      nutritionalInfo: true,
      recipeIngredients: true,
    },
  });

  const recipeMap = new Map(recipes.map((r) => [r.id, r]));

  const result = savedRecipes
    .map((s) => ({ ...s, recipe: recipeMap.get(s.recipeId) }))
    .filter((s) => s.recipe != null);

  return NextResponse.json(result);
}

export async function DELETE(req: Request) {
  const auth = await getApiAuth(req);

  if (!auth) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const recipeId = searchParams.get('recipeId');

  if (!recipeId) {
    return NextResponse.json({ error: 'Recipe ID required' }, { status: 400 });
  }

  await prisma.savedRecipe.deleteMany({
    where: {
      user: { email: auth.email },
      recipeId,
    },
  });

  return NextResponse.json({ success: true });
}

export async function POST(req: Request) {
  const auth = await getApiAuth(req);

  if (!auth) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const schema = z.object({
    recipeId: z.string(),
    collectionId: z.string().optional(),
  });

  const validation = schema.safeParse(await req.json());

  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.message },
      { status: 400 }
    );
  }

  const existing = await prisma.savedRecipe.findFirst({
    where: {
      user: { email: auth.email },
      recipeId: validation.data.recipeId,
    },
  });

  if (existing) {
    const updated = await prisma.savedRecipe.update({
      where: { id: existing.id },
      data: { collectionId: validation.data.collectionId || null },
    });
    return NextResponse.json(updated);
  }

  const saved = await prisma.savedRecipe.create({
    data: {
      user: { connect: { email: auth.email } },
      recipe: { connect: { id: validation.data.recipeId } },
      ...(validation.data.collectionId && { collection: { connect: { id: validation.data.collectionId } } }),
    },
  });

  return NextResponse.json(saved);
}
