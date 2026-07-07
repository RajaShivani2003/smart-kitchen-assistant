'use client';

import { useState } from 'react';
import { Heart, Share2, Calendar, CheckCircle2, XCircle } from 'lucide-react';

interface RecipeDetailClientProps {
  recipeId: string;
  isSaved: boolean;
}

export default function RecipeDetailClient({ recipeId, isSaved: initialSaved }: RecipeDetailClientProps) {
  const [saved, setSaved] = useState(initialSaved);
  const [saving, setSaving] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [showMealPlan, setShowMealPlan] = useState(false);
  const [mealDate, setMealDate] = useState('');
  const [mealType, setMealType] = useState('Dinner');
  const [mealSuccess, setMealSuccess] = useState(false);
  const [mealError, setMealError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/saved-recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeId }),
        credentials: 'include',
      });
      if (res.ok) {
        setSaved(!saved);
      }
    } catch (error) {
      console.error('Failed to save recipe:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      });
    } else {
      window.open(url, '_blank');
    }
  };

  const handleAddToMealPlan = async () => {
    setMealError('');
    try {
      const res = await fetch('/api/meal-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: mealDate || new Date().toISOString().split('T')[0],
          mealType,
          recipeId,
        }),
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok) {
        setMealSuccess(true);
        setShowMealPlan(false);
        setTimeout(() => setMealSuccess(false), 3000);
      } else {
        setMealError(data.error || 'Failed to add to meal plan');
      }
    } catch (error) {
      setMealError('Failed to add to meal plan');
    }
  };

  return (
    <div>
      {mealSuccess && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-600 dark:text-green-400 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          Added to meal plan!
        </div>
      )}
      {mealError && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
          <XCircle className="w-4 h-4" />
          {mealError}
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-8">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
            saved
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:border-red-300 dark:hover:border-red-700'
          }`}
        >
          <Heart className={`w-4 h-4 ${saved ? 'fill-white' : ''}`} />
          {saved ? 'Saved' : 'Save Recipe'}
        </button>

        <button
          onClick={handleShare}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:border-orange-300 dark:hover:border-orange-700 transition-colors"
        >
          <Share2 className="w-4 h-4" />
          {shareCopied ? 'Link Copied!' : 'Share'}
        </button>

        <button
          onClick={() => setShowMealPlan(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
        >
          <Calendar className="w-4 h-4" />
          Add to Meal Plan
        </button>
      </div>

      {showMealPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowMealPlan(false)}>
          <div className="bg-white dark:bg-zinc-800 rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">Add to Meal Plan</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Date</label>
                <input
                  type="date"
                  value={mealDate}
                  onChange={(e) => setMealDate(e.target.value)}
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Meal Type</label>
                <select
                  value={mealType}
                  onChange={(e) => setMealType(e.target.value)}
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white"
                >
                  <option value="Breakfast">Breakfast</option>
                  <option value="Lunch">Lunch</option>
                  <option value="Dinner">Dinner</option>
                  <option value="Snacks">Snacks</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMealPlan(false)}
                  className="flex-1 py-2 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddToMealPlan}
                  className="flex-1 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
