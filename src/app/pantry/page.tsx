'use client';

import { useAuth } from '@/hooks/useAuth';
import { useCachedFetch } from '@/hooks/useCachedFetch';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import {
  Heart,
  Plus,
  Edit,
  Trash2,
  Search,
  AlertTriangle,
  Package,
  X,
  ShoppingCart,
  CheckCircle2,
  Camera,
  Loader2,
  Sparkles,
} from 'lucide-react';
import Tesseract from 'tesseract.js';

const LOW_STOCK_THRESHOLD = 2;
const CATEGORIES = ['Vegetables', 'Fruits', 'Dairy', 'Spices', 'Grains', 'Beverages', 'Meats', 'Snacks', 'Condiments', 'Others'];
const UNITS = ['pcs', 'kg', 'g', 'liters', 'ml', 'pack', 'bottle', 'can', 'dozen'];

interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  expiryDate: string | null;
}

function PantryContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [showLowStockBanner, setShowLowStockBanner] = useState(true);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    quantity: '',
    unit: 'pcs',
    category: 'Vegetables',
    expiryDate: '',
  });
  const [reorderLoading, setReorderLoading] = useState<string | null>(null);
  const [reorderSuccess, setReorderSuccess] = useState<string | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoResults, setPhotoResults] = useState<Array<{ name: string; category: string; quantity: string; unit: string }>>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [lowStockItems, setLowStockItems] = useState<Ingredient[]>([]);

  const { data: pantryData, loading: pantryLoading, refresh: refreshPantry } = useCachedFetch('/api/pantry');

  useEffect(() => {
    if (pantryData?.ingredients) {
      setIngredients(pantryData.ingredients);
      setLowStockCount(pantryData.lowStockCount || 0);
    }
  }, [pantryData]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  const fetchLowStockItems = async () => {
    try {
      const res = await fetch('/api/pantry/low-stock', { credentials: 'include' });
      const data = await res.json();
      setLowStockItems(data.lowStockItems || []);
    } catch (error) {
      console.error('Failed to fetch low-stock items:', error);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = editingId ? `/api/pantry/${editingId}` : '/api/pantry';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, id: editingId, quantity: parseFloat(formData.quantity) }),
        credentials: 'include',
      });
      if (res.ok) {
        setShowModal(false);
        refreshPantry();
        fetchLowStockItems();
      }
    } catch (error) {
      console.error('Failed to save ingredient:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this ingredient?')) return;
    try {
      const res = await fetch(`/api/pantry/${id}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) {
        refreshPantry();
        fetchLowStockItems();
      }
    } catch (error) {
      console.error('Failed to delete ingredient:', error);
    }
  };

  const openModal = (ingredient?: Ingredient) => {
    if (ingredient) {
      setEditingId(ingredient.id);
      setFormData({
        name: ingredient.name,
        quantity: ingredient.quantity.toString(),
        unit: ingredient.unit,
        category: ingredient.category,
        expiryDate: ingredient.expiryDate || '',
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        quantity: '',
        unit: 'pcs',
        category: 'Vegetables',
        expiryDate: '',
      });
    }
    setShowModal(true);
  };

  const handleReorder = async (ingredient: Ingredient) => {
    setReorderLoading(ingredient.id);
    try {
      const res = await fetch('/api/shopping-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item: ingredient.name,
          quantity: ingredient.quantity.toString(),
          unit: ingredient.unit,
          category: ingredient.category,
        }),
        credentials: 'include',
      });

      if (res.ok) {
        setReorderSuccess(ingredient.name);
        setReorderLoading(null);
        setTimeout(() => setReorderSuccess(null), 3000);
      } else {
        setReorderLoading(null);
      }
    } catch (error) {
      console.error('Failed to reorder:', error);
      setReorderLoading(null);
    }
  };

  const groceryKeywords = [
    'sugar', 'milk', 'rice', 'flour', 'butter', 'egg', 'eggs', 'oil', 'salt',
    'tomato', 'potato', 'onion', 'garlic', 'ginger', 'chicken', 'bread',
    'cheese', 'yogurt', 'curd', 'pasta', 'noodle', 'tea', 'coffee',
    'juice', 'water', 'soda', 'fruit', 'vegetable', 'spice', 'cumin',
    'coriander', 'turmeric', 'pepper', 'cinnamon', 'honey', 'jam',
    'sauce', 'ketchup', 'mayo', 'vinegar', 'cream', 'paneer',
    'mutton', 'fish', 'shrimp', 'prawn', 'bacon', 'ham', 'sausage',
    'chip', 'cookie', 'candy', 'chocolate', 'nut', 'popcorn',
    'oat', 'cereal', 'roti', 'chapati', 'ghee',
  ];

  const isGroceryItem = (name: string): boolean => {
    const n = name.toLowerCase();
    if (groceryKeywords.some(k => n.includes(k))) return true;
    if (n.length < 2) return false;
    const nonGrocery = ['total', 'subtotal', 'tax', 'gst', 'amount', 'paid', 'balance', 'cash', 'card', 'change', 'receipt', 'thank', 'visit', 'store', 'shop', 'date', 'time', 'no', 'item', 'qty', 'price', 'discount', 'return', 'exchange', 'branch', 'contact', 'phone', 'email', 'website', 'www'];
    if (nonGrocery.some(w => n.includes(w)) && !groceryKeywords.some(k => n.includes(k))) return false;
    return true;
  };

  const categorizeItem = (name: string): string => {
    const n = name.toLowerCase();
    if (['tomato', 'potato', 'onion', 'garlic', 'pepper', 'carrot', 'broccoli', 'spinach', 'lettuce', 'cucumber', 'chilli', 'ginger', 'leaf', 'vegetable'].some(k => n.includes(k))) return 'Vegetables';
    if (['apple', 'banana', 'orange', 'mango', 'grape', 'berry', 'fruit', 'lemon', 'lime'].some(k => n.includes(k))) return 'Fruits';
    if (['milk', 'cheese', 'butter', 'yogurt', 'cream', 'egg', 'curd', 'paneer'].some(k => n.includes(k))) return 'Dairy';
    if (['spice', 'cumin', 'coriander', 'turmeric', 'pepper', 'cinnamon', 'cardamom', 'salt', 'sugar', 'paprika', 'oregano'].some(k => n.includes(k))) return 'Spices';
    if (['rice', 'pasta', 'bread', 'flour', 'oat', 'cereal', 'noodle', 'roti', 'chapati', 'grain'].some(k => n.includes(k))) return 'Grains';
    if (['juice', 'soda', 'water', 'tea', 'coffee', 'shake', 'smoothie', 'drink'].some(k => n.includes(k))) return 'Beverages';
    if (['chicken', 'beef', 'mutton', 'fish', 'shrimp', 'prawn', 'turkey', 'sausage', 'bacon', 'ham'].some(k => n.includes(k))) return 'Meats';
    if (['chip', 'cookie', 'cracker', 'candy', 'chocolate', 'nut', 'trail mix', 'popcorn'].some(k => n.includes(k))) return 'Snacks';
    if (['sauce', 'ketchup', 'mayo', 'olive oil', 'vinegar', 'honey', 'jam', 'pasta sauce', 'soy sauce'].some(k => n.includes(k))) return 'Condiments';
    return 'Others';
  };

  const parseGroceryItems = (text: string): Array<{ name: string; quantity: number; unit: string }> => {
    const lines = text
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l.length > 0);

    const units: Record<string, string> = {
      'kg': 'kg', 'kgs': 'kg', 'kilogram': 'kg', 'kilograms': 'kg',
      'g': 'g', 'gm': 'g', 'grams': 'g', 'gram': 'g',
      'litre': 'liters', 'liter': 'liters', 'litres': 'liters', 'liters': 'liters',
      'ml': 'ml', 'milliliter': 'ml', 'millilitre': 'ml',
      'pack': 'pack', 'packet': 'pack', 'pcs': 'pcs', 'piece': 'pcs',
      'can': 'can', 'cans': 'can', 'bottle': 'bottle', 'bottles': 'bottle',
      'dozen': 'dozen', 'lb': 'lb', 'lbs': 'lb', 'pound': 'lb', 'pounds': 'lb',
    };

    const results: Array<{ name: string; quantity: number; unit: string }> = [];
    const seen = new Set<string>();

    for (const line of lines) {
      let matched = false;

      const amountPattern = /^([a-zA-Z\u00C0-\u024F][a-zA-Z\u00C0-\u024F\s\-']*)\s{2,}(\d+\.?\d*)\s*([a-zA-Z]+)?$/;
      const amountMatch = line.match(amountPattern);
      if (amountMatch) {
        const rawName = amountMatch[1].trim();
        const quantity = parseFloat(amountMatch[2]);
        const rawUnit = (amountMatch[3] || '').toLowerCase().trim();
        const unit = units[rawUnit] || 'pcs';

        const name = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();
        if (isGroceryItem(name) && !seen.has(name.toLowerCase())) {
          results.push({ name, quantity, unit });
          seen.add(name.toLowerCase());
          matched = true;
        }
      }

      if (!matched) {
        const revPattern = /^(\d+\.?\d*)\s*([a-zA-Z]+)\s+([a-zA-Z\u00C0-\u024F][a-zA-Z\u00C0-\u024F\s\-']*)$/;
        const revMatch = line.match(revPattern);
        if (revMatch) {
          const quantity = parseFloat(revMatch[1]);
          const rawUnit = revMatch[2].toLowerCase().trim();
          const rawName = revMatch[3].trim();
          const unit = units[rawUnit] || 'pcs';

          const name = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();
          if (isGroceryItem(name) && !seen.has(name.toLowerCase())) {
            results.push({ name, quantity, unit });
            seen.add(name.toLowerCase());
            matched = true;
          }
        }
      }

      if (!matched) {
        const sepPattern = /^([a-zA-Z\u00C0-\u024F][a-zA-Z\u00C0-\u024F\s\-']*)\s*[-:]\s*(\d+\.?\d*)\s*([a-zA-Z]+)?$/;
        const sepMatch = line.match(sepPattern);
        if (sepMatch) {
          const rawName = sepMatch[1].trim();
          const quantity = parseFloat(sepMatch[2]);
          const rawUnit = (sepMatch[3] || '').toLowerCase().trim();
          const unit = units[rawUnit] || 'pcs';

          const name = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();
          if (isGroceryItem(name) && !seen.has(name.toLowerCase())) {
            results.push({ name, quantity, unit });
            seen.add(name.toLowerCase());
            matched = true;
          }
        }
      }

      if (!matched) {
        const singleSpacePattern = /^([a-zA-Z\u00C0-\u024F][a-zA-Z\u00C0-\u024F\s\-']*)\s+(\d+\.?\d*)\s*([a-zA-Z]+)?$/;
        const singleMatch = line.match(singleSpacePattern);
        if (singleMatch) {
          const rawName = singleMatch[1].trim();
          const quantity = parseFloat(singleMatch[2]);
          const rawUnit = (singleMatch[3] || '').toLowerCase().trim();
          const unit = units[rawUnit] || 'pcs';

          const name = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();
          if (isGroceryItem(name) && !seen.has(name.toLowerCase())) {
            results.push({ name, quantity, unit });
            seen.add(name.toLowerCase());
          }
        }
      }
    }

    return results;
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoLoading(true);
    setPhotoResults([]);
    setPhotoError(null);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setPhotoPreview(base64);

      try {
        const res = await fetch('/api/photo-recognize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64 }),
          credentials: 'include',
        });
        const data = await res.json();
        if (!res.ok) {
          setPhotoError(data.error || 'Failed to analyze image');
          return;
        }
        if (data.items && data.items.length > 0) {
          setPhotoResults(data.items);
          setPhotoError(null);
        } else {
          setPhotoError('No ingredients could be identified. Please try a clearer photo.');
        }
      } catch (error) {
        console.error('Failed to recognize ingredients:', error);
        setPhotoError('Failed to connect to the server. Please try again.');
      } finally {
        setPhotoLoading(false);
      }
    };
    reader.onerror = () => {
      setPhotoError('Failed to read the image file. Please try again.');
      setPhotoLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const addPhotoIngredient = (photoIng: { name: string; category: string; quantity: string; unit: string }) => {
    setFormData({
      name: photoIng.name,
      quantity: photoIng.quantity,
      unit: photoIng.unit,
      category: photoIng.category,
      expiryDate: '',
    });
    setShowPhotoModal(false);
    setShowModal(true);
  };

  const getExpiryStatus = (expiryDate: string | null) => {
    if (!expiryDate) return null;
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: 'Expired', color: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400' };
    if (diffDays <= 3) return { label: `${diffDays}d left`, color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400' };
    return null;
  };

  const isLowStock = (ingredient: Ingredient) => ingredient.quantity <= LOW_STOCK_THRESHOLD;

  const filteredIngredients = ingredients.filter((ing) => {
    const matchesSearch = ing.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'All' || ing.category === filterCategory;
    const matchesLowStock = !filterLowStock || isLowStock(ing);
    return matchesSearch && matchesCategory && matchesLowStock;
  });

  const expiringSoonCount = ingredients.filter((ing) => {
    if (!ing.expiryDate) return false;
    const expiry = new Date(ing.expiryDate);
    const today = new Date();
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 3;
  }).length;

  const expiredCount = ingredients.filter((ing) => {
    if (!ing.expiryDate) return false;
    const expiry = new Date(ing.expiryDate);
    return expiry < new Date();
  }).length;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
        {/* Low Stock Alert Banner */}
        {showLowStockBanner && lowStockCount > 0 && (
          <div className="mb-6">
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    setFilterLowStock(true);
                  }}
                  className="flex items-center gap-3 flex-1 text-left"
                >
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-amber-800 dark:text-amber-300">
                      {lowStockCount} ingredient{lowStockCount > 1 ? 's' : ''} running low
                    </p>
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      Quantity is {LOW_STOCK_THRESHOLD} or below — tap to filter
                    </p>
                  </div>
                </button>
                <div className="flex items-center gap-2 ml-4">
                  {reorderSuccess && (
                    <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                      <CheckCircle2 className="w-4 h-4" />
                      Added to shopping list
                    </span>
                  )}
                  <button
                    onClick={() => setShowLowStockBanner(false)}
                    className="p-1 text-amber-500 hover:text-amber-700 dark:hover:text-amber-200 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {filterLowStock && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Low stock items:</p>
                    <button
                      onClick={() => setFilterLowStock(false)}
                      className="text-sm text-amber-600 hover:text-amber-800 dark:hover:text-amber-200"
                    >
                      Show all
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {lowStockItems.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white dark:bg-zinc-800 rounded-lg p-3 border border-amber-200 dark:border-amber-800 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium text-zinc-900 dark:text-white text-sm">{item.name}</p>
                          <p className="text-xs text-amber-600 dark:text-amber-400">
                            {item.quantity} {item.unit} — {item.category}
                          </p>
                        </div>
                        <button
                          onClick={() => handleReorder(item as Ingredient)}
                          disabled={reorderLoading === item.id}
                          className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50 flex-shrink-0 ml-2"
                        >
                          {reorderLoading === item.id ? (
                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <>
                              <ShoppingCart className="w-3 h-3" />
                              Reorder
                            </>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">My Pantry</h1>
            <p className="text-zinc-600 dark:text-zinc-400 mt-1">Manage your ingredients</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowPhotoModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-lg transition-colors"
            >
              <Camera className="w-4 h-4" />
              Scan Photo
            </button>
            <button
              onClick={() => openModal()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Ingredient
            </button>
          </div>
        </div>

        {/* Alerts */}
        {(expiringSoonCount > 0 || expiredCount > 0) && (
          <div className="mb-6 space-y-2">
            {expiredCount > 0 && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{expiredCount} ingredient{expiredCount > 1 ? 's' : ''} expired</span>
              </div>
            )}
            {expiringSoonCount > 0 && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-700 dark:text-amber-400">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{expiringSoonCount} ingredient{expiringSoonCount > 1 ? 's' : ''} expiring soon</span>
              </div>
            )}
          </div>
        )}

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search ingredients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
          >
            <option value="All">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 text-center border border-zinc-200 dark:border-zinc-700">
            <p className="text-2xl font-bold text-zinc-900 dark:text-white">{ingredients.length}</p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Total Items</p>
          </div>
          <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 text-center border border-zinc-200 dark:border-zinc-700">
            <p className="text-2xl font-bold text-amber-600">{expiringSoonCount}</p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Expiring Soon</p>
          </div>
          <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 text-center border border-zinc-200 dark:border-zinc-700">
            <p className="text-2xl font-bold text-red-600">{expiredCount}</p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Expired</p>
          </div>
        </div>

        {/* Active filters indicator */}
        {filterLowStock && (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm text-amber-700 dark:text-amber-300">Filtering low stock items only</span>
            <button
              onClick={() => setFilterLowStock(false)}
              className="text-sm text-amber-600 hover:text-amber-800 dark:hover:text-amber-200 underline"
            >
              Clear filter
            </button>
          </div>
        )}

        {/* Ingredients Grid */}
        {filteredIngredients.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700">
            <Package className="w-16 h-16 mx-auto text-zinc-300 dark:text-zinc-600 mb-4" />
            <h3 className="text-lg font-medium text-zinc-900 dark:text-white">No ingredients found</h3>
            <p className="text-zinc-600 dark:text-zinc-400 mt-1">
              {searchQuery || filterCategory !== 'All' || filterLowStock ? 'Try adjusting your search or filters' : 'Add your first ingredient to get started'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredIngredients.map((ingredient) => {
              const expiryStatus = getExpiryStatus(ingredient.expiryDate);
              const low = isLowStock(ingredient);
              return (
                <div
                  key={ingredient.id}
                  className={`rounded-xl p-5 border transition-shadow hover:shadow-md ${
                    low
                      ? 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-300 dark:border-amber-700'
                      : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-zinc-900 dark:text-white">{ingredient.name}</h3>
                        {expiryStatus && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${expiryStatus.color}`}>
                            {expiryStatus.label}
                          </span>
                        )}
                        {low && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-600 text-white font-medium">
                            Low stock
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                        {ingredient.quantity} {ingredient.unit}
                      </p>
                      <span className="inline-block mt-2 text-xs px-2 py-1 bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 rounded">
                        {ingredient.category}
                      </span>
                      {ingredient.expiryDate && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-2">
                          Expires: {new Date(ingredient.expiryDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {low && (
                        <button
                          onClick={() => handleReorder(ingredient)}
                          disabled={reorderLoading === ingredient.id}
                          className="flex items-center gap-1 px-2 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                          title="Add to shopping list"
                        >
                          {reorderLoading === ingredient.id ? (
                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <ShoppingCart className="w-3 h-3" />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => openModal(ingredient)}
                        className="p-2 text-zinc-400 hover:text-blue-500 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(ingredient.id)}
                        className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-800 rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                {editingId ? 'Edit Ingredient' : 'Add Ingredient'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Ingredient Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="e.g., Tomatoes"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    required
                    min="0"
                    step="0.1"
                    className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Unit
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                  >
                    {UNITS.map((unit) => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Expiry Date (Optional)
                </label>
                <input
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? 'Saving...' : editingId ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Photo Recognition Modal */}
      {showPhotoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowPhotoModal(false); setPhotoPreview(null); setPhotoResults([]); }}>
          <div className="bg-white dark:bg-zinc-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Camera className="w-5 h-5 text-purple-500" />
                Scan Ingredients
              </h2>
              <button onClick={() => { setShowPhotoModal(false); setPhotoPreview(null); setPhotoResults([]); }} className="p-1 text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Take a photo or upload an image of ingredients to automatically identify them
              </p>

              {photoPreview && (
                <div className="relative rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700">
                  <img src={photoPreview} alt="Uploaded ingredient" className="w-full h-48 object-cover" />
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white"
              />

              {photoLoading && (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-3" />
                  <p className="text-zinc-600 dark:text-zinc-400">Analyzing photo...</p>
                </div>
              )}

              {photoError && !photoLoading && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                  <p className="text-sm text-red-600 dark:text-red-400">⚠️ {photoError}</p>
                </div>
              )}

              {photoResults.length > 0 && !photoLoading && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    Identified Ingredients
                  </h3>
                  {photoResults.map((ing, idx) => (
                    <div key={idx} className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl flex items-center justify-between">
                      <div>
                        <p className="font-bold text-zinc-900 dark:text-white">{ing.name}</p>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          {ing.quantity} {ing.unit} — {ing.category}
                        </p>
                      </div>
                      <button
                        onClick={() => addPhotoIngredient(ing)}
                        className="px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        Add to Pantry
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PantryContent;
