'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCachedFetch } from '@/hooks/useCachedFetch';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShoppingCart, Plus, X, CheckCircle2, Circle, AlertCircle, Sparkles, Trash2, Edit2, Tag, Package, ShoppingBag } from 'lucide-react';
import Navbar from '@/components/Navbar';

interface ShoppingItem {
  id: string;
  item: string;
  quantity: string | null;
  unit: string | null;
  category: string | null;
  isPurchased: boolean;
  createdAt: string;
}

interface PantryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
}

function ShoppingListContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState({ item: '', quantity: '', unit: 'pcs', category: 'Other' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState('');
  const [generating, setGenerating] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'purchased'>('all');
  const [quickBuyItem, setQuickBuyItem] = useState<string | null>(null);

  const quickBuyPlatforms = [
    { name: 'BigBasket', color: '#6B2D8B', icon: '🛒', url: (item: string) => `https://www.bigbasket.com/ps/?q=${encodeURIComponent(item)}` },
    { name: 'Zepto', color: '#D32F2F', icon: '🔴', url: (item: string) => `https://www.zepto.com/search?q=${encodeURIComponent(item)}` },
    { name: 'Instamart', color: '#4ADE80', icon: '💚', url: (item: string) => `https://www.swiggy.com/instamart/search?q=${encodeURIComponent(item)}` },
  ];

  const { data: shoppingData, loading: shoppingLoading, refresh: refreshShopping } = useCachedFetch<ShoppingItem[]>('/api/shopping-list');
  const { data: pantryData, loading: pantryLoading, refresh: refreshPantry } = useCachedFetch<{ ingredients: PantryItem[] } | PantryItem[]>('/api/pantry');

  useEffect(() => {
    if (shoppingData) setItems(shoppingData);
  }, [shoppingData]);

  useEffect(() => {
    if (pantryData) {
      if (Array.isArray(pantryData)) {
        setPantryItems(pantryData);
      } else {
        setPantryItems(pantryData.ingredients || []);
      }
    }
  }, [pantryData]);

  useEffect(() => {
    if (shoppingData) setItems(shoppingData);
  }, [shoppingData]);

  useEffect(() => {
    if (pantryData) {
      if (Array.isArray(pantryData)) {
        setPantryItems(pantryData);
      } else {
        setPantryItems(pantryData.ingredients || []);
      }
    }
  }, [pantryData]);

  useEffect(() => {
    if (!user && !authLoading) {
      router.push('/login');
      return;
    }
    if (user) {
      setLoading(true);
      Promise.all([refreshShopping(), refreshPantry()]).finally(() => setLoading(false));
    }
  }, [authLoading, user]);

  const handleAddItem = async () => {
    if (!newItem.item.trim()) return;
    try {
      await fetch('/api/shopping-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
        credentials: 'include',
      });
      setNewItem({ item: '', quantity: '', unit: 'pcs', category: 'Other' });
      setShowAddModal(false);
      refreshShopping();
    } catch (error) {
      console.error('Failed to add item:', error);
    }
  };

  const handleToggle = async (id: string, current: boolean) => {
    try {
      await fetch(`/api/shopping-list/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPurchased: !current }),
        credentials: 'include',
      });
      refreshShopping();
    } catch (error) {
      console.error('Failed to toggle:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/shopping-list/${id}`, { method: 'DELETE', credentials: 'include' });
      refreshShopping();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const handleSaveEdit = async (id: string) => {
    try {
      await fetch(`/api/shopping-list/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: editingItem }),
        credentials: 'include',
      });
      setEditingId(null);
      refreshShopping();
    } catch (error) {
      console.error('Failed to edit:', error);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      await fetch('/api/shopping-list/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekStart: weekStart.toISOString() }),
        credentials: 'include',
      });
      refreshShopping();
    } catch (error) {
      console.error('Failed to generate:', error);
    } finally {
      setGenerating(false);
    }
  };

  const filteredItems = items.filter((item) => {
    if (filter === 'pending') return !item.isPurchased;
    if (filter === 'purchased') return item.isPurchased;
    return true;
  });

  const purchasedCount = items.filter((i) => i.isPurchased).length;
  const pendingCount = items.filter((i) => !i.isPurchased).length;

  const cleanItemName = (name: string) => name.replace(/^Auto-generated:\s*/i, '').trim();

  const getCategoryIcon = (category: string | null) => {
    const cat = category?.toLowerCase() || '';
    if (cat.includes('vegetable') || cat.includes('fruit')) return '🥬';
    if (cat.includes('dairy')) return '🥛';
    if (cat.includes('meat') || cat.includes('chicken') || cat.includes('fish')) return '🥩';
    if (cat.includes('grain') || cat.includes('bread')) return '🍞';
    if (cat.includes('spice')) return '🌶️';
    return '📦';
  };

  const getMissingFromPantry = () => {
    const pantryNames = new Set(pantryItems.map((p) => p.name.toLowerCase().trim()));
    return items
      .filter((item) => !item.isPurchased)
      .filter((item) => !pantryNames.has(item.item.toLowerCase().trim()));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-zinc-900 dark:to-zinc-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-zinc-600 dark:text-zinc-400">Loading shopping list...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-zinc-900 dark:to-zinc-800">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/dashboard" className="text-orange-500 hover:text-orange-600 text-sm mb-4 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
            <ShoppingCart className="w-8 h-8 text-orange-500" />
            Shopping List
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-2">Manage your shopping items</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 shadow-md text-center">
            <p className="text-2xl font-bold text-zinc-900 dark:text-white">{items.length}</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Total Items</p>
          </div>
          <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 shadow-md text-center">
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{pendingCount}</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Pending</p>
          </div>
          <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 shadow-md text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{purchasedCount}</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Purchased</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            {generating ? 'Generating...' : 'Auto-Generate from Meal Plan'}
          </button>
        </div>

        <div className="flex gap-2 mb-6">
          {(['all', 'pending', 'purchased'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-orange-500 text-white'
                  : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {getMissingFromPantry().length > 0 && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-medium mb-2">
              <AlertCircle className="w-4 h-4" />
              Not in Pantry
            </div>
            <p className="text-sm text-amber-600 dark:text-amber-300">
              These items are not in your pantry and may need to be purchased: {getMissingFromPantry().map((i) => cleanItemName(i.item)).join(', ')}
            </p>
          </div>
        )}

        <div className="space-y-3">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`bg-white dark:bg-zinc-800 rounded-xl shadow-md p-4 flex items-center gap-4 transition-all ${
                item.isPurchased ? 'opacity-60' : ''
              }`}
            >
              <button
                onClick={() => handleToggle(item.id, item.isPurchased)}
                className="flex-shrink-0"
              >
                {item.isPurchased ? (
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                ) : (
                  <Circle className="w-6 h-6 text-zinc-400 hover:text-orange-500" />
                )}
              </button>

              <span className="text-xl">{getCategoryIcon(item.category)}</span>

              <div className="flex-1 min-w-0">
                {editingId === item.id ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={cleanItemName(editingItem)}
                      onChange={(e) => setEditingItem(e.target.value)}
                      className="flex-1 px-3 py-1 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit(item.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                    />
                    <button onClick={() => handleSaveEdit(item.id)} className="text-green-500 text-sm font-medium">Save</button>
                    <button onClick={() => setEditingId(null)} className="text-zinc-400 text-sm">Cancel</button>
                  </div>
                ) : (
                  <div>
                    <p className={`font-medium text-zinc-900 dark:text-white ${item.isPurchased ? 'line-through' : ''}`}>
                      {cleanItemName(item.item)}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                      {item.quantity && <span>{item.quantity} {item.unit}</span>}
                      {item.category && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{item.category}</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-1">
                <button
                  onClick={() => setQuickBuyItem(item.item)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-medium transition-colors"
                >
                  <ShoppingBag className="w-3 h-3" />
                  Quick Buy
                </button>
                <button
                  onClick={() => {
                    setEditingId(item.id);
                    setEditingItem(item.item);
                  }}
                  className="p-2 text-zinc-400 hover:text-orange-500 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-zinc-800 rounded-2xl shadow-lg">
            <ShoppingCart className="w-16 h-16 text-zinc-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
              {filter === 'all' ? 'Your shopping list is empty' : `No ${filter} items`}
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              {filter === 'all'
                ? 'Add items manually or auto-generate from your meal plan'
                : `No ${filter} items in your list`}
            </p>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowAddModal(false)}>
          <div className="bg-white dark:bg-zinc-800 rounded-2xl max-w-md w-full p-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Add Item</h2>
              <button onClick={() => setShowAddModal(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-2xl">×</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Item Name *</label>
                <input
                  type="text"
                  value={newItem.item}
                  onChange={(e) => setNewItem({ ...newItem, item: e.target.value })}
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="e.g., Tomatoes"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Quantity</label>
                  <input
                    type="text"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                    className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                    placeholder="2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Unit</label>
                  <select
                    value={newItem.unit}
                    onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                    className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                  >
                    <option value="pcs">pcs</option>
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="ml">ml</option>
                    <option value="liters">liters</option>
                    <option value="pack">pack</option>
                    <option value="can">can</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Category</label>
                  <select
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                    className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                  >
                    <option value="Vegetables">Vegetables</option>
                    <option value="Fruits">Fruits</option>
                    <option value="Dairy">Dairy</option>
                    <option value="Meats">Meats</option>
                    <option value="Grains">Grains</option>
                    <option value="Spices">Spices</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Snacks">Snacks</option>
                    <option value="Condiments">Condiments</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleAddItem}
                disabled={!newItem.item.trim()}
                className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                Add to List
              </button>
            </div>
          </div>
        </div>
      )}

      {quickBuyItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setQuickBuyItem(null)}>
          <div className="bg-white dark:bg-zinc-800 rounded-2xl max-w-md w-full p-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Quick Buy</h2>
              <button onClick={() => setQuickBuyItem(null)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-2xl">×</button>
            </div>

            <p className="text-zinc-600 dark:text-zinc-400 mb-2">Buy</p>
            <p className="text-xl font-bold text-zinc-900 dark:text-white mb-6">"{cleanItemName(quickBuyItem)}"</p>

            <div className="space-y-3">
              {quickBuyPlatforms.map((platform) => (
                <a
                  key={platform.name}
                  href={platform.url(quickBuyItem)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors"
                  style={{ backgroundColor: `${platform.color}10` }}
                >
                  <span className="text-2xl">{platform.icon}</span>
                  <div className="flex-1">
                    <p className="font-bold text-zinc-900 dark:text-white">{platform.name}</p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Search & buy {cleanItemName(quickBuyItem)}</p>
                  </div>
                  <ShoppingBag className="w-5 h-5 text-zinc-400" />
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ShoppingListPage() {
  return <ShoppingListContent />;
}
