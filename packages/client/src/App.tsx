import { NavLink, Outlet } from 'react-router';
import { Map, Search, TrendingUp, SlidersHorizontal } from 'lucide-react';

const navItems = [
  { to: '/map', label: 'Election Map', icon: Map },
  { to: '/wards', label: 'Ward Explorer', icon: Search },
  { to: '/trends', label: 'Trends', icon: TrendingUp },
  { to: '/modeler', label: 'Swing Modeler', icon: SlidersHorizontal },
];

export default function App() {
  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-14 items-center gap-6 border-b bg-background px-4">
        <NavLink to="/" className="flex items-center gap-2 font-bold">
          <span className="text-wi-blue">WI</span>
          <span className="text-wi-red">-Vote</span>
        </NavLink>
        <nav className="flex items-center gap-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-accent font-medium text-accent-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
