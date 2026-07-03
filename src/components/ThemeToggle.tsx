import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { isHighContrast, toggleTheme } = useTheme();

  return (
    <button
      id="theme-toggle-btn"
      onClick={toggleTheme}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-medium text-xs transition-all duration-300 active:scale-95 cursor-pointer ${
        isHighContrast
          ? 'bg-slate-950 text-white border-black hover:bg-black'
          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
      }`}
      aria-label="Toggle high contrast accessibility mode"
      title={isHighContrast ? "Switch to Professional Light" : "Switch to High-Visibility Mode"}
    >
      {isHighContrast ? (
        <>
          <Eye className="h-4 w-4 text-amber-400 animate-pulse" />
          <span>High Visibility On</span>
        </>
      ) : (
        <>
          <EyeOff className="h-4 w-4 text-indigo-600" />
          <span>High Visibility Off</span>
        </>
      )}
    </button>
  );
}
