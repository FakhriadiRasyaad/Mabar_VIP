'use client';

import { useEffect, useState } from 'react';

interface ThemeToggleProps {
  className?: string;
  compact?: boolean;
}

export default function ThemeToggle({
  className = '',
  compact = false,
}: ThemeToggleProps) {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const syncTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };

    syncTheme();
    window.addEventListener('mabar_theme_change', syncTheme);
    window.addEventListener('storage', syncTheme);

    return () => {
      window.removeEventListener('mabar_theme_change', syncTheme);
      window.removeEventListener('storage', syncTheme);
    };
  }, []);

  const setTheme = (toDark: boolean) => {
    if (toDark) {
      document.documentElement.classList.add('dark');
      try {
        localStorage.setItem('mabar_theme', 'dark');
      } catch {}
    } else {
      document.documentElement.classList.remove('dark');
      try {
        localStorage.setItem('mabar_theme', 'light');
      } catch {}
    }

    setIsDark(toDark);
    window.dispatchEvent(
      new CustomEvent('mabar_theme_change', { detail: { isDark: toDark } })
    );
  };

  if (!mounted) {
    return (
      <div className={`inline-flex items-center rounded-xl border-2 border-nb-black bg-nb-cream p-1 ${className}`}>
        <span className="text-xs font-bold px-2 py-1">🌓 THEME</span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center rounded-xl border-2 border-nb-black shadow-nb-sm bg-nb-cream p-1 gap-1 select-none font-mono ${className}`}
      role="group"
      aria-label="Mode Tema Tampilan"
    >
      <button
        type="button"
        onClick={() => setTheme(false)}
        className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg transition-all cursor-pointer border ${
          !isDark
            ? 'bg-nb-yellow text-[#1A1A2E] border-nb-black shadow-[1px_1px_0px_#1A1A2E] font-black'
            : 'bg-transparent text-nb-gray-500 border-transparent hover:text-nb-black font-bold'
        }`}
        title="Aktifkan Mode Terang (Light Mode)"
        aria-pressed={!isDark}
      >
        <span>☀️</span>
        {!compact && <span>Light</span>}
      </button>

      <button
        type="button"
        onClick={() => setTheme(true)}
        className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg transition-all cursor-pointer border ${
          isDark
            ? 'bg-nb-yellow text-[#1A1A2E] border-nb-black shadow-[1px_1px_0px_#1A1A2E] font-black'
            : 'bg-transparent text-nb-gray-500 border-transparent hover:text-nb-black font-bold'
        }`}
        title="Aktifkan Mode Gelap (Dark Mode)"
        aria-pressed={isDark}
      >
        <span>🌙</span>
        {!compact && <span>Dark</span>}
      </button>
    </div>
  );
}
