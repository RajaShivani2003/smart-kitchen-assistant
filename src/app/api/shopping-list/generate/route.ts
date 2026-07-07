import { NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/server-auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const auth = await getServerAuth();

  if (!auth) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { weekStart } = await req.json();

  if (!weekStart) {
    return NextResponse.json(
      { error: 'Week start date is required' },
      { status: 400 }
    );
  }

  const start = new Date(weekStart);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);

  const mealPlans = await prisma.mealPlan.findMany({
    where: {
      user: { email: auth.email },
      date: {
        gte: start,
        lte: end,
      },
    },
  });

  const mealPlanIds = mealPlans.map(mp => mp.id);
  const mealPlanRecipeIds = mealPlans.map(mp => mp.recipeId).filter(Boolean);

  const recipes = mealPlanRecipeIds.length > 0
    ? await prisma.recipe.findMany({
        where: { id: { in: mealPlanRecipeIds } },
        include: { recipeIngredients: true },
      })
    : [];

  const recipeMap = new Map(recipes.map(r => [r.id, r]));

  // Attach recipes to meal plans
  const mealPlansWithRecipes = mealPlans.map(mp => ({
    ...mp,
    recipe: recipeMap.get(mp.recipeId) || null,
  }));

  const pantryIngredients = await prisma.ingredient.findMany({
    where: {
      user: { email: auth.email },
    },
  });

  const pantryNames = new Set(pantryIngredients.map((i) => i.name.toLowerCase().trim()));

  // Build a set of all shopping list item names (normalized), stripping "Auto-generated:" prefix if present
  const existingLists = await prisma.shoppingList.findMany({
    where: {
      user: { email: auth.email },
    },
  });

  const existingItemNames = new Set<string>();
  const existingItemMap = new Map<string, string>(); // normalized ingredient name -> shopping list item id

  for (const item of existingLists) {
    const normalized = item.item.toLowerCase().trim();
    // Strip "Auto-generated:" prefix for matching
    const cleanName = normalized.replace(/^auto-generated:\s*/i, '').trim();
    existingItemNames.add(normalized);
    existingItemNames.add(cleanName);
    existingItemMap.set(cleanName, item.id);
  }

  const ingredientMap = new Map<string, { quantity: string; unit?: string; category: string }>();

  for (const plan of mealPlansWithRecipes) {
    if (!plan.recipe) continue;
    for (const ri of plan.recipe.recipeIngredients) {
      const key = ri.ingredient.toLowerCase().trim();
      if (!pantryNames.has(key) && !ingredientMap.has(key)) {
        ingredientMap.set(key, {
          quantity: ri.quantity,
          unit: ri.unit || '',
          category: 'Other',
        });
      }
    }
  }

  const createdItems: typeof existingLists[number][] = [];

  for (const [ingredient, data] of ingredientMap) {
    const displayName = ingredient.charAt(0).toUpperCase() + ingredient.slice(1);
    const itemId = existingItemMap.get(ingredient);

    if (itemId) {
      const updated = await prisma.shoppingList.update({
        where: { id: itemId },
        data: {
          quantity: data.quantity || null,
          unit: data.unit || null,
          category: data.category,
        },
      });
      createdItems.push(updated);
    } else {
      const created = await prisma.shoppingList.create({
        data: {
          user: { connect: { email: auth.email } },
          item: displayName,
          quantity: data.quantity || null,
          unit: data.unit || null,
          category: data.category,
        },
      });
      createdItems.push(created);
    }
  }

  const allLists = await prisma.shoppingList.findMany({
    where: {
      user: { email: auth.email },
    },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({ generated: allLists.length });
}
