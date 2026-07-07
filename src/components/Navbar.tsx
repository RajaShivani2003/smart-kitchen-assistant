'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChefHat,
  ShoppingCart,
  Calendar,
  Heart,
  BarChart3,
  LogOut,
  Menu,
  X,
  FolderOpen,
  Settings,
  Sparkles,
  Camera,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, loading } = useAuth();

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: ChefHat },
    { href: '/pantry', label: 'Pantry', icon: Heart },
    { href: '/match', label: 'Match Recipes', icon: Sparkles },
    { href: '/recipes', label: 'Recipes', icon: BarChart3 },
    { href: '/meal-plan', label: 'Meal Plan', icon: Calendar },
    { href: '/shopping-list', label: 'Shopping List', icon: ShoppingCart },
    { href: '/chat', label: 'Cooking Assistant', icon: Sparkles },
    { href: '/saved-recipes', label: 'Saved', icon: Heart },
    { href: '/collections', label: 'Collections', icon: FolderOpen },
    { href: '/receipt-scanner', label: 'Receipt Scanner', icon: Camera },
    { href: '/preferences', label: 'Preferences', icon: Settings },
  ];

  const isActive = (href: string) => pathname === href;

  const handleLogout = () => {
    document.cookie = 'session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    router.push('/login');
  };

  if (!user && !loading) {
    return (
      <>
        <nav className="hidden md:flex items-center justify-between px-8 py-4 bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 shadow-sm">
          <div className="flex items-center gap-2">
            <ChefHat className="w-6 h-6 text-orange-500" />
            <Link href="/dashboard" className="text-xl font-bold text-zinc-900 dark:text-white">
              Smart Kitchen
            </Link>
          </div>
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/login')}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
            >
              Login
            </button>
          </div>
        </nav>
        <nav className="md:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center gap-2">
            <ChefHat className="w-6 h-6 text-orange-500" />
            <span className="text-lg font-bold text-zinc-900 dark:text-white">Smart Kitchen</span>
          </div>
          <button
            onClick={() => router.push('/login')}
            className="px-4 py-2 text-sm font-medium text-orange-600"
          >
            Login
          </button>
        </nav>
      </>
    );
  }

  return (
    <>
      {/* Desktop Navbar */}
      <nav className="hidden md:flex items-center justify-between px-8 py-4 bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 shadow-sm">
        <div className="flex items-center gap-2">
          <ChefHat className="w-6 h-6 text-orange-500" />
          <Link href="/dashboard" className="text-xl font-bold text-zinc-900 dark:text-white">
            Smart Kitchen
          </Link>
        </div>

        <div className="flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            {user.name}
          </span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </nav>

      {/* Mobile Navbar */}
      <nav className="md:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center gap-2">
          <ChefHat className="w-6 h-6 text-orange-500" />
          <span className="text-lg font-bold text-zinc-900 dark:text-white">
            Smart Kitchen
          </span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-zinc-600 dark:text-zinc-400"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      {mobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 px-4 py-2 space-y-1">
          <span className="block px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400">
            {user.name}
          </span>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              handleLogout();
            }}
            className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      )}
    </>
  );
}
