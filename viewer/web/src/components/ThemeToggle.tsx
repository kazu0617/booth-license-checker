import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { getTheme, toggleTheme, type Theme } from '@/lib/theme';

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    setTheme(getTheme());
  }, []);

  return (
    <button
      type="button"
      aria-label={theme === 'dark' ? 'ライトモードに切替' : 'ダークモードに切替'}
      onClick={() => setTheme(toggleTheme())}
      className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-md border border-soft hover:bg-[var(--bg-hover)] transition-colors"
    >
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
