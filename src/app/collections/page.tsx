'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCachedFetch } from '@/hooks/useCachedFetch';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FolderOpen, Plus, X, Edit2, Trash2, Bookmark, Clock, Star, Utensils, ChefHat } from 'lucide-react';
import Navbar from '@/components/Navbar';

interface CollectionRecipe {
  id: string;
  title: string;
  description: string;
  cookingTime: number;
  servings: number;
  difficulty: string;
  cuisine: string;
  mealType: string;
  image: string | null;
}

interface Collection {
  id: string;
  name: string;
  description: string | null;
  savedRecipes: Array<{
    id: string;
    recipe: CollectionRecipe;
  }>;
}

export const dynamic = 'force-dynamic';

function CollectionsContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddToCollectionModal, setShowAddToCollectionModal] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<{ id: string; title: string } | null>(null);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [searchTerm, setSearchTerm] = useState('');

  const { data: collectionsData, loading: collectionsLoading, refresh: refreshCollections } = useCachedFetch<Collection[]>('/api/collections', { enabled: !!user });

  useEffect(() => {
    if (collectionsData) setCollections(collectionsData);
  }, [collectionsData]);

  useEffect(() => {
    if (!user && !authLoading) {
      router.push('/login');
      return;
    }
    if (user) {
      setLoading(true);
      refreshCollections().finally(() => setLoading(false));
    }
  }, [authLoading, user]);

  const handleCreateCollection = async () => {
    if (!formData.name.trim()) return;
    try {
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setFormData({ name: '', description: '' });
        setShowCreateModal(false);
        refreshCollections();
      }
    } catch (error) {
      console.error('Failed to create collection:', error);
    }
  };

  const handleUpdateCollection = async () => {
    if (!editingCollection || !formData.name.trim()) return;
    try {
      const res = await fetch('/api/collections', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingCollection.id,
          name: formData.name,
          description: formData.description,
        }),
      });
      if (res.ok) {
        setEditingCollection(null);
        setFormData({ name: '', description: '' });
        refreshCollections();
      }
    } catch (error) {
      console.error('Failed to update collection:', error);
    }
  };

  const handleDeleteCollection = async (id: string) => {
    if (!confirm('Delete this collection? Recipes will not be deleted.')) return;
    try {
      const res = await fetch(`/api/collections?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        refreshCollections();
      }
    } catch (error) {
      console.error('Failed to delete collection:', error);
    }
  };

  const handleAddToCollection = async (collectionId: string) => {
    if (!selectedRecipe) return;
    try {
      const res = await fetch('/api/collections/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeId: selectedRecipe.id, collectionId }),
      });
      if (res.ok) {
        setShowAddToCollectionModal(false);
        setSelectedRecipe(null);
        refreshCollections();
      }
    } catch (error) {
      console.error('Failed to add to collection:', error);
    }
  };

  const handleRemoveFromCollection = async (savedRecipeId: string) => {
    try {
      const res = await fetch(`/api/collections/remove?savedRecipeId=${savedRecipeId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        refreshCollections();
      }
    } catch (error) {
      console.error('Failed to remove from collection:', error);
    }
  };

  const totalRecipes = collections.reduce((sum, c) => sum + c.savedRecipes.length, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-zinc-900 dark:to-zinc-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-zinc-600 dark:text-zinc-400">Loading collections...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-zinc-900 dark:to-zinc-800">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/dashboard" className="text-orange-500 hover:text-orange-600 text-sm mb-4 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
            <FolderOpen className="w-8 h-8 text-orange-500" />
            Collections
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-2">Organize your saved recipes into collections</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 shadow-md text-center">
            <p className="text-2xl font-bold text-zinc-900 dark:text-white">{collections.length}</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Collections</p>
          </div>
          <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 shadow-md text-center">
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{totalRecipes}</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Total Recipes</p>
          </div>
          <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 shadow-md text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {collections.filter(c => c.savedRecipes.length > 0).length}
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Active</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Collection
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {collections.map((collection) => (
            <div
              key={collection.id}
              className="bg-white dark:bg-zinc-800 rounded-2xl shadow-lg overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <FolderOpen className="w-6 h-6 text-orange-500" />
                    <div>
                      <h3 className="font-bold text-zinc-900 dark:text-white text-lg">{collection.name}</h3>
                      {collection.description && (
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">{collection.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setEditingCollection(collection);
                        setFormData({ name: collection.name, description: collection.description || '' });
                      }}
                      className="p-2 text-zinc-400 hover:text-orange-500 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCollection(collection.id)}
                      className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                  <Bookmark className="w-4 h-4" />
                  <span>{collection.savedRecipes.length} recipes</span>
                </div>

                {collection.savedRecipes.length > 0 ? (
                  <div className="space-y-3">
                    {collection.savedRecipes.slice(0, 3).map(({ recipe }) => (
                      <div key={recipe.id} className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-700/50 rounded-lg">
                        {recipe.image ? (
                          <img src={recipe.image} alt={recipe.title} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                            <Utensils className="w-6 h-6 text-orange-500" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-zinc-900 dark:text-white text-sm truncate">{recipe.title}</p>
                          <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {recipe.cookingTime} min
                            </span>
                            <span className="flex items-center gap-1">
                              <Star className="w-3 h-3" />
                              {recipe.difficulty}
                            </span>
                            <span className="flex items-center gap-1">
                              <ChefHat className="w-3 h-3" />
                              {recipe.cuisine}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveFromCollection(
                            collection.savedRecipes.find(r => r.recipe.id === recipe.id)?.id || ''
                          )}
                          className="p-1 text-zinc-400 hover:text-red-500 flex-shrink-0"
                          title="Remove from collection"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {collection.savedRecipes.length > 3 && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center">
                        +{collection.savedRecipes.length - 3} more
                      </p>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setSelectedRecipe(null);
                      setShowAddToCollectionModal(true);
                    }}
                    className="w-full py-2 border-2 border-dashed border-zinc-300 dark:border-zinc-600 rounded-lg text-zinc-500 dark:text-zinc-400 hover:border-orange-500 hover:text-orange-500 transition-colors text-sm"
                  >
                    Add Recipes
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {collections.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-zinc-800 rounded-2xl shadow-lg">
            <FolderOpen className="w-16 h-16 text-zinc-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">No collections yet</h3>
            <p className="text-zinc-600 dark:text-zinc-400">Create your first collection to organize recipes</p>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white dark:bg-zinc-800 rounded-2xl max-w-md w-full p-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">New Collection</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-2xl">×</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="e.g., Quick Meals"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="Optional description..."
                  rows={3}
                />
              </div>

              <button
                onClick={handleCreateCollection}
                disabled={!formData.name.trim()}
                className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                Create Collection
              </button>
            </div>
          </div>
        </div>
      )}

      {editingCollection && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setEditingCollection(null)}>
          <div className="bg-white dark:bg-zinc-800 rounded-2xl max-w-md w-full p-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Edit Collection</h2>
              <button onClick={() => setEditingCollection(null)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-2xl">×</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                  rows={3}
                />
              </div>

              <button
                onClick={handleUpdateCollection}
                disabled={!formData.name.trim()}
                className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddToCollectionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowAddToCollectionModal(false)}>
          <div className="bg-white dark:bg-zinc-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Add to Collection</h2>
                {selectedRecipe && (
                  <p className="text-zinc-600 dark:text-zinc-400 text-sm mt-1">{selectedRecipe.title}</p>
                )}
              </div>
              <button onClick={() => setShowAddToCollectionModal(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-2xl">×</button>
            </div>

            {selectedRecipe ? (
              <div className="space-y-3">
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">Choose a collection:</p>
                {collections.map((collection) => (
                  <button
                    key={collection.id}
                    onClick={() => handleAddToCollection(collection.id)}
                    className="w-full p-4 border-2 border-zinc-200 dark:border-zinc-700 rounded-xl hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <FolderOpen className="w-5 h-5 text-orange-500" />
                      <div>
                        <p className="font-medium text-zinc-900 dark:text-white">{collection.name}</p>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">{collection.savedRecipes.length} recipes</p>
                      </div>
                    </div>
                  </button>
                ))}
                {collections.length === 0 && (
                  <p className="text-center text-zinc-500 dark:text-zinc-400 py-8">No collections yet. Create one first!</p>
                )}
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  placeholder="Search your saved recipes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none mb-4"
                />
                <div className="space-y-3">
                  {collections
                    .flatMap(c => c.savedRecipes.map(sr => ({ ...sr.recipe, savedRecipeId: sr.id })))
                    .filter(r => r.title.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((recipe) => (
                      <button
                        key={recipe.id}
                        onClick={() => setSelectedRecipe({ id: recipe.id, title: recipe.title })}
                        className="w-full p-4 border-2 border-zinc-200 dark:border-zinc-700 rounded-xl hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors text-left"
                      >
                        <p className="font-medium text-zinc-900 dark:text-white">{recipe.title}</p>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{recipe.cookingTime} min · {recipe.difficulty}</p>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CollectionsPage() {
  return <CollectionsContent />;
}
