import { NavLink, Outlet } from 'react-router';
import { Map, Search, TrendingUp, SlidersHorizontal, Scale, ClipboardList, GitCompareArrows, Sun, Moon, Monitor } from 'lucide-react';
import { useThemeStore } from '@/stores/themeStore';

const navItems = [
  { to: '/map', label: 'Election Map', icon: Map, end: false },
  { to: '/supreme-court', label: 'Supreme Court', icon: Scale, end: false },
  { to: '/wards', label: 'Ward Explorer', icon: Search, end: true },
  { to: '/wards/report', label: 'My Ward', icon: ClipboardList, end: false },
  { to: '/trends', label: 'Trends', icon: TrendingUp, end: false },
  { to: '/modeler', label: 'Swing Modeler', icon: SlidersHorizontal, end: false },
  { to: '/compare', label: 'Compare', icon: GitCompareArrows, end: false },
];

function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();

  const cycle = () => {
    const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
    setTheme(next);
  };

  const Icon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;
  const label = theme === 'light' ? 'Light mode' : theme === 'dark' ? 'Dark mode' : 'System theme';

  return (
    <button
      onClick={cycle}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-content2 hover:text-foreground"
      aria-label={label}
      title={label}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

export default function App() {
  return (
    <div className="flex h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-background focus:px-4 focus:py-2 focus:shadow-lg"
      >
        Skip to content
      </a>
      <header role="banner" className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b border-border/40 bg-background/80 px-4 shadow-sm backdrop-blur-xl sm:px-6">
        <NavLink to="/" className="flex items-center gap-0.5 text-lg font-bold tracking-tight transition-transform hover:scale-105">
          <span className="text-wi-blue">WI</span>
          <span className="text-wi-red">-Vote</span>
        </NavLink>
        <nav role="navigation" aria-label="Main navigation" className="flex items-center overflow-x-auto rounded-xl bg-content2/60 p-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-background font-medium text-foreground shadow-md'
                    : 'text-muted-foreground hover:bg-background/50 hover:text-foreground'
                }`
              }
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </header>
      <main id="main-content" role="main" className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
