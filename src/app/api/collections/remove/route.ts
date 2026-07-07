import { NextResponse } from 'next/server';
import { getApiAuth } from '@/lib/server-auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(request: Request) {
  try {
    const auth = await getApiAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const savedRecipeId = searchParams.get('savedRecipeId');

    if (!savedRecipeId) {
      return NextResponse.json({ error: 'Saved Recipe ID is required' }, { status: 400 });
    }

    const savedRecipe = await prisma.savedRecipe.findUnique({
      where: { id: savedRecipeId },
    });

    if (!savedRecipe || savedRecipe.userId !== auth.userId) {
      return NextResponse.json({ error: 'Saved recipe not found' }, { status: 404 });
    }

    const updated = await prisma.savedRecipe.update({
      where: { id: savedRecipeId },
      data: { collectionId: null },
      include: {
        recipe: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to remove from collection:', error);
    return NextResponse.json({ error: 'Failed to remove from collection' }, { status: 500 });
  }
}
