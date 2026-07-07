import { NextResponse } from 'next/server';
import { getApiAuth } from '@/lib/server-auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const auth = await getApiAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { recipeId, collectionId } = body;

    if (!recipeId || !collectionId) {
      return NextResponse.json({ error: 'Recipe ID and Collection ID are required' }, { status: 400 });
    }

    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
    });

    if (!collection || collection.userId !== auth.userId) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    const savedRecipe = await prisma.savedRecipe.findUnique({
      where: {
        userId_recipeId: {
          userId: auth.userId,
          recipeId,
        },
      },
    });

    if (!savedRecipe) {
      return NextResponse.json({ error: 'Recipe not saved yet' }, { status: 404 });
    }

    const updated = await prisma.savedRecipe.update({
      where: { id: savedRecipe.id },
      data: { collectionId },
      include: {
        recipe: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to add to collection:', error);
    return NextResponse.json({ error: 'Failed to add to collection' }, { status: 500 });
  }
}
