import { redirect } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { Heart, Clock, TrendingUp, Utensils, Plus, ChefHat, Package, Calendar } from 'lucide-react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getServerAuth } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const auth = await getServerAuth();

  if (!auth) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    include: {
      ingredients: {
        orderBy: { createdAt: 'desc' },
        take: 3,
      },
      savedRecipes: true,
      mealPlans: true,
    },
  });

  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const expiringSoonCount = await prisma.ingredient.count({
    where: {
      userId: auth.userId,
      expiryDate: {
        gte: now,
        lte: sevenDaysFromNow,
      },
    },
  });

  const stats = [
    { label: 'Total Ingredients', value: String(user?.ingredients.length ?? 0), icon: Heart, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
    { label: 'Expiring Soon', value: String(expiringSoonCount), icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { label: 'Saved Recipes', value: String(user?.savedRecipes.length ?? 0), icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-amber-900/20' },
    { label: 'Meals Planned', value: String(user?.mealPlans.length ?? 0), icon: Utensils, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
  ];

  const quickActions = [
    { href: '/pantry', label: 'Manage Pantry', desc: 'Add or remove ingredients', icon: Plus },
    { href: '/recipes', label: 'Discover Recipes', desc: 'Find dishes with your ingredients', icon: ChefHat },
  ];

  const recentlyAdded = user?.ingredients ?? [];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
            Welcome back, {auth.name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            What would you like to cook today?
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm border border-zinc-200 dark:border-zinc-700"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">{stat.label}</p>
                    <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.bg}`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm border border-zinc-200 dark:border-zinc-700 hover:border-orange-300 dark:hover:border-orange-700 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-orange-100 dark:bg-orange-900/30 group-hover:bg-orange-200 dark:group-hover:bg-orange-900/50 transition-colors">
                    <Icon className={`w-6 h-6 ${action.label === 'Manage Pantry' ? 'text-orange-500' : 'text-orange-500'}`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">{action.label}</h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">{action.desc}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* What Can You Cook Today */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl p-8 text-white">
          <h2 className="text-2xl font-bold mb-2">What can you cook today?</h2>
          <p className="text-orange-100 mb-4">
            Tell us what ingredients you have, and we&apos;ll suggest delicious recipes!
          </p>
          <Link
            href="/recipes"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-orange-600 font-medium rounded-lg hover:bg-orange-50 transition-colors"
          >
            <ChefHat className="w-5 h-5" />
            Find Recipes Now
          </Link>
        </div>

        {/* Recently Added Ingredients */}
        <div className="mt-8 bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm border border-zinc-200 dark:border-zinc-700">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-4">Recently Added to Pantry</h2>
          {recentlyAdded.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentlyAdded.map((ingredient) => {
                const isExpiringSoon = ingredient.expiryDate && ingredient.expiryDate <= threeDaysFromNow;
                return (
                  <div
                    key={ingredient.id}
                    className={`rounded-lg border p-4 transition-colors ${
                      isExpiringSoon
                        ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20'
                        : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${isExpiringSoon ? 'bg-amber-100 dark:bg-amber-900/40' : 'bg-zinc-100 dark:bg-zinc-700'}`}>
                        <Package className={`w-5 h-5 ${isExpiringSoon ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-500 dark:text-zinc-400'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                          {ingredient.name}
                        </h3>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                          {ingredient.quantity} {ingredient.unit}
                        </p>
                        {ingredient.expiryDate ? (
                          <div className="flex items-center gap-1 mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                            <Calendar className="w-3 h-3" />
                            <span>
                              {isExpiringSoon ? (
                                <span className="text-amber-600 dark:text-amber-400 font-medium">
                                  ⚠️ Expires {ingredient.expiryDate.toLocaleDateString()}
                                </span>
                              ) : (
                                `Expires ${ingredient.expiryDate.toLocaleDateString()}`
                              )}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                            <Calendar className="w-3 h-3" />
                            <span>No expiry</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
              <Heart className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Start adding ingredients to your pantry to see them here</p>
              <Link
                href="/pantry"
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Your First Ingredient
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
