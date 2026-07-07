import { NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/server-auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const auth = await getServerAuth();
  if (!auth) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: auth.email },
    include: { userRecipes: { include: { recipeIngredients: true, recipeSteps: true } } },
  });

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  return NextResponse.json(user.userRecipes);
}

export async function POST(req: Request) {
  const auth = await getServerAuth();
  if (!auth) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: auth.email },
  });

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const body = await req.json();
  const { title, description, cuisine, mealType, cookingTime, servings, difficulty, nutritionalInfo, image, youtubeUrl, ingredients, steps } = body;

  if (!title || !mealType || !nutritionalInfo) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const recipe = await prisma.userRecipe.create({
    data: {
      userId: user.id,
      title,
      description: description || '',
      cuisine: cuisine || 'Other',
      mealType,
      cookingTime: parseInt(cookingTime) || 30,
      servings: parseInt(servings) || 2,
      difficulty: difficulty || 'Medium',
      nutritionalInfo,
      image: image || null,
      youtubeUrl: youtubeUrl || null,
      recipeIngredients: {
        create: (ingredients || []).map((ing: any, idx: number) => ({
          ingredient: ing.ingredient,
          quantity: ing.quantity || '',
          unit: ing.unit || '',
        })),
      },
      recipeSteps: {
        create: (steps || []).map((step: any, idx: number) => ({
          stepNumber: idx + 1,
          instruction: step.instruction,
          estimatedTime: step.estimatedTime ? parseInt(step.estimatedTime) : null,
        })),
      },
    },
    include: { recipeIngredients: true, recipeSteps: true },
  });

  return NextResponse.json(recipe);
}
