import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const mealType = searchParams.get('mealType');
    const cuisine = searchParams.get('cuisine');
    const difficulty = searchParams.get('difficulty');

    let recipes = await prisma.recipe.findMany({
      include: { recipeIngredients: true, recipeSteps: true },
      orderBy: { createdAt: 'desc' },
    });

    // Case-insensitive search in JavaScript
    if (search) {
      const s = search.toLowerCase();
      recipes = recipes.filter(r =>
        r.title.toLowerCase().includes(s) || r.description.toLowerCase().includes(s)
      );
    }
    if (mealType && mealType !== 'All') {
      recipes = recipes.filter(r => r.mealType.toLowerCase() === mealType.toLowerCase());
    }
    if (cuisine && cuisine !== 'All') {
      recipes = recipes.filter(r => r.cuisine.toLowerCase() === cuisine.toLowerCase());
    }
    if (difficulty && difficulty !== 'All') {
      recipes = recipes.filter(r => r.difficulty.toLowerCase() === difficulty.toLowerCase());
    }

    return NextResponse.json(recipes);
  } catch (error) {
    console.error('Recipes API error:', error);
    return NextResponse.json({ error: 'Failed to fetch recipes' }, { status: 500 });
  }
}
