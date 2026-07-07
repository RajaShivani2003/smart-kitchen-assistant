'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCachedFetch } from '@/hooks/useCachedFetch';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Plus, X, Clock, Star, Share2 } from 'lucide-react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks';

interface MealPlanRecipe {
  id: string;
  title: string;
  description: string;
  cookingTime: number;
  servings: number;
  difficulty: string;
  recipeIngredients: Array<{ ingredient: string; quantity: string; unit?: string }>;
}

interface MealPlan {
  id: string;
  date: string;
  mealType: string;
  recipe: MealPlanRecipe;
}

const mealTypes: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];
const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const daysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function MealPlanContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState(getWeekStart(new Date()));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<MealType>('Breakfast');
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [availableRecipes, setAvailableRecipes] = useState<MealPlanRecipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<MealPlanRecipe | null>(null);
  const { data: recipesData, loading: recipesLoading } = useCachedFetch<MealPlanRecipe[]>('/api/recipes', { enabled: !!user });

  useEffect(() => {
    if (recipesData) {
      setAvailableRecipes(recipesData);
    }
  }, [recipesData]);

  useEffect(() => {
    if (!user && !authLoading) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchMealPlans();
    }
  }, [authLoading, user, currentWeekStart]);

  function getWeekStart(date: Date): string {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    d.setDate(diff);
    return d.toISOString().split('T')[0];
  }

  function getWeekDates(weekStart: string) {
    const dates = [];
    const start = new Date(weekStart);
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  }

  const fetchMealPlans = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/meal-plans?weekStart=${currentWeekStart}`);
      const data = await res.json();
      setMealPlans(data);
    } catch (error) {
      console.error('Failed to fetch meal plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const weekDates = getWeekDates(currentWeekStart);

  const getMealPlanForDateAndType = (date: string, mealType: string) => {
    return mealPlans.find((mp) => mp.date.split('T')[0] === date && mp.mealType === mealType);
  };

  const handleAddMeal = async (date: string, mealType: MealType) => {
    setSelectedDate(date);
    setSelectedMealType(mealType);
    setShowRecipeModal(true);
    setSearchTerm('');
  };

  const handleSaveMeal = async (recipeId: string) => {
    try {
      await fetch('/api/meal-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          mealType: selectedMealType,
          recipeId,
        }),
      });

      await fetchMealPlans();
      setShowRecipeModal(false);
      setSelectedRecipe(null);
    } catch (error) {
      console.error('Failed to save meal plan:', error);
    }
  };

  const handleDeleteMeal = async (mealPlanId: string) => {
    try {
      await fetch(`/api/meal-plans/${mealPlanId}`, { method: 'DELETE' });
      await fetchMealPlans();
    } catch (error) {
      console.error('Failed to delete meal plan:', error);
    }
  };

  const filteredRecipes = availableRecipes.filter(
    (r) =>
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const navigateWeek = (direction: number) => {
    const current = new Date(currentWeekStart);
    current.setDate(current.getDate() + direction * 7);
    setCurrentWeekStart(getWeekStart(current));
  };

  const generateShareText = () => {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekLabel = `${new Date(currentWeekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

    let text = `📅 Weekly Meal Plan (${weekLabel})\n\n`;

    weekDates.forEach((date, dayIndex) => {
      const dateObj = new Date(date);
      const dayName = daysOfWeek[dayIndex];
      const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      const dayMeals = mealTypes.map(mealType => {
        const plan = getMealPlanForDateAndType(date, mealType);
        const mealEmojis: Record<string, string> = { Breakfast: '🌅', Lunch: '☀️', Dinner: '🌙', Snacks: '🍿' };
        if (plan) {
          return `${mealEmojis[mealType]} ${mealType}: ${plan.recipe.title}`;
        }
        return null;
      }).filter(Boolean);

      if (dayMeals.length > 0) {
        text += `📌 ${dayName} (${dateStr}):\n${dayMeals.join('\n')}\n\n`;
      }
    });

    text += `— Smart Kitchen Assistant`;
    return text;
  };

  const shareOnWhatsApp = () => {
    const text = generateShareText();
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  const shareDayOnWhatsApp = (date: string, dayIndex: number) => {
    const dateObj = new Date(date);
    const dayName = daysOfWeek[dayIndex];
    const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    const dayMeals = mealTypes.map(mealType => {
      const plan = getMealPlanForDateAndType(date, mealType);
      const mealEmojis: Record<string, string> = { Breakfast: '🌅', Lunch: '☀️', Dinner: '🌙', Snacks: '🍿' };
      if (plan) {
        return `${mealEmojis[mealType]} ${mealType}: ${plan.recipe.title}`;
      }
      return null;
    }).filter(Boolean);

    if (dayMeals.length === 0) return;

    let text = `📌 ${dayName} (${dateStr})\n${dayMeals.join('\n')}\n\n— Smart Kitchen Assistant`;
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-zinc-900 dark:to-zinc-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-zinc-600 dark:text-zinc-400">Loading your meal plan...</p>
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
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Weekly Meal Planner</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-2">Plan your meals for the week</p>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigateWeek(-1)}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-zinc-600 dark:text-zinc-400" />
            </button>

            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
              {new Date(currentWeekStart).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>

            <div className="flex items-center gap-2">
              <button
                onClick={shareOnWhatsApp}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">Share on WhatsApp</span>
              </button>
              <button
                onClick={() => navigateWeek(1)}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
              >
                <ChevronRight className="w-6 h-6 text-zinc-600 dark:text-zinc-400" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            {weekDates.map((date, dayIndex) => {
              const isToday = date === new Date().toISOString().split('T')[0];
              const dateObj = new Date(date);
              const dateStr = dateObj.toLocaleDateString('en-US', { day: 'numeric' });

              return (
                <div key={date} className={`border-2 rounded-xl p-3 ${isToday ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'border-zinc-200 dark:border-zinc-700'}`}>
                  <div className="text-center mb-3">
                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{daysShort[dayIndex]}</p>
                    <p className={`text-2xl font-bold ${isToday ? 'text-orange-600 dark:text-orange-400' : 'text-zinc-900 dark:text-white'}`}>{dateStr}</p>
                    <button
                      onClick={() => shareDayOnWhatsApp(date, dayIndex)}
                      className="mt-1 text-xs text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 flex items-center gap-1 mx-auto"
                    >
                      <Share2 className="w-3 h-3" />
                      Share Day
                    </button>
                  </div>

                  <div className="space-y-2">
                    {mealTypes.map((mealType) => {
                      const plan = getMealPlanForDateAndType(date, mealType);
                      const mealEmojis: Record<string, string> = { Breakfast: '🌅', Lunch: '☀️', Dinner: '🌙', Snacks: '🍿' };

                      return (
                        <div
                          key={mealType}
                          className={`text-xs p-2 rounded-lg cursor-pointer transition-colors ${
                            plan
                              ? 'bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700'
                              : 'bg-zinc-50 dark:bg-zinc-700/50 border border-dashed border-zinc-300 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                          }`}
                          onClick={() => plan ? handleDeleteMeal(plan.id) : handleAddMeal(date, mealType)}
                        >
                          <div className="flex items-center justify-between">
                            <span>{mealEmojis[mealType]}</span>
                            {plan ? (
                              <span className="text-zinc-900 dark:text-white font-medium truncate flex-1 ml-1">
                                {plan.recipe.title}
                              </span>
                            ) : (
                              <Plus className="w-3 h-3 text-zinc-400" />
                            )}
                          </div>
                          {plan && (
                            <p className="text-zinc-500 dark:text-zinc-400 mt-1 truncate">{plan.recipe.cookingTime} min</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {mealPlans.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-zinc-800 rounded-2xl shadow-lg">
            <p className="text-zinc-600 dark:text-zinc-400 text-lg">No meals planned this week</p>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-2">Click the + button on any day/time to add a meal</p>
          </div>
        )}
      </div>

      {showRecipeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowRecipeModal(false)}>
          <div className="bg-white dark:bg-zinc-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Add {selectedMealType}</h2>
                <p className="text-zinc-600 dark:text-zinc-400 text-sm mt-1">
                  {new Date(selectedDate!).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <button onClick={() => setShowRecipeModal(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-2xl">
                ×
              </button>
            </div>

            <div className="mb-4">
              <input
                type="text"
                placeholder="Search recipes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
              />
            </div>

            <div className="space-y-3">
              {filteredRecipes.map((recipe) => (
                <div
                  key={recipe.id}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                    selectedRecipe?.id === recipe.id
                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                      : 'border-zinc-200 dark:border-zinc-700 hover:border-orange-300 dark:hover:border-orange-700'
                  }`}
                  onClick={() => setSelectedRecipe(recipe)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-zinc-900 dark:text-white">{recipe.title}</h3>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-1">{recipe.description}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveMeal(recipe.id);
                      }}
                      className="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white text-sm rounded-lg transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400 mt-2">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {recipe.cookingTime} min
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      {recipe.difficulty}
                    </span>
                    <span>{recipe.servings} servings</span>
                  </div>
                </div>
              ))}
            </div>

            {filteredRecipes.length === 0 && (
              <p className="text-center text-zinc-500 dark:text-zinc-400 py-8">No recipes found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MealPlanPage() {
  return <MealPlanContent />;
}
