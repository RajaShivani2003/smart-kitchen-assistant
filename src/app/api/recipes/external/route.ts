import { NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/server-auth';
import { prisma } from '@/lib/prisma';

const categories = ['Chicken', 'Beef', 'Pasta', 'Vegetarian', 'Seafood', 'Starter', 'Side Dish', 'Goat', 'Italian', 'French', 'Thai'];

export async function GET(req: Request) {
  const auth = await getServerAuth();
  if (!auth) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const seed = searchParams.get('seed');

  if (seed === 'true') {
    return await seedExternalRecipes();
  }

  const recipes = await prisma.recipe.findMany({
    where: { source: 'external' },
    include: { recipeIngredients: true },
    take: 100,
  });

  return NextResponse.json({
    count: recipes.length,
    recipes: recipes.map(r => ({
      id: `external_${r.externalId}`,
      title: r.title,
      description: r.description,
      cuisine: r.cuisine,
      mealType: r.mealType,
      cookingTime: r.cookingTime,
      servings: r.servings,
      difficulty: r.difficulty,
      nutritionalInfo: r.nutritionalInfo,
      image: r.image,
      recipeIngredients: r.recipeIngredients,
      source: 'external',
    })),
  });
}

async function seedExternalRecipes() {
  try {
    const seen = new Set<string>();
    const allMeals: any[] = [];

    for (const category of categories) {
      try {
        const url = `https://www.themealdb.com/api/json/v1/1/filter.php?c=${category}`;
        const res = await fetch(url);
        if (!res.ok) continue;
        const data = await res.json();
        const meals = data.meals || [];
        for (const meal of meals) {
          if (!seen.has(meal.idMeal)) {
            seen.add(meal.idMeal);
            allMeals.push(meal);
          }
        }
      } catch (e) {
        // skip failed category
      }
    }

    let created = 0;
    let skipped = 0;

    for (const meal of allMeals.slice(0, 200)) {
      const strIngredient1 = meal.strIngredient1;
      if (!strIngredient1) continue;

      const ingredients: any[] = [];
      let i = 1;
      while (meal[`strIngredient${i}`]) {
        ingredients.push({
          ingredient: meal[`strIngredient${i}`],
          quantity: meal[`strMeasure${i}`] || '',
          unit: '',
        });
        i++;
      }

      const nutrition = JSON.stringify({
        calories: Math.floor(Math.random() * 400) + 200,
        protein: Math.floor(Math.random() * 30) + 5,
        carbs: Math.floor(Math.random() * 50) + 10,
        fat: Math.floor(Math.random() * 25) + 5,
      });

      try {
        await prisma.recipe.create({
          data: {
            externalId: meal.idMeal,
            title: meal.strMeal,
            description: meal.strInstructions.substring(0, 300),
            cuisine: meal.strArea || 'International',
            mealType: meal.strCategory || 'Dinner',
            cookingTime: Math.floor(Math.random() * 40) + 15,
            servings: 2,
            difficulty: 'Medium',
            nutritionalInfo: nutrition,
            image: meal.strImageThumb,
            source: 'external',
            recipeIngredients: {
              create: ingredients.map(ing => ({
                ingredient: ing.ingredient,
                quantity: ing.quantity,
                unit: ing.unit,
              })),
            },
          },
        });
        created++;
      } catch (e: any) {
        if (e.code === 'P2002') {
          skipped++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      fetched: allMeals.length,
      created,
      skipped,
      message: `Created ${created} recipes, skipped ${skipped} duplicates`,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
