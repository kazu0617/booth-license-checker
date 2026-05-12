import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, FileText, FilePlus2, Settings as SettingsIcon, Menu, X } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { cn } from '@/lib/cn';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/products', label: '商品一覧', icon: FileText, end: false },
  { to: '/manual', label: '手動登録', icon: FilePlus2, end: false },
  { to: '/settings', label: '設定', icon: SettingsIcon, end: false },
];

export function Layout() {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 w-60 transform border-r border-soft bg-[var(--bg-elevated)] transition-transform md:static md:translate-x-0',
          navOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-14 items-center justify-between border-b border-soft px-4">
            <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight" onClick={() => setNavOpen(false)}>
              <span className="inline-block h-2 w-2 rounded-full bg-accent" />
              License Viewer
            </Link>
            <button
              type="button"
              className="md:hidden focus-ring rounded-md p-1.5"
              aria-label="閉じる"
              onClick={() => setNavOpen(false)}
            >
              <X size={18} />
            </button>
          </div>
          <nav className="flex-1 space-y-0.5 p-2">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setNavOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'focus-ring flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-[var(--bg-hover)] text-[var(--fg)] font-medium'
                      : 'text-muted hover:bg-[var(--bg-hover)] hover:text-[var(--fg)]',
                  )
                }
              >
                <Icon size={16} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="border-t border-soft p-3 text-xs text-faint">
            BOOTH License Viewer
          </div>
        </div>
      </aside>

      {/* Backdrop on mobile */}
      {navOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={() => setNavOpen(false)}
        />
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-3 border-b border-soft bg-[var(--bg-elevated)]/90 px-4 backdrop-blur md:px-6">
          <button
            type="button"
            aria-label="メニュー"
            className="focus-ring rounded-md p-1.5 md:hidden"
            onClick={() => setNavOpen(true)}
          >
            <Menu size={18} />
          </button>
          <div className="flex-1 text-sm text-muted">
            {/* breadcrumb / title slot */}
          </div>
          <ThemeToggle />
        </header>
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto max-w-6xl animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
