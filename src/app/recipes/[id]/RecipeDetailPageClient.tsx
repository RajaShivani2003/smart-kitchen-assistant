'use client';

import { useState } from 'react';
import { ChefHat, Clock, Star, User, ArrowLeft, Heart, Share2, Calendar, CheckCircle2, XCircle, Wand2, X } from 'lucide-react';
import Link from 'next/link';
import RecipeDetailClient from './RecipeDetailClient';
import SubstitutionModal from './SubstitutionModal';

interface RecipeIngredient {
  id: string;
  ingredient: string;
  quantity: string;
  unit?: string;
}

interface RecipeStep {
  id: string;
  instruction: string;
  stepNumber: number;
  estimatedTime: number | null;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  user: { name: string };
}

interface Recipe {
  id: string;
  title: string;
  description: string;
  image: string | null;
  cuisine: string;
  mealType: string;
  source: string;
  cookingTime: number;
  servings: number;
  difficulty: string;
  youtubeUrl: string | null;
  nutritionalInfo: string;
  recipeIngredients: RecipeIngredient[];
  recipeSteps: RecipeStep[];
  reviews: Review[];
}

interface RecipeDetailClientProps {
  recipe: Recipe;
  isSaved: boolean;
}

export default function RecipeDetailPageClient({ recipe, isSaved }: RecipeDetailClientProps) {
  const [selectedIngredient, setSelectedIngredient] = useState<RecipeIngredient | null>(null);

  let youtubeUrl = recipe?.youtubeUrl;
  let videoId = '';
  if (youtubeUrl) {
    const match = youtubeUrl.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
    if (match) videoId = match[1];
  }

  let nutritionalInfo = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  try {
    nutritionalInfo = JSON.parse(recipe.nutritionalInfo);
  } catch {
    nutritionalInfo = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  }

  const avgRating = recipe.reviews.length > 0
    ? recipe.reviews.reduce((sum, r) => sum + r.rating, 0) / recipe.reviews.length
    : 0;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/recipes" className="inline-flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-orange-500 dark:hover:text-orange-400 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Recipes
        </Link>

        {/* Hero */}
        {recipe.image ? (
          <div className="h-64 md:h-80 bg-cover bg-center rounded-2xl mb-8" style={{ backgroundImage: `url(${recipe.image})` }} />
        ) : (
          <div className="h-64 md:h-80 bg-gradient-to-br from-orange-400 to-amber-500 rounded-2xl mb-8 flex items-center justify-center">
            <ChefHat className="w-20 h-20 text-white/50" />
          </div>
        )}

        {/* YouTube Video */}
        {videoId && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="text-red-500">▶</span> Watch How to Make It
            </h2>
            <div className="aspect-video rounded-2xl overflow-hidden shadow-lg border border-zinc-200 dark:border-zinc-700">
              <iframe
                src={`https://www.youtube.com/embed/${videoId}`}
                title={recipe.title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        )}

        {youtubeUrl && !videoId && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="text-red-500">▶</span> Watch How to Make It
            </h2>
            <a
              href={youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            >
              <span className="text-3xl">▶</span>
              <div>
                <p className="font-medium text-zinc-900 dark:text-white">Search on YouTube</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Find cooking videos for {recipe.title}</p>
              </div>
            </a>
          </div>
        )}

        {/* Title & Badges */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full text-sm font-medium">{recipe.cuisine}</span>
            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-sm font-medium">{recipe.mealType}</span>
            <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full text-sm font-medium">{recipe.source === 'catalog' ? 'Catalog' : 'External'}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-2">{recipe.title}</h1>
          <p className="text-zinc-600 dark:text-zinc-400">{recipe.description}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 text-center border border-zinc-200 dark:border-zinc-700">
            <Clock className="w-6 h-6 text-orange-500 mx-auto mb-2" />
            <p className="text-lg font-bold text-zinc-900 dark:text-white">{recipe.cookingTime} min</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Cook Time</p>
          </div>
          <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 text-center border border-zinc-200 dark:border-zinc-700">
            <User className="w-6 h-6 text-blue-500 mx-auto mb-2" />
            <p className="text-lg font-bold text-zinc-900 dark:text-white">{recipe.servings}</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Servings</p>
          </div>
          <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 text-center border border-zinc-200 dark:border-zinc-700">
            <Star className="w-6 h-6 text-amber-500 mx-auto mb-2" />
            <p className="text-lg font-bold text-zinc-900 dark:text-white">{recipe.difficulty}</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Difficulty</p>
          </div>
          <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 text-center border border-zinc-200 dark:border-zinc-700">
            <Heart className="w-6 h-6 text-red-500 mx-auto mb-2" />
            <p className="text-lg font-bold text-zinc-900 dark:text-white">{avgRating > 0 ? avgRating.toFixed(1) : 'N/A'}</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Rating</p>
          </div>
        </div>

        {/* Nutrition */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 border border-zinc-200 dark:border-zinc-700 mb-8">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">Nutrition Info</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <p className="text-xl font-bold text-orange-600 dark:text-orange-400">{nutritionalInfo.calories}</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Calories</p>
            </div>
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{nutritionalInfo.protein}g</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Protein</p>
            </div>
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-xl font-bold text-green-600 dark:text-green-400">{nutritionalInfo.carbs}g</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Carbs</p>
            </div>
            <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400">{nutritionalInfo.fat}g</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Fat</p>
            </div>
          </div>
        </div>

        {/* Ingredients with substitution */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 border border-zinc-200 dark:border-zinc-700 mb-8">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">Ingredients</h2>
          <p className="text-xs text-purple-500 mb-3 flex items-center gap-1">
            <Wand2 className="w-3 h-3" />
            Click any ingredient to find substitutes
          </p>
          <ul className="space-y-2">
            {recipe.recipeIngredients.map((ing) => (
              <li
                key={ing.id}
                onClick={() => setSelectedIngredient(ing)}
                className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-700/50 rounded-lg px-2 -mx-2 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                <Wand2 className="w-3 h-3 text-purple-400 flex-shrink-0 opacity-0 group-hover:opacity-100" />
                <span>{ing.quantity} {ing.unit} {ing.ingredient}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Steps */}
        {recipe.recipeSteps.length > 0 && (
          <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 border border-zinc-200 dark:border-zinc-700 mb-8">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">Instructions</h2>
            <ol className="space-y-4">
              {recipe.recipeSteps.map((step) => (
                <li key={step.id} className="flex gap-4">
                  <span className="flex-shrink-0 w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">{step.stepNumber}</span>
                  <div>
                    <p className="text-zinc-700 dark:text-zinc-300">{step.instruction}</p>
                    {step.estimatedTime && (
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">~{step.estimatedTime} min</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Reviews */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 border border-zinc-200 dark:border-zinc-700 mb-8">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">Reviews ({recipe.reviews.length})</h2>
          {recipe.reviews.length > 0 ? (
            <div className="space-y-4">
              {recipe.reviews.slice(0, 5).map((review) => (
                <div key={review.id} className="border-b border-zinc-200 dark:border-zinc-700 pb-4 last:border-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-zinc-900 dark:text-white">{review.user.name}</span>
                    <div className="flex">
                      {Array.from({ length: review.rating }).map((_, i) => (
                        <Star key={i} className="w-4 h-4 text-amber-500 fill-amber-500" />
                      ))}
                    </div>
                  </div>
                  {review.comment && <p className="text-sm text-zinc-600 dark:text-zinc-400">{review.comment}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-zinc-500 dark:text-zinc-400">No reviews yet</p>
          )}
        </div>

        {/* Interactive Buttons */}
        <RecipeDetailClient recipeId={recipe.id} isSaved={isSaved} />
      </div>

      {/* Substitution Modal */}
      {selectedIngredient && (
        <SubstitutionModal
          ingredient={selectedIngredient}
          onClose={() => setSelectedIngredient(null)}
          recipeTitle={recipe.title}
        />
      )}
    </div>
  );
}
