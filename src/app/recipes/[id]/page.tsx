import { notFound } from 'next/navigation';
import { getServerAuth } from '@/lib/server-auth';
import { prisma } from '@/lib/prisma';
import RecipeDetailPageClient from './RecipeDetailPageClient';

interface RecipeDetailPageProps {
  params: { id: string };
}

export default async function RecipeDetailPage({ params }: RecipeDetailPageProps) {
  const auth = await getServerAuth();
  const recipe = await prisma.recipe.findUnique({
    where: { id: params.id },
    include: {
      recipeIngredients: true,
      recipeSteps: { orderBy: { stepNumber: 'asc' } },
      reviews: {
        include: { user: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!recipe) {
    notFound();
  }

  const isSaved = auth
    ? await prisma.savedRecipe.findUnique({
        where: {
          userId_recipeId: {
            userId: auth.userId,
            recipeId: recipe.id,
          },
        },
      })
    : false;

  const clientRecipe = {
    ...recipe,
    recipeIngredients: recipe.recipeIngredients.map((i: any) => ({
      ...i,
      unit: i.unit ?? undefined,
    })),
  };

  return (
    <RecipeDetailPageClient recipe={clientRecipe} isSaved={!!isSaved} />
  );
}
