'use client';

import { useState } from 'react';
import { Wand2, X, Loader2, CheckCircle2 } from 'lucide-react';

interface Substitute {
  substitute: string;
  amount: string;
  unit: string;
  ratio: string;
  note: string;
}

interface Ingredient {
  id: string;
  ingredient: string;
  quantity: string;
  unit?: string;
}

interface SubstitutionModalProps {
  ingredient: Ingredient | null;
  onClose: () => void;
  recipeTitle: string;
}

export default function SubstitutionModal({ ingredient, onClose, recipeTitle }: SubstitutionModalProps) {
  const [loading, setLoading] = useState(false);
  const [substitutes, setSubstitutes] = useState<Substitute[]>([]);
  const [error, setError] = useState('');

  const fetchSubstitutes = async () => {
    if (!ingredient) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/substitutes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredient: ingredient.ingredient,
          quantity: ingredient.quantity,
          unit: ingredient.unit || '',
          recipeContext: recipeTitle,
        }),
      });
      const data = await res.json();
      if (data.substitutes) {
        setSubstitutes(data.substitutes);
      } else {
        setError(data.error || 'Failed to get substitutes');
      }
    } catch {
      setError('Failed to fetch substitutes');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-purple-500" />
            Substitute "{ingredient?.ingredient}"
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
            Recipe needs <strong className="text-zinc-900 dark:text-white">{ingredient?.quantity} {ingredient?.unit} {ingredient?.ingredient}</strong>
          </p>

          {!loading && substitutes.length === 0 && !error && (
            <button
              onClick={fetchSubstitutes}
              className="w-full py-3 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Wand2 className="w-4 h-4" />
              Find Substitutes
            </button>
          )}

          {loading && (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-3" />
              <p className="text-zinc-600 dark:text-zinc-400">Finding substitutes...</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          {substitutes.length > 0 && (
            <div className="space-y-3">
              {substitutes.map((sub, idx) => (
                <div key={idx} className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="font-bold text-zinc-900 dark:text-white text-lg">{sub.substitute}</span>
                  </div>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">
                    Use <strong>{sub.amount} {sub.unit}</strong> <span className="text-purple-600 dark:text-purple-400">({sub.ratio} ratio)</span>
                  </p>
                  {sub.note && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 italic">{sub.note}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
