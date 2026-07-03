import React, { createContext, useContext, useEffect, useState } from 'react';

interface ThemeContextType {
  isHighContrast: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isHighContrast, setIsHighContrast] = useState<boolean>(() => {
    const saved = localStorage.getItem('tvet-high-contrast');
    return saved === 'true';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    const body = window.document.body;
    
    // Constraint 1: Do not use a 'Dark Mode'. Remove any standard 'dark' class.
    root.classList.remove('dark');
    body.classList.remove('dark');
    
    if (isHighContrast) {
      root.classList.add('high-contrast-mode');
      body.classList.add('high-contrast-mode');
    } else {
      root.classList.remove('high-contrast-mode');
      body.classList.remove('high-contrast-mode');
    }
    
    localStorage.setItem('tvet-high-contrast', String(isHighContrast));
  }, [isHighContrast]);

  const toggleTheme = () => {
    setIsHighContrast((prev) => !prev);
  };

  return (
    <ThemeContext.Provider value={{ isHighContrast, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
