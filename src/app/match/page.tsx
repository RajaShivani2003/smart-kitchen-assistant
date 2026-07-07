'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useCachedFetch } from '@/hooks/useCachedFetch';
import { useRouter } from 'next/navigation';
import { ChefHat, Clock, Star, AlertCircle, Heart, CheckCircle2, XCircle, ExternalLink, User, BookOpen, Calendar, Send, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

interface MatchedRecipe {
  id: string;
  title: string;
  description: string;
  cuisine: string;
  mealType: string;
  cookingTime: number;
  servings: number;
  difficulty: string;
  nutritionalInfo: string;
  recipeIngredients: Array<{ ingredient: string; quantity: string; unit?: string }>;
  recipeSteps?: Array<{ stepNumber: number; instruction: string; estimatedTime?: number }>;
  matchPercentage: number;
  matchedIngredients: string[];
  missingIngredients: string[];
  missingPreferredIngredients?: string[];
  tier?: number;
  image?: string | null;
  youtubeUrl?: string;
  source: 'catalog' | 'external' | 'user' | 'generated';
  externalId?: string;
}

function MatchRecipesContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [recipes, setRecipes] = useState<MatchedRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [mealType, setMealType] = useState('All');
  const [dietary, setDietary] = useState('All');
  const [includeExternal, setIncludeExternal] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState<MatchedRecipe | null>(null);
  const [selectedMealPlan, setSelectedMealPlan] = useState<Record<string, MatchedRecipe>>({});
  const [showMealPlan, setShowMealPlan] = useState(false);
  const [addingToShopping, setAddingToShopping] = useState<string | null>(null);
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());
  const [confirmItem, setConfirmItem] = useState<{ ingredient: string; recipeTitle: string } | null>(null);

  const addToShoppingList = async (ingredient: string) => {
    setAddingToShopping(ingredient);
    try {
      await fetch('/api/shopping-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: ingredient }),
      });
      setAddedItems(prev => new Set(prev).add(ingredient));
    } catch (error) {
      console.error('Failed to add to shopping list:', error);
    } finally {
      setAddingToShopping(null);
      setConfirmItem(null);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
  }, [authLoading, user]);

  const matchUrl = `/api/recipes/match?mealType=${mealType}&dietary=${dietary}&external=${includeExternal}`;
  const { data: recipesData, loading: fetchLoading } = useCachedFetch<MatchedRecipe[]>(matchUrl);

  const getMatchColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400';
    if (percentage >= 50) return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400';
    if (percentage >= 20) return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400';
    return 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400';
  };

  const getMatchLabel = (percentage: number) => {
    if (percentage >= 80) return 'Almost all ingredients!';
    if (percentage >= 50) return 'Most ingredients available';
    if (percentage >= 20) return 'Some ingredients missing';
    return 'Many ingredients missing';
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'catalog':
        return <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center gap-1"><BookOpen className="w-3 h-3" />Catalog</span>;
      case 'external':
        return <span className="px-2 py-0.5 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full flex items-center gap-1"><ExternalLink className="w-3 h-3" />External</span>;
      case 'user':
        return <span className="px-2 py-0.5 text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center gap-1"><User className="w-3 h-3" />Your Recipe</span>;
      case 'generated':
        return <span className="px-2 py-0.5 text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full flex items-center gap-1"><ChefHat className="w-3 h-3" />Generated</span>;
    }
  };

  const getTierBadge = (tier?: number) => {
    if (!tier) return null;
    switch (tier) {
      case 1:
        return <span className="px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full font-semibold">🟢 Cook Now</span>;
      case 2:
        return <span className="px-2 py-0.5 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-full font-semibold">🟡 Buy 1-2 Items</span>;
      case 3:
        return <span className="px-2 py-0.5 text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full font-semibold">🟠 Buy More</span>;
      case 4:
        return <span className="px-2 py-0.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full font-semibold">🔴 Inspiration</span>;
    }
  };

  const mealSlots = ['Breakfast', 'Lunch', 'Dinner'];

  const isRecipeSelected = (recipeId: string) => {
    return Object.values(selectedMealPlan).some(r => r.id === recipeId);
  };

  const getMealForRecipe = (recipeId: string) => {
    for (const [meal, recipe] of Object.entries(selectedMealPlan)) {
      if (recipe.id === recipeId) return meal;
    }
    return null;
  };

  const assignRecipeToMeal = (recipe: MatchedRecipe, meal: string) => {
    setSelectedMealPlan(prev => {
      const updated = { ...prev };
      for (const [key, val] of Object.entries(updated)) {
        if (val.id === recipe.id) {
          delete updated[key];
          break;
        }
      }
      updated[meal] = recipe;
      return updated;
    });
  };

  const removeRecipeFromMeal = (meal: string) => {
    setSelectedMealPlan(prev => {
      const updated = { ...prev };
      delete updated[meal];
      return updated;
    });
  };

  const generateWhatsAppMessage = () => {
    const entries = Object.entries(selectedMealPlan);
    if (entries.length === 0) return '';

    let message = '🍳 *My Meal Plan*\n\n';

    entries.forEach(([meal, recipe]) => {
      message += `*${meal}*\n`;
      message += `📌 ${recipe.title}\n`;
      message += `⏱️ ${recipe.cookingTime} min | 🍽️ ${recipe.servings} servings | ${recipe.difficulty}\n`;
      message += `📊 ${recipe.matchPercentage}% match\n`;

      if (recipe.missingIngredients.length > 0) {
        message += `❌ Missing: ${recipe.missingIngredients.join(', ')}\n`;
      }
      if (recipe.missingPreferredIngredients && recipe.missingPreferredIngredients.length > 0) {
        message += `  (Optional: ${recipe.missingPreferredIngredients.join(', ')})\n`;
      }

      if (recipe.recipeIngredients && recipe.recipeIngredients.length > 0) {
        message += `🥕 Ingredients:\n`;
        recipe.recipeIngredients.forEach(ri => {
          message += `  • ${ri.quantity} ${ri.unit} ${ri.ingredient}\n`;
        });
      }

      if (recipe.recipeSteps && recipe.recipeSteps.length > 0) {
        message += `📝 Steps:\n`;
        recipe.recipeSteps.forEach(step => {
          message += `  ${step.stepNumber}. ${step.instruction}\n`;
        });
      }

      message += '\n';
    });

    message += '---\nSent from Smart Kitchen Assistant';
    return message;
  };

  const shareToWhatsApp = () => {
    const message = generateWhatsAppMessage();
    if (!message) return;

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  const getSelectedCount = () => {
    return Object.keys(selectedMealPlan).length;
  };

  const parseNutrition = (info: string) => {
    try {
      return JSON.parse(info);
    } catch {
      return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    }
  };

  const matchedRecipes = recipesData || [];
  const isFetching = fetchLoading || authLoading;

  if (isFetching) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-zinc-900 dark:to-zinc-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-zinc-600 dark:text-zinc-400">Finding recipes you can cook...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-zinc-900 dark:to-zinc-800">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/dashboard" className="text-orange-500 hover:text-orange-600 text-sm mb-4 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
            <ChefHat className="w-8 h-8 text-orange-500" />
            What Can You Cook Today?
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-2">
            Recipes matched with your pantry ingredients
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 shadow-sm border border-zinc-200 dark:border-zinc-700 mb-6">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">Meal Type</label>
              <select
                value={mealType}
                onChange={(e) => setMealType(e.target.value)}
                className="px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
              >
                <option value="All">All Meal Types</option>
                <option value="Breakfast">Breakfast</option>
                <option value="Lunch">Lunch</option>
                <option value="Dinner">Dinner</option>
                <option value="Snacks">Snacks</option>
                <option value="Desserts">Desserts</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">Dietary Preference</label>
              <select
                value={dietary}
                onChange={(e) => setDietary(e.target.value)}
                className="px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
              >
                <option value="All">All Diets</option>
                <option value="vegetarian">Vegetarian</option>
                <option value="vegan">Vegan</option>
                <option value="keto">Keto</option>
                <option value="high-protein">High Protein</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeExternal}
                  onChange={(e) => setIncludeExternal(e.target.checked)}
                  className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                />
                <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Include external recipes</span>
              </label>
            </div>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {matchedRecipes.length} recipe{matchedRecipes.length !== 1 ? 's' : ''} found
          </p>
          {getSelectedCount() > 0 && (
            <button
              onClick={() => setShowMealPlan(!showMealPlan)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Calendar className="w-4 h-4" />
              Meal Plan ({getSelectedCount()})
            </button>
          )}
        </div>

        {showMealPlan && (
          <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-lg border border-zinc-200 dark:border-zinc-700 mb-8">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-orange-500" />
              Your Meal Plan
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {mealSlots.map(meal => {
                const recipe = selectedMealPlan[meal];
                return (
                  <div key={meal} className={`p-4 rounded-lg border-2 transition-colors ${recipe ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-dashed border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-700/50'}`}>
                    <h4 className="font-semibold text-zinc-900 dark:text-white mb-2">{meal}</h4>
                    {recipe ? (
                      <div>
                        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{recipe.title}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{recipe.cookingTime} min • {recipe.matchPercentage}% match</p>
                        <button
                          onClick={() => removeRecipeFromMeal(meal)}
                          className="mt-2 text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
                        >
                          <XCircle className="w-3 h-3" /> Remove
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm text-zinc-400 dark:text-zinc-500">No dish selected</p>
                    )}
                  </div>
                );
              })}
            </div>
            {getSelectedCount() > 0 && (
              <button
                onClick={shareToWhatsApp}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
              >
                <Send className="w-5 h-5" />
                Share to WhatsApp
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {matchedRecipes.map((recipe) => (
            <div
              key={recipe.id}
              className="bg-white dark:bg-zinc-800 rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
              onClick={() => setSelectedRecipe(recipe)}
            >
              {recipe.image && (
                <div className="h-40 bg-cover bg-center" style={{ backgroundImage: `url(${recipe.image})` }} />
              )}
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getSourceBadge(recipe.source)}
                      {getTierBadge(recipe.tier)}
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">{recipe.cuisine}</span>
                    </div>
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white">{recipe.title}</h3>
                    <p className="text-zinc-600 dark:text-zinc-400 text-sm mt-1 line-clamp-2">{recipe.description}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${getMatchColor(recipe.matchPercentage)}`}>
                    {recipe.matchPercentage}%
                  </span>
                </div>

                <div className="flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {recipe.cookingTime} min
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4" />
                    {recipe.difficulty}
                  </span>
                  <span>{recipe.servings} servings</span>
                </div>

                <div className="flex items-center gap-2 text-sm mb-3">
                  {recipe.matchedIngredients.length > 0 && (
                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                      <CheckCircle2 className="w-4 h-4" />
                      {recipe.matchedIngredients.length} have
                    </span>
                  )}
                  {recipe.missingIngredients.length > 0 && (
                    <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                      <XCircle className="w-4 h-4" />
                      {recipe.missingIngredients.length} missing
                    </span>
                  )}
                  {(recipe.missingPreferredIngredients?.length ?? 0) > 0 && (
                    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                      <Star className="w-4 h-4" />
                      {recipe.missingPreferredIngredients!.length} optional
                    </span>
                  )}
                </div>

                {recipe.missingIngredients.length > 0 && recipe.missingIngredients.length <= 3 && (
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    Missing: {recipe.missingIngredients.join(', ')}
                  </div>
                )}

                {(recipe.missingPreferredIngredients?.length ?? 0) > 0 && recipe.missingPreferredIngredients!.length <= 3 && (
                  <div className="text-xs text-zinc-400 dark:text-zinc-500 italic mt-0.5">
                    Optional: {recipe.missingPreferredIngredients!.join(', ')}
                  </div>
                )}

                {recipe.missingIngredients.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Add missing to shopping list:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {recipe.missingIngredients.map((item) => {
                        const isAdded = addedItems.has(item);
                        const isAdding = addingToShopping === item;
                        return (
                          <button
                            key={item}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isAdded) return;
                              setConfirmItem({ ingredient: item, recipeTitle: recipe.title });
                            }}
                            disabled={isAdding || isAdded}
                            className={`flex items-center gap-1 px-2 py-1 text-xs rounded-full transition-colors ${
                              isAdded
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                                : isAdding
                                  ? 'bg-zinc-100 dark:bg-zinc-700 text-zinc-400'
                                  : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30'
                            }`}
                          >
                            {isAdding ? (
                              <div className="animate-spin rounded-full h-3 w-3 border border-red-400 border-t-transparent" />
                            ) : isAdded ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : (
                              <ShoppingCart className="w-3 h-3" />
                            )}
                            {item}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {recipe.youtubeUrl && (
                  <a
                    href={recipe.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 mb-3 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Watch Video
                  </a>
                )}

                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">Assign to meal:</p>
                  <div className="flex gap-2">
                    {mealSlots.map(meal => {
                      const isAssigned = getMealForRecipe(recipe.id) === meal;
                      const isSelected = isRecipeSelected(recipe.id);
                      return (
                        <button
                          key={meal}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isAssigned) {
                              removeRecipeFromMeal(meal);
                            } else {
                              assignRecipeToMeal(recipe, meal);
                            }
                          }}
                          className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                            isAssigned
                              ? 'bg-green-600 text-white'
                              : isSelected
                                ? 'bg-zinc-200 dark:bg-zinc-600 text-zinc-500 dark:text-zinc-400 cursor-default'
                                : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-600'
                          }`}
                        >
                          {isSelected && !isAssigned ? 'Used' : meal}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

          {matchedRecipes.length === 0 && (
          <div className="text-center py-16">
            <AlertCircle className="w-16 h-16 text-zinc-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">No recipes found</h3>
            <p className="text-zinc-600 dark:text-zinc-400">Try adding more ingredients to your pantry</p>
          </div>
        )}

        {selectedRecipe && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedRecipe(null)}>
            <div className="bg-white dark:bg-zinc-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {getSourceBadge(selectedRecipe.source)}
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">{selectedRecipe.cuisine}</span>
                  </div>
                  <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">{selectedRecipe.title}</h2>
                  <p className="text-zinc-600 dark:text-zinc-400 mt-1">{selectedRecipe.description}</p>
                </div>
                <button onClick={() => setSelectedRecipe(null)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-2xl">
                  ×
                </button>
              </div>

              <div className="flex items-center gap-4 mb-6">
                <span className={`px-4 py-2 rounded-full text-lg font-bold ${getMatchColor(selectedRecipe.matchPercentage)}`}>
                  {selectedRecipe.matchPercentage}% Match
                </span>
                <span className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
                  <Clock className="w-4 h-4" />
                  {selectedRecipe.cookingTime} min
                </span>
                <span className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
                  <Star className="w-4 h-4" />
                  {selectedRecipe.difficulty}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-4 mb-6">
                {(() => {
                  const nutrition = parseNutrition(selectedRecipe.nutritionalInfo);
                  return (
                    <>
                      <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                        <p className="text-lg font-bold text-orange-600 dark:text-orange-400">{nutrition.calories}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Calories</p>
                      </div>
                      <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{nutrition.protein}g</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Protein</p>
                      </div>
                      <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <p className="text-lg font-bold text-green-600 dark:text-green-400">{nutrition.carbs}g</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Carbs</p>
                      </div>
                      <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                        <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{nutrition.fat}g</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Fat</p>
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-3">Ingredients</h3>
                <div className="space-y-2">
                  {selectedRecipe.recipeIngredients.map((ri, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      {selectedRecipe.matchedIngredients.includes(ri.ingredient.toLowerCase().trim()) ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      )}
                      <span className="text-zinc-700 dark:text-zinc-300">
                        {ri.quantity} {ri.unit} {ri.ingredient}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {selectedRecipe.recipeSteps && selectedRecipe.recipeSteps.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-3">Instructions</h3>
                  <div className="space-y-3">
                    {selectedRecipe.recipeSteps.map((step) => (
                      <div key={step.stepNumber} className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                          {step.stepNumber}
                        </span>
                        <p className="text-sm text-zinc-700 dark:text-zinc-300">{step.instruction}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedRecipe.youtubeUrl && (
                <div className="mb-6">
                  <a
                    href={selectedRecipe.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                  >
                    <ExternalLink className="w-5 h-5" />
                    Watch Video on YouTube
                  </a>
                </div>
              )}

              {confirmItem && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setConfirmItem(null)}>
                  <div className="bg-white dark:bg-zinc-800 rounded-2xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">Is "{confirmItem.ingredient}" available at home?</h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                      If yes, you don't need to add it to shopping list.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setConfirmItem(null)}
                        className="flex-1 px-4 py-2 bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg font-medium hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
                      >
                        Yes, I have it
                      </button>
                      <button
                        onClick={() => addToShoppingList(confirmItem.ingredient)}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        Add to Shopping List
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {selectedRecipe.missingIngredients.length > 0 && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-medium mb-2">
                    <AlertCircle className="w-4 h-4" />
                    Missing Ingredients
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedRecipe.missingIngredients.map((item) => {
                      const isAdded = addedItems.has(item);
                      const isAdding = addingToShopping === item;
                      return (
                        <button
                          key={item}
                          onClick={() => {
                            if (isAdded) return;
                            setConfirmItem({ ingredient: item, recipeTitle: selectedRecipe.title });
                          }}
                          disabled={isAdding || isAdded}
                          className={`flex items-center gap-1 px-2 py-1 text-xs rounded-full transition-colors ${
                            isAdded
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                              : isAdding
                                ? 'bg-zinc-100 dark:bg-zinc-700 text-zinc-400'
                                : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50'
                          }`}
                        >
                          {isAdding ? (
                            <div className="animate-spin rounded-full h-3 w-3 border border-red-400 border-t-transparent" />
                          ) : isAdded ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <ShoppingCart className="w-3 h-3" />
                          )}
                          {item}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedRecipe.missingPreferredIngredients && selectedRecipe.missingPreferredIngredients.length > 0 && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-medium mb-2">
                    <AlertCircle className="w-4 h-4" />
                    Optional Ingredients (not required)
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedRecipe.missingPreferredIngredients.map((item) => {
                      const isAdded = addedItems.has(item);
                      const isAdding = addingToShopping === item;
                      return (
                        <button
                          key={item}
                          onClick={() => {
                            if (isAdded) return;
                            setConfirmItem({ ingredient: item, recipeTitle: selectedRecipe.title });
                          }}
                          disabled={isAdding || isAdded}
                          className={`flex items-center gap-1 px-2 py-1 text-xs rounded-full transition-colors ${
                            isAdded
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                              : isAdding
                                ? 'bg-zinc-100 dark:bg-zinc-700 text-zinc-400'
                                : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50'
                          }`}
                        >
                          {isAdding ? (
                            <div className="animate-spin rounded-full h-3 w-3 border border-amber-400 border-t-transparent" />
                          ) : isAdded ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <ShoppingCart className="w-3 h-3" />
                          )}
                          {item}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MatchRecipesPage() {
  return <MatchRecipesContent />;
}
