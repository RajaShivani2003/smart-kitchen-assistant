'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useCachedFetch } from '@/hooks/useCachedFetch';
import Navbar from '@/components/Navbar';
import { Heart, Clock, Star, Trash2, FolderOpen } from 'lucide-react';
import Link from 'next/link';

interface SavedRecipe {
  id: string;
  savedAt: string;
  recipe: {
    id: string;
    title: string;
    description: string;
    cuisine: string;
    mealType: string;
    cookingTime: number;
    servings: number;
    difficulty: string;
    image: string | null;
    recipeIngredients: { ingredient: string; quantity: string; unit?: string }[];
  };
  collection: {
    id: string;
    name: string;
  } | null;
}

export const dynamic = 'force-dynamic';

function SavedRecipesContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState<SavedRecipe | null>(null);
  const [removeLoading, setRemoveLoading] = useState<string | null>(null);

  const { data: recipesData, loading: recipesLoading, refresh: refreshRecipes } = useCachedFetch<SavedRecipe[]>('/api/saved-recipes');

  useEffect(() => {
    if (recipesData) setSavedRecipes(recipesData);
  }, [recipesData]);

  useEffect(() => {
    if (!user && !authLoading) {
      router.push('/login');
    }
    if (user) {
      setLoading(true);
      refreshRecipes().finally(() => setLoading(false));
    }
  }, [authLoading, user]);

  const handleRemove = async (recipeId: string) => {
    if (!confirm('Remove this recipe from saved?')) return;
    setRemoveLoading(recipeId);
    try {
      const res = await fetch(`/api/saved-recipes?recipeId=${recipeId}`, { method: 'DELETE' });
      if (res.ok) {
        setSavedRecipes(prev => prev.filter(r => r.recipe.id !== recipeId));
        refreshRecipes();
      }
    } catch (e) {
      alert('Failed to remove recipe');
    } finally {
      setRemoveLoading(null);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
            <Heart className="w-8 h-8 text-orange-500" />
            Saved Recipes
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-2">
            {savedRecipes.length} recipe{savedRecipes.length !== 1 ? 's' : ''} saved
          </p>
        </div>

        {savedRecipes.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-zinc-800 rounded-2xl shadow-lg">
            <Heart className="w-16 h-16 text-zinc-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">No saved recipes yet</h3>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">Start saving recipes you love!</p>
            <Link href="/recipes" className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 transition-colors">
              <Heart className="w-5 h-5" />
              Browse Recipes
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedRecipes.map((saved) => {
              if (!saved.recipe) return null;
              return (
              <div
                key={saved.id}
                className="bg-white dark:bg-zinc-800 rounded-xl overflow-hidden shadow-sm border border-zinc-200 dark:border-zinc-700 hover:shadow-lg transition-shadow"
              >
                <div
                  className="h-48 bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 flex items-center justify-center cursor-pointer"
                  onClick={() => setSelectedRecipe(saved)}
                >
                  <span className="text-6xl">
                    {saved.recipe.mealType === 'Breakfast' ? '🌅' :
                     saved.recipe.mealType === 'Lunch' ? '☀️' :
                     saved.recipe.mealType === 'Dinner' ? '🌙' :
                     saved.recipe.mealType === 'Snacks' ? '🍿' : '🍰'}
                  </span>
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2 cursor-pointer hover:text-orange-500" onClick={() => setSelectedRecipe(saved)}>
                    {saved.recipe.title}
                  </h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 mb-3">
                    {saved.recipe.description}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-500 mb-3">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{saved.recipe.cookingTime}m</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4" />
                      <span>{saved.recipe.servings} servings</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      saved.recipe.difficulty === 'Easy' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      saved.recipe.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {saved.recipe.difficulty}
                    </span>
                    {saved.collection && (
                      <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                        <FolderOpen className="w-3 h-3" />
                        <span>{saved.collection.name}</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemove(saved.recipe.id)}
                    disabled={removeLoading === saved.id}
                    className="mt-3 w-full py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    {removeLoading === saved.id ? 'Removing...' : 'Remove'}
                  </button>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recipe Detail Modal */}
      {selectedRecipe && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="h-64 bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 flex items-center justify-center relative">
              <span className="text-8xl">
                {selectedRecipe.recipe.mealType === 'Breakfast' ? '🌅' :
                 selectedRecipe.recipe.mealType === 'Lunch' ? '☀️' :
                 selectedRecipe.recipe.mealType === 'Dinner' ? '🌙' :
                 selectedRecipe.recipe.mealType === 'Snacks' ? '🍿' : '🍰'}
              </span>
              <button
                onClick={() => setSelectedRecipe(null)}
                className="absolute top-4 right-4 p-2 bg-white/80 dark:bg-zinc-800/80 rounded-full text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">{selectedRecipe.recipe.title}</h2>
              <p className="text-zinc-600 dark:text-zinc-400 mb-4">{selectedRecipe.recipe.description}</p>

              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                  <Clock className="w-4 h-4" />
                  <span>{selectedRecipe.recipe.cookingTime} minutes</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                  <Star className="w-4 h-4" />
                  <span>{selectedRecipe.recipe.servings} servings</span>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full ${
                  selectedRecipe.recipe.difficulty === 'Easy' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                  selectedRecipe.recipe.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {selectedRecipe.recipe.difficulty}
                </span>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-3">Ingredients</h3>
                <ul className="space-y-2">
                  {selectedRecipe.recipe.recipeIngredients.map((ing, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                      <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0" />
                      <span>{ing.quantity} {ing.unit} {ing.ingredient}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {selectedRecipe.collection && (
                <div className="mb-6 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-orange-500" />
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    Saved in <strong>{selectedRecipe.collection.name}</strong>
                  </span>
                </div>
              )}

              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                Saved on {new Date(selectedRecipe.savedAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SavedRecipesPage() {
  return <SavedRecipesContent />;
}
