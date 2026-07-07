import { NextResponse } from 'next/server';
import { getApiAuth } from '@/lib/server-auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const auth = await getApiAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const collectionId = searchParams.get('collectionId');

    if (collectionId) {
      const collection = await prisma.collection.findUnique({
        where: { id: collectionId },
      });

      if (!collection || collection.userId !== auth.userId) {
        return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
      }

      // Fetch saved recipes for this collection separately
      const savedRecipes = await prisma.savedRecipe.findMany({
        where: { collectionId },
        select: {
          id: true,
          recipeId: true,
          savedAt: true,
          collectionId: true,
        },
      });

      const recipeIds = savedRecipes.map((sr) => sr.recipeId);
      const recipes = recipeIds.length > 0
        ? await prisma.recipe.findMany({
            where: { id: { in: recipeIds } },
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
          })
        : [];

      const recipeMap = new Map(recipes.map((r) => [r.id, r]));

      const enrichedSavedRecipes = savedRecipes
        .map((sr) => ({ ...sr, recipe: recipeMap.get(sr.recipeId) }))
        .filter((sr) => sr.recipe != null);

      return NextResponse.json({ ...collection, savedRecipes: enrichedSavedRecipes });
    }

    const collections = await prisma.collection.findMany({
      where: { userId: auth.userId },
      select: {
        id: true,
        name: true,
        description: true,
        userId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch all saved recipes for all collections in one query
    const allSavedRecipes = await prisma.savedRecipe.findMany({
      where: {
        collectionId: { in: collections.map((c) => c.id) },
      },
      select: {
        id: true,
        recipeId: true,
        savedAt: true,
        collectionId: true,
      },
    });

    const recipeIds = allSavedRecipes.map((sr) => sr.recipeId);
    const recipes = recipeIds.length > 0
      ? await prisma.recipe.findMany({
          where: { id: { in: recipeIds } },
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
        })
      : [];

    const recipeMap = new Map(recipes.map((r) => [r.id, r]));

    // Group saved recipes by collectionId
    const savedRecipesByCollection = new Map<string, any[]>();
    allSavedRecipes.forEach((sr) => {
      const enriched = { ...sr, recipe: recipeMap.get(sr.recipeId) };
      if (enriched.recipe != null) {
        const key = sr.collectionId || '__uncategorized__';
        if (!savedRecipesByCollection.has(key)) {
          savedRecipesByCollection.set(key, []);
        }
        savedRecipesByCollection.get(key)!.push(enriched);
      }
    });

    const result = collections.map((c) => ({
      ...c,
      savedRecipes: savedRecipesByCollection.get(c.id) || [],
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to fetch collections:', error);
    return NextResponse.json({ error: 'Failed to fetch collections' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getApiAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const collection = await prisma.collection.create({
      data: {
        userId: auth.userId,
        name,
        description: description || null,
      },
    });

    return NextResponse.json(collection, { status: 201 });
  } catch (error) {
    console.error('Failed to create collection:', error);
    return NextResponse.json({ error: 'Failed to create collection' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await getApiAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, description } = body;

    if (!id) {
      return NextResponse.json({ error: 'Collection ID is required' }, { status: 400 });
    }

    const collection = await prisma.collection.findUnique({
      where: { id },
    });

    if (!collection || collection.userId !== auth.userId) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    const updated = await prisma.collection.update({
      where: { id },
      data: {
        name: name || collection.name,
        description: description !== undefined ? description : collection.description,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update collection:', error);
    return NextResponse.json({ error: 'Failed to update collection' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await getApiAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Collection ID is required' }, { status: 400 });
    }

    const collection = await prisma.collection.findUnique({
      where: { id },
    });

    if (!collection || collection.userId !== auth.userId) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    await prisma.collection.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete collection:', error);
    return NextResponse.json({ error: 'Failed to delete collection' }, { status: 500 });
  }
}
