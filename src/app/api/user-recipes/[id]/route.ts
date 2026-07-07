import { NextResponse } from 'next/server';
import { getApiAuth } from '@/lib/server-auth';
import { prisma } from '@/lib/prisma';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await getApiAuth(req);
  if (!auth) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: auth.email },
  });

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const recipe = await prisma.userRecipe.findUnique({
    where: { id },
  });

  if (!recipe || recipe.userId !== user.id) {
    return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
  }

  const body = await req.json();
  const { title, description, cuisine, mealType, cookingTime, servings, difficulty, nutritionalInfo, image, ingredients, steps } = body;

  const updated = await prisma.userRecipe.update({
    where: { id },
    data: {
      title,
      description: description || '',
      cuisine: cuisine || 'Other',
      mealType,
      cookingTime: parseInt(cookingTime) || 30,
      servings: parseInt(servings) || 2,
      difficulty: difficulty || 'Medium',
      nutritionalInfo,
      image: image || null,
    },
  });

  await prisma.userRecipeIngredient.deleteMany({ where: { userRecipeId: id } });
  await prisma.userRecipeIngredient.createMany({
    data: (ingredients || []).map((ing: any) => ({
      userRecipeId: id,
      ingredient: ing.ingredient,
      quantity: ing.quantity || '',
      unit: ing.unit || '',
    })),
  });

  await prisma.userRecipeStep.deleteMany({ where: { userRecipeId: id } });
  await prisma.userRecipeStep.createMany({
    data: (steps || []).map((step: any, idx: number) => ({
      userRecipeId: id,
      stepNumber: idx + 1,
      instruction: step.instruction,
      estimatedTime: step.estimatedTime ? parseInt(step.estimatedTime) : null,
    })),
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await getApiAuth(req);
  if (!auth) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: auth.email },
  });

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const recipe = await prisma.userRecipe.findUnique({
    where: { id },
  });

  if (!recipe || recipe.userId !== user.id) {
    return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
  }

  await prisma.userRecipe.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
