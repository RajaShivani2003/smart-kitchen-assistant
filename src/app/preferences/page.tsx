'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCachedFetch } from '@/hooks/useCachedFetch';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Settings, Save, X, Heart, Target, Shield } from 'lucide-react';
import Navbar from '@/components/Navbar';

const dietaryOptions = [
  { value: 'vegetarian', label: 'Vegetarian', emoji: '🥬' },
  { value: 'vegan', label: 'Vegan', emoji: '🌱' },
  { value: 'gluten-free', label: 'Gluten-Free', emoji: '🌾' },
  { value: 'dairy-free', label: 'Dairy-Free', emoji: '🥛' },
  { value: 'keto', label: 'Keto', emoji: '🥑' },
  { value: 'paleo', label: 'Paleo', emoji: '🍖' },
  { value: 'halal', label: 'Halal', emoji: '☪️' },
  { value: 'kosher', label: 'Kosher', emoji: '✡️' },
  { value: 'nut-free', label: 'Nut-Free', emoji: '🥜' },
  { value: 'low-sodium', label: 'Low-Sodium', emoji: '🧂' },
];

const healthGoalOptions = [
  { value: 'weight-loss', label: 'Weight Loss', emoji: '⚖️' },
  { value: 'muscle-gain', label: 'Muscle Gain', emoji: '💪' },
  { value: 'maintenance', label: 'Maintenance', emoji: '⚡' },
  { value: 'better-energy', label: 'Better Energy', emoji: '🔋' },
  { value: 'better-digestion', label: 'Better Digestion', emoji: '🦠' },
  { value: 'heart-health', label: 'Heart Health', emoji: '❤️' },
  { value: 'bone-health', label: 'Bone Health', emoji: '🦴' },
  { value: 'immunity', label: 'Immunity Boost', emoji: '🛡️' },
];

export const dynamic = 'force-dynamic';

function PreferencesContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dietaryPreferences, setDietaryPreferences] = useState<string[]>([]);
  const [healthGoals, setHealthGoals] = useState<string>('');

  const { data: userData, loading: userLoading, refresh: refreshUser } = useCachedFetch<{ user: any; session?: { user: any } }>('/api/user', { enabled: !!user });

  useEffect(() => {
    if (userData) {
      const user = userData.user || userData.session?.user;
      if (user?.dietaryPreferences) {
        setDietaryPreferences(user.dietaryPreferences.split(',').filter(Boolean));
      }
      if (user?.healthGoals) {
        setHealthGoals(user.healthGoals);
      }
      setLoading(false);
    }
  }, [userData]);

  useEffect(() => {
    if (!user && !authLoading) {
      router.push('/login');
      return;
    }
    if (user) {
      setLoading(true);
      refreshUser().catch(() => setLoading(false));
    }
  }, [authLoading, user]);

  const toggleDietaryPreference = (value: string) => {
    setDietaryPreferences((prev) =>
      prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dietaryPreferences: dietaryPreferences.join(','),
          healthGoals: healthGoals || null,
        }),
      });

      if (res.ok) {
        setSaved(true);
        router.refresh();
        setTimeout(() => setSaved(false), 3000);
      } else {
        const data = await res.json();
        console.error('Save failed:', data.error);
      }
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-zinc-900 dark:to-zinc-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-zinc-600 dark:text-zinc-400">Loading preferences...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-zinc-900 dark:to-zinc-800">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/dashboard" className="text-orange-500 hover:text-orange-600 text-sm mb-4 inline-block">
          ← Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
          <Settings className="w-8 h-8 text-orange-500" />
          Preferences
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-2">Customize your dietary preferences and health goals</p>

        {saved && (
          <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-600 dark:text-green-400 text-center font-medium">
            ✓ Preferences saved successfully!
          </div>
        )}

        <div className="mt-8 space-y-8">
          <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-6 h-6 text-orange-500" />
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Dietary Preferences</h2>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">Select your dietary preferences to filter recipes accordingly</p>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {dietaryOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => toggleDietaryPreference(option.value)}
                  className={`p-4 rounded-xl border-2 transition-all text-center ${
                    dietaryPreferences.includes(option.value)
                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                      : 'border-zinc-200 dark:border-zinc-700 hover:border-orange-300 dark:hover:border-orange-700'
                  }`}
                >
                  <span className="text-2xl block mb-1">{option.emoji}</span>
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{option.label}</span>
                </button>
              ))}
            </div>

            {dietaryPreferences.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {dietaryPreferences.map((pref) => {
                  const option = dietaryOptions.find((o) => o.value === pref);
                  return (
                    <span
                      key={pref}
                      className="flex items-center gap-1 px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full text-sm"
                    >
                      {option?.emoji} {option?.label}
                      <button onClick={() => toggleDietaryPreference(pref)} className="ml-1 text-orange-500 hover:text-orange-700">×</button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <Target className="w-6 h-6 text-orange-500" />
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Health Goals</h2>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">Select your primary health goal (comma-separated for multiple)</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {healthGoalOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    const current = healthGoals.split(',').map((s) => s.trim()).filter(Boolean);
                    if (current.includes(option.value)) {
                      setHealthGoals(current.filter((v) => v !== option.value).join(', '));
                    } else {
                      setHealthGoals([...current, option.value].join(', '));
                    }
                  }}
                  className={`p-4 rounded-xl border-2 transition-all text-center ${
                    healthGoals.includes(option.value)
                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                      : 'border-zinc-200 dark:border-zinc-700 hover:border-orange-300 dark:hover:border-orange-700'
                  }`}
                >
                  <span className="text-2xl block mb-1">{option.emoji}</span>
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{option.label}</span>
                </button>
              ))}
            </div>

            {healthGoals && (
              <div className="flex flex-wrap gap-2">
                {healthGoals.split(',').map((goal) => {
                  const trimmed = goal.trim();
                  if (!trimmed) return null;
                  const option = healthGoalOptions.find((o) => o.value === trimmed);
                  return (
                    <span
                      key={trimmed}
                      className="flex items-center gap-1 px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full text-sm"
                    >
                      {option?.emoji} {option?.label}
                      <button onClick={() => {
                        const current = healthGoals.split(',').map((s) => s.trim()).filter(Boolean);
                        setHealthGoals(current.filter((v) => v !== trimmed).join(', '));
                      }} className="ml-1 text-orange-500 hover:text-orange-700">×</button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PreferencesPage() {
  return <PreferencesContent />;
}
