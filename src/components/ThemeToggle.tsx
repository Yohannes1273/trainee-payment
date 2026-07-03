import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    // Default to dark mode if no saved preference, as the app is dark by default
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
    return 'dark'; // Defaulting to dark
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <button
      id="theme-toggle-btn"
      onClick={toggleTheme}
      className="flex items-center justify-center w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all duration-300 shadow-md border border-slate-200 dark:border-slate-700 cursor-pointer"
      aria-label="Toggle theme mode"
      title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
    >
      <div className="relative w-6 h-6 flex items-center justify-center">
        {theme === 'light' ? (
          <Sun className="w-5 h-5 text-amber-500 animate-spin-slow" />
        ) : (
          <Moon className="w-5 h-5 text-indigo-400" />
        )}
      </div>
    </button>
  );
}
