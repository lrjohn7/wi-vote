import { NavLink, Outlet } from 'react-router';
import { Map, Search, TrendingUp, SlidersHorizontal, Scale, ClipboardList, GitCompareArrows } from 'lucide-react';

const navItems = [
  { to: '/map', label: 'Election Map', icon: Map, end: false },
  { to: '/supreme-court', label: 'Supreme Court', icon: Scale, end: false },
  { to: '/wards', label: 'Ward Explorer', icon: Search, end: true },
  { to: '/wards/report', label: 'My Ward', icon: ClipboardList, end: false },
  { to: '/trends', label: 'Trends', icon: TrendingUp, end: false },
  { to: '/modeler', label: 'Swing Modeler', icon: SlidersHorizontal, end: false },
  { to: '/compare', label: 'Compare', icon: GitCompareArrows, end: false },
];

export default function App() {
  return (
    <div className="flex h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:shadow-lg"
      >
        Skip to content
      </a>
      <header role="banner" className="sticky top-0 z-50 flex h-16 items-center gap-6 border-b border-border/50 bg-background/80 px-6 shadow-sm backdrop-blur-md">
        <NavLink to="/" className="flex items-center gap-1 text-lg font-bold tracking-tight">
          <span className="text-wi-blue">WI</span>
          <span className="text-wi-red">-Vote</span>
        </NavLink>
        <nav role="navigation" aria-label="Main navigation" className="flex items-center overflow-x-auto rounded-lg bg-muted/50 p-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-background font-semibold text-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-background/50 hover:text-foreground'
                }`
              }
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main id="main-content" role="main" className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
