'use client';

import { useAuth } from '@/hooks/useAuth';
import { useCachedFetch } from '@/hooks/useCachedFetch';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import {
  Search,
  ChefHat,
  Clock,
  Star,
  Heart,
  Filter,
  Play,
  ShoppingCart,
  CheckCircle2,
  XCircle,
  Plus,
  X,
  Save,
  Calendar,
  Flame,
  BookOpen,
  Users,
  Minus,
  Plus as PlusIcon,
} from 'lucide-react';
import Link from 'next/link';

interface Recipe {
  id: string;
  title: string;
  description: string;
  cuisine: string;
  mealType: string;
  cookingTime: number;
  servings: number;
  difficulty: string;
  nutritionalInfo: string;
  image: string | null;
  youtubeUrl: string | null;
  recipeIngredients: { ingredient: string; quantity: string; unit?: string }[];
  recipeSteps?: { stepNumber: number; instruction: string; estimatedTime?: number }[];
  matchPercentage?: number;
  tier?: number;
  matchedPantryCount?: number;
  mainIngredientInPantry?: boolean;
}

interface SearchResult {
  recipes: Recipe[];
  pantryMatches: Recipe[];
  youtubeUrl: string | null;
}

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Desserts'];
const CUISINES = ['Indian', 'Italian', 'Chinese', 'Mexican', 'American', 'Mediterranean', 'Japanese', 'Other'];

function getTierBadge(tier?: number) {
  if (!tier) return null;
  switch (tier) {
    case 1:
      return <span className="px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full font-semibold">🟢 Cook Now</span>;
    case 2:
      return <span className="px-2 py-0.5 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-full font-semibold">🟡 Buy 1-2</span>;
    case 3:
      return <span className="px-2 py-0.5 text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full font-semibold">🟠 Buy More</span>;
    case 4:
      return <span className="px-2 py-0.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full font-semibold">🔴 Inspiration</span>;
  }
}

function getMealTypeIcon(type: string) {
  switch (type.toLowerCase()) {
    case 'breakfast': return '🌅';
    case 'lunch': return '☀️';
    case 'dinner': return '🌙';
    case 'snacks': return '🍿';
    case 'desserts': return '🍰';
    default: return '🍽️';
  }
}

function getDifficultyColor(diff: string) {
  switch (diff.toLowerCase()) {
    case 'easy': return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400';
    case 'medium': return 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400';
    case 'hard': return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
    default: return 'text-zinc-600 bg-zinc-100 dark:bg-zinc-700 dark:text-zinc-400';
  }
}

function RecipesContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [scaledServings, setScaledServings] = useState(1);

  useEffect(() => {
    if (selectedRecipe) {
      setScaledServings(selectedRecipe.servings || 1);
    }
  }, [selectedRecipe]);

  const [form, setForm] = useState({
    title: '', description: '', cuisine: 'Other', mealType: 'Dinner',
    cookingTime: '30', servings: '2', difficulty: 'Medium',
    nutritionalInfo: JSON.stringify({ calories: 0, protein: 0, carbs: 0, fat: 0 }),
    image: '', youtubeUrl: '',
  });
  const [ingredients, setIngredients] = useState<{ ingredient: string; quantity: string; unit: string }[]>([{ ingredient: '', quantity: '', unit: '' }]);
  const [steps, setSteps] = useState<{ instruction: string; estimatedTime: string }[]>([{ instruction: '', estimatedTime: '' }]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterMealType, setFilterMealType] = useState('All');
  const [filterCuisine, setFilterCuisine] = useState('All');
  const [displayedRecipes, setDisplayedRecipes] = useState<Recipe[]>([]);
  const [confirmItem, setConfirmItem] = useState<{ ingredient: string; recipeTitle: string } | null>(null);
  const [addingToShopping, setAddingToShopping] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showMealPlanModal, setShowMealPlanModal] = useState<Recipe | null>(null);
  const [collections, setCollections] = useState<{ id: string; name: string }[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState('');
  const [saveSubmitting, setSaveSubmitting] = useState(false);
  const [mealPlanSubmitting, setMealPlanSubmitting] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState('Lunch');
  const [selectedMealDate, setSelectedMealDate] = useState(new Date().toISOString().split('T')[0]);
  const [creating, setCreating] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);
  const [addedToShopping, setAddedToShopping] = useState<Set<string>>(new Set());

  const formatQuantity = (quantity: string, scale: number) => {
    const num = parseFloat(quantity);
    if (isNaN(num)) return quantity;
    const scaled = num * scale;
    if (scaled === Math.floor(scaled)) return scaled.toString();
    return scaled.toFixed(1);
  };

  useEffect(() => {
    if (!user && !authLoading) router.push('/login');
  }, [authLoading, user, router]);

  const { data: recipesData, loading: recipesLoading, refresh: refreshRecipes } = useCachedFetch('/api/recipes');

  useEffect(() => {
    if (recipesData) {
      setAllRecipes(recipesData);
      setDisplayedRecipes(recipesData.slice(0, 12));
    }
  }, [recipesData]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        // Close dropdown
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addToShoppingList = async (ingredient: string) => {
    setAddingToShopping(ingredient);
    try {
      await fetch('/api/shopping-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: ingredient }),
        credentials: 'include',
      });
      setAddedToShopping(prev => new Set(prev).add(ingredient));
    } catch (error) {
      console.error('Failed to add to shopping list:', error);
    } finally {
      setAddingToShopping(null);
      setConfirmItem(null);
    }
  };

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/recipes/search?q=${encodeURIComponent(query)}`, { credentials: 'include' });
      const data = await res.json();
      setResults(data);
      if (!searchHistory.includes(query)) {
        setSearchHistory(prev => [query, ...prev].slice(0, 5));
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  }, [searchHistory]);

  const handleInputChange = (value: string) => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      handleSearch(value);
    }, 500);
  };

  const browseAll = async (mealType?: string, cuisine?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (mealType && mealType !== 'All') params.set('mealType', mealType);
      if (cuisine && cuisine !== 'All') params.set('cuisine', cuisine);
      const res = await fetch(`/api/recipes?${params.toString()}`, { credentials: 'include' });
      const data = await res.json();
      setAllRecipes(data);
      setDisplayedRecipes(data.slice(0, 12));
      setResults(null);
    } catch (error) {
      console.error('Failed to fetch recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRecipe = async () => {
    setSaveSubmitting(true);
    try {
      const res = await fetch('/api/saved-recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeId: selectedRecipe!.id, collectionId: selectedCollectionId || undefined }),
        credentials: 'include',
      });
      if (res.ok) {
        setShowSaveModal(false);
        setSelectedCollectionId('');
      }
    } catch (error) {
      console.error('Failed to save recipe:', error);
    } finally {
      setSaveSubmitting(false);
    }
  };

  const handleAddToMealPlan = async () => {
    if (!showMealPlanModal) return;
    setMealPlanSubmitting(true);
    try {
      await fetch('/api/meal-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedMealDate, mealType: selectedMealType, recipeId: showMealPlanModal.id }),
        credentials: 'include',
      });
      setShowMealPlanModal(null);
    } catch (error) {
      console.error('Failed to add to meal plan:', error);
    } finally {
      setMealPlanSubmitting(false);
    }
  };

  const fetchCollections = async () => {
    try {
      const res = await fetch('/api/collections', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setCollections(data);
      }
    } catch (e) {
      console.error('Failed to fetch collections');
    }
  };

  const handleCreateRecipe = async () => {
    if (!form.title) return;
    setCreating(true);
    try {
      const filteredIngredients = ingredients.filter(i => i.ingredient.trim());
      const filteredSteps = steps.filter(s => s.instruction.trim());
      await fetch('/api/user-recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, ingredients: filteredIngredients, steps: filteredSteps }),
        credentials: 'include',
      });
      setCreateSuccess(true);
      setTimeout(() => {
        setShowCreateForm(false);
        setCreateSuccess(false);
        setForm({ title: '', description: '', cuisine: 'Other', mealType: 'Dinner', cookingTime: '30', servings: '2', difficulty: 'Medium', nutritionalInfo: JSON.stringify({ calories: 0, protein: 0, carbs: 0, fat: 0 }), image: '', youtubeUrl: '' });
        setIngredients([{ ingredient: '', quantity: '', unit: '' }]);
        setSteps([{ instruction: '', estimatedTime: '' }]);
      }, 1500);
    } catch (error) {
      console.error('Failed to create recipe:', error);
    } finally {
      setCreating(false);
    }
  };

  if (authLoading) {
    return <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div></div>;
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8" ref={searchRef}>
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
              <ChefHat className="w-8 h-8 text-orange-500" />
              Recipe Discovery
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400 mt-1">Search, browse, and discover recipes</p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> Create Recipe
          </button>
        </div>

        {/* Search Bar */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 shadow-sm border border-zinc-200 dark:border-zinc-700 mb-6">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <input
                type="text"
                placeholder="Search any recipe... (e.g., 'capsicum masala curry', 'chicken biryani')"
                value={searchQuery}
                onChange={(e) => handleInputChange(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none text-base"
              />
            </div>
            <button
              onClick={() => handleSearch(searchQuery)}
              className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors"
            >
              Search
            </button>
          </div>

          {/* Search History */}
          {searchHistory.length > 0 && !searchQuery && (
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Recent:</span>
              {searchHistory.map((term, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSearch(term)}
                  className="px-2 py-1 text-xs bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
                >
                  {term}
                </button>
              ))}
            </div>
          )}

          {/* Filters Toggle */}
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1 text-sm text-zinc-600 dark:text-zinc-400 hover:text-orange-500 transition-colors"
            >
              <Filter className="w-4 h-4" /> Filters
            </button>
            {showFilters && (
              <div className="flex flex-wrap gap-3 ml-4">
                <select
                  value={filterMealType}
                  onChange={(e) => { setFilterMealType(e.target.value); browseAll(e.target.value, filterCuisine); }}
                  className="px-3 py-1 text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white"
                >
                  <option value="All">All Meal Types</option>
                  {MEAL_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
                <select
                  value={filterCuisine}
                  onChange={(e) => { setFilterCuisine(e.target.value); browseAll(filterMealType, e.target.value); }}
                  className="px-3 py-1 text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white"
                >
                  <option value="All">All Cuisines</option>
                  {CUISINES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Search Results */}
        {results && (
          <div className="space-y-8 mb-8">
            {/* YouTube Section */}
            {results.youtubeUrl && (
              <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm border border-zinc-200 dark:border-zinc-700">
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                  <Play className="w-5 h-5 text-red-500" /> YouTube Videos for "{searchQuery}"
                </h2>
                <a
                  href={results.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                >
                  <span className="text-3xl">▶</span>
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-white">Watch Cooking Videos on YouTube</p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Find step-by-step video tutorials for {searchQuery}</p>
                  </div>
                  <Play className="w-5 h-5 text-red-500 ml-auto" />
                </a>
              </div>
            )}

            {/* Pantry Matches Section */}
            {results.pantryMatches.length > 0 && (
              <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm border border-zinc-200 dark:border-zinc-700">
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" /> Your Pantry Matches
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {results.pantryMatches.map((recipe) => (
                    <div
                      key={recipe.id}
                      className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setSelectedRecipe(recipe)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-zinc-900 dark:text-white">{recipe.title}</h3>
                        {getTierBadge(recipe.tier)}
                      </div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 mb-3">{recipe.description}</p>
                      <div className="flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{recipe.cookingTime}m</span>
                        <span className="flex items-center gap-1"><Star className="w-3 h-3" />{recipe.difficulty}</span>
                        <span className={`px-2 py-0.5 text-xs rounded-full font-bold ${recipe.matchPercentage! >= 80 ? 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400' : recipe.matchPercentage! >= 50 ? 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400' : 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400'}`}>
                          {recipe.matchPercentage}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Catalog Results */}
            {results.recipes.length > 0 && (
              <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm border border-zinc-200 dark:border-zinc-700">
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-500" /> Catalog Recipes ({results.recipes.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {results.recipes.map((recipe) => (
                    <div
                      key={recipe.id}
                      className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setSelectedRecipe(recipe)}
                    >
                      <div className="h-32 bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 flex items-center justify-center">
                        <span className="text-4xl">{getMealTypeIcon(recipe.mealType)}</span>
                      </div>
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-1">
                          <h3 className="font-semibold text-zinc-900 dark:text-white">{recipe.title}</h3>
                          {getTierBadge(recipe.tier)}
                        </div>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 mb-2">{recipe.description}</p>
                        <div className="flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{recipe.cookingTime}m</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400">{recipe.cuisine}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No Results */}
            {results.recipes.length === 0 && results.pantryMatches.length === 0 && (
              <div className="text-center py-12 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700">
                <ChefHat className="w-16 h-16 mx-auto text-zinc-300 dark:text-zinc-600 mb-4" />
                <h3 className="text-lg font-medium text-zinc-900 dark:text-white">No recipes found</h3>
                <p className="text-zinc-600 dark:text-zinc-400 mt-1">Try a different search term</p>
              </div>
            )}
          </div>
        )}

        {/* Browse Section (when no search) */}
        {!results && (
          <div className="space-y-8">
            {/* Meal Type Cards */}
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">Browse by Meal Type</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {MEAL_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => browseAll(type)}
                    className="p-6 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-orange-500 hover:shadow-lg transition-all text-center"
                  >
                    <span className="text-4xl block mb-2">{getMealTypeIcon(type)}</span>
                    <span className="font-medium text-zinc-900 dark:text-white">{type}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Cuisine Cards */}
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">Browse by Cuisine</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {CUISINES.map((c) => (
                  <button
                    key={c}
                    onClick={() => browseAll('All', c)}
                    className="p-4 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-orange-500 hover:shadow-lg transition-all text-center"
                  >
                    <span className="font-medium text-zinc-900 dark:text-white">{c}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Popular Recipes */}
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">Popular Recipes</h2>
              {loading ? (
                <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {displayedRecipes.map((recipe) => (
                    <div
                      key={recipe.id}
                      className="bg-white dark:bg-zinc-800 rounded-xl overflow-hidden shadow-sm border border-zinc-200 dark:border-zinc-700 hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => setSelectedRecipe(recipe)}
                    >
                      <div className="h-48 bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 flex items-center justify-center">
                        <span className="text-6xl">{getMealTypeIcon(recipe.mealType)}</span>
                      </div>
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">{recipe.title}</h3>
                          <button className="p-1 text-zinc-400 hover:text-red-500 transition-colors">
                            <Heart className="w-5 h-5" />
                          </button>
                        </div>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 mb-3">{recipe.description}</p>
                        <div className="flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-500">
                          <div className="flex items-center gap-1"><Clock className="w-4 h-4" /><span>{recipe.cookingTime}m</span></div>
                          <div className="flex items-center gap-1"><Star className="w-4 h-4" /><span>{recipe.servings} servings</span></div>
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          <span className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(recipe.difficulty)}`}>{recipe.difficulty}</span>
                          <span className="text-xs px-2 py-1 bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 rounded">{recipe.cuisine}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {allRecipes.length > displayedRecipes.length && (
                <div className="text-center mt-6">
                  <button
                    onClick={() => setDisplayedRecipes(prev => [...prev, ...allRecipes.slice(prev.length, prev.length + 12)])}
                    className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors"
                  >
                    Load More
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recipe Detail Modal */}
        {selectedRecipe && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white dark:bg-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="h-48 bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 flex items-center justify-center relative">
                <span className="text-7xl">{getMealTypeIcon(selectedRecipe.mealType)}</span>
                <button onClick={() => setSelectedRecipe(null)} className="absolute top-4 right-4 p-2 bg-white/80 dark:bg-zinc-800/80 rounded-full text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6">
                <div className="flex items-start justify-between mb-2">
                  <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">{selectedRecipe.title}</h2>
                  {getTierBadge(selectedRecipe.tier)}
                </div>
                <p className="text-zinc-600 dark:text-zinc-400 mb-4">{selectedRecipe.description}</p>

                <div className="flex items-center gap-4 mb-6">
                  <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400"><Clock className="w-4 h-4" /><span>{selectedRecipe.cookingTime} min</span></div>
                  <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400"><Star className="w-4 h-4" /><span>{selectedRecipe.servings} servings</span></div>
                  <span className={`text-xs px-3 py-1 rounded-full ${getDifficultyColor(selectedRecipe.difficulty)}`}>{selectedRecipe.difficulty}</span>
                  <span className="text-xs px-2 py-1 bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 rounded">{selectedRecipe.cuisine}</span>
                </div>

                <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                      <Users className="w-4 h-4 text-orange-500" />
                      Adjust Servings
                    </h3>
                    <span className="text-lg font-bold text-orange-600 dark:text-orange-400">{scaledServings} serving{scaledServings > 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setScaledServings(Math.max(1, scaledServings - 1))}
                      className="p-2 bg-white dark:bg-zinc-700 rounded-lg border border-zinc-200 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-600 transition-colors"
                    >
                      <Minus className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={scaledServings}
                      onChange={(e) => setScaledServings(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                      className="w-20 text-center px-2 py-1 border border-zinc-200 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white text-sm"
                    />
                    <button
                      onClick={() => setScaledServings(Math.min(50, scaledServings + 1))}
                      className="p-2 bg-white dark:bg-zinc-700 rounded-lg border border-zinc-200 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-600 transition-colors"
                    >
                      <PlusIcon className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                    </button>
                    <div className="flex-1 flex gap-1">
                      {[1, 2, 4, 6, 8].map((n) => (
                        <button
                          key={n}
                          onClick={() => setScaledServings(n)}
                          className={`flex-1 py-1 text-xs rounded-lg transition-colors ${
                            scaledServings === n
                              ? 'bg-orange-500 text-white'
                              : 'bg-white dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-600'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-3">Ingredients</h3>
                  <ul className="space-y-2">
                    {selectedRecipe.recipeIngredients.map((ing, idx) => {
                      const scale = scaledServings / selectedRecipe.servings;
                      return (
                        <li key={idx} className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                          <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0" />
                          <span>{formatQuantity(ing.quantity, scale)} {ing.unit} {ing.ingredient}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-3">Instructions</h3>
                  {selectedRecipe.recipeSteps && selectedRecipe.recipeSteps.length > 0 ? (
                    <div className="space-y-3">
                      {selectedRecipe.recipeSteps.map((step) => (
                        <div key={step.stepNumber} className="flex gap-3">
                          <span className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                            {step.stepNumber}
                          </span>
                          <div>
                            <p className="text-sm text-zinc-700 dark:text-zinc-300">{step.instruction}</p>
                            {step.estimatedTime && <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">~{step.estimatedTime} min</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Detailed instructions coming soon.</p>
                  )}
                </div>

                {selectedRecipe.youtubeUrl && (
                  <div className="mb-6">
                    <a href={selectedRecipe.youtubeUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                      <Play className="w-5 h-5 text-red-500" />
                      <span className="font-medium text-zinc-900 dark:text-white">Watch on YouTube</span>
                    </a>
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={() => { fetchCollections(); setShowSaveModal(true); setSelectedCollectionId(''); }} className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors">
                    Save Recipe
                  </button>
                  <button onClick={() => setShowMealPlanModal(selectedRecipe)} className="flex-1 py-2 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors">
                    Add to Meal Plan
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Save Modal */}
        {showSaveModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-zinc-800 rounded-2xl w-full max-w-md">
              <div className="p-6 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Save Recipe</h2>
                <button onClick={() => setShowSaveModal(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div><label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Recipe</label><p className="text-zinc-900 dark:text-white font-medium">{selectedRecipe?.title}</p></div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Collection (optional)</label>
                  <select value={selectedCollectionId} onChange={(e) => setSelectedCollectionId(e.target.value)} className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white">
                    <option value="">No Collection</option>
                    {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <button onClick={handleSaveRecipe} disabled={saveSubmitting} className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50">{saveSubmitting ? 'Saving...' : 'Save Recipe'}</button>
              </div>
            </div>
          </div>
        )}

        {/* Meal Plan Modal */}
        {showMealPlanModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-zinc-800 rounded-2xl w-full max-w-md">
              <div className="p-6 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Add to Meal Plan</h2>
                <button onClick={() => setShowMealPlanModal(null)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div><label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Recipe</label><p className="text-zinc-900 dark:text-white font-medium">{showMealPlanModal.title}</p></div>
                <div><label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Date</label><input type="date" value={selectedMealDate} onChange={(e) => setSelectedMealDate(e.target.value)} className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white" /></div>
                <div><label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Meal Type</label><select value={selectedMealType} onChange={(e) => setSelectedMealType(e.target.value)} className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white">{MEAL_TYPES.map((mt) => <option key={mt} value={mt}>{mt}</option>)}</select></div>
                <button onClick={handleAddToMealPlan} disabled={mealPlanSubmitting} className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50">{mealPlanSubmitting ? 'Adding...' : 'Add to Meal Plan'}</button>
              </div>
            </div>
          </div>
        )}

        {/* Create Recipe Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white dark:bg-zinc-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 sticky top-0 bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Create New Recipe</h2>
                <button onClick={() => { setShowCreateForm(false); setCreateSuccess(false); }} className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"><X className="w-5 h-5" /></button>
              </div>
              {createSuccess ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4"><svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></div>
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Recipe Created!</h3>
                  <p className="text-zinc-600 dark:text-zinc-400 mt-2">Your recipe has been saved successfully.</p>
                </div>
              ) : (
                <div className="p-6 space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wide mb-3">Basic Info</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2"><label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Title *</label><input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white" placeholder="e.g., My Famous Pasta" /></div>
                      <div className="md:col-span-2"><label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white" placeholder="Brief description" /></div>
                      <div><label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Cuisine</label><select value={form.cuisine} onChange={(e) => setForm({ ...form, cuisine: e.target.value })} className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white">{CUISINES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
                      <div><label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Meal Type *</label><select value={form.mealType} onChange={(e) => setForm({ ...form, mealType: e.target.value })} className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white">{MEAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
                      <div><label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Cooking Time (min)</label><input type="number" value={form.cookingTime} onChange={(e) => setForm({ ...form, cookingTime: e.target.value })} className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white" /></div>
                      <div><label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Servings</label><input type="number" value={form.servings} onChange={(e) => setForm({ ...form, servings: e.target.value })} className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white" /></div>
                      <div><label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Difficulty</label><select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })} className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white">{['Easy', 'Medium', 'Hard'].map((d) => <option key={d} value={d}>{d}</option>)}</select></div>
                      <div><label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Image URL</label><input type="text" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white" placeholder="https://..." /></div>
                      <div><label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">YouTube URL</label><input type="text" value={form.youtubeUrl} onChange={(e) => setForm({ ...form, youtubeUrl: e.target.value })} className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white" placeholder="https://youtube.com/..." /></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-3"><h3 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wide">Ingredients</h3><button type="button" onClick={() => setIngredients([...ingredients, { ingredient: '', quantity: '', unit: '' }])} className="flex items-center gap-1 text-sm text-orange-500 hover:text-orange-600"><Plus className="w-4 h-4" /> Add</button></div>
                    <div className="space-y-2">
                      {ingredients.map((ing, idx) => (
                        <div key={idx} className="flex gap-2">
                          <input type="text" value={ing.ingredient} onChange={(e) => { const u = [...ingredients]; u[idx] = { ...u[idx], ingredient: e.target.value }; setIngredients(u); }} placeholder="Ingredient" className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white" />
                          <input type="text" value={ing.quantity} onChange={(e) => { const u = [...ingredients]; u[idx] = { ...u[idx], quantity: e.target.value }; setIngredients(u); }} placeholder="Qty" className="w-20 px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white" />
                          <input type="text" value={ing.unit} onChange={(e) => { const u = [...ingredients]; u[idx] = { ...u[idx], unit: e.target.value }; setIngredients(u); }} placeholder="Unit" className="w-20 px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white" />
                          {ingredients.length > 1 && <button type="button" onClick={() => setIngredients(ingredients.filter((_, i) => i !== idx))} className="p-2 text-zinc-400 hover:text-red-500"><X className="w-4 h-4" /></button>}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-3"><h3 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wide">Steps</h3><button type="button" onClick={() => setSteps([...steps, { instruction: '', estimatedTime: '' }])} className="flex items-center gap-1 text-sm text-orange-500 hover:text-orange-600"><Plus className="w-4 h-4" /> Add Step</button></div>
                    <div className="space-y-3">
                      {steps.map((step, idx) => (
                        <div key={idx} className="flex gap-2 items-start">
                          <span className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold mt-2">{idx + 1}</span>
                          <input type="text" value={step.instruction} onChange={(e) => { const u = [...steps]; u[idx] = { ...u[idx], instruction: e.target.value }; setSteps(u); }} placeholder={`Step ${idx + 1}`} className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white" />
                          <input type="text" value={step.estimatedTime} onChange={(e) => { const u = [...steps]; u[idx] = { ...u[idx], estimatedTime: e.target.value }; setSteps(u); }} placeholder="Time (min)" className="w-24 px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white" />
                          {steps.length > 1 && <button type="button" onClick={() => setSteps(steps.filter((_, i) => i !== idx))} className="p-2 text-zinc-400 hover:text-red-500 mt-2"><X className="w-4 h-4" /></button>}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                    <button onClick={handleCreateRecipe} disabled={creating || !form.title} className="flex-1 flex items-center justify-center gap-2 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-medium rounded-lg transition-colors"><Save className="w-4 h-4" />{creating ? 'Creating...' : 'Create Recipe'}</button>
                    <button onClick={() => { setShowCreateForm(false); setCreateSuccess(false); }} className="px-6 py-2 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Confirm Item Modal */}
        {confirmItem && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setConfirmItem(null)}>
            <div className="bg-white dark:bg-zinc-800 rounded-2xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">Is "{confirmItem.ingredient}" available at home?</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">If yes, you don't need to add it to shopping list.</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmItem(null)} className="flex-1 px-4 py-2 bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg font-medium hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors">Yes, I have it</button>
                <button onClick={() => addToShoppingList(confirmItem.ingredient)} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2"><ShoppingCart className="w-4 h-4" />Add to Shopping</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RecipesPage() {
  return <RecipesContent />;
}
