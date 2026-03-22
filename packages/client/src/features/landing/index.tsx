import { NavLink } from 'react-router';
import {
  Map,
  Search,
  TrendingUp,
  SlidersHorizontal,
  Scale,
  ArrowRight,
  MapPin,
  Calendar,
  Vote,
  Database,
} from 'lucide-react';
import { MetricCard } from '@/shared/components/MetricCard';

const features = [
  {
    to: '/map',
    icon: Map,
    title: 'Election Map',
    description:
      'Explore ward-level results for every statewide Wisconsin election from 2012-2024. Toggle between margin, party %, and total votes.',
    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  {
    to: '/modeler',
    icon: SlidersHorizontal,
    title: 'Swing Modeler',
    description:
      'Model "what-if" scenarios by adjusting statewide, regional, and demographic swing. See projected results update across all 7,000 wards in real time.',
    color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  },
  {
    to: '/trends',
    icon: TrendingUp,
    title: 'Partisan Trends',
    description:
      'Discover which wards and counties are shifting Democratic or Republican over time. Statistically classified with trend lines and sparklines.',
    color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  {
    to: '/wards',
    icon: Search,
    title: 'Ward Explorer',
    description:
      'Look up any ward by name, municipality, or address. View full election history, district assignments, and partisan lean scores.',
    color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  {
    to: '/supreme-court',
    icon: Scale,
    title: 'Supreme Court',
    description:
      'Analyze Wisconsin Supreme Court spring election results with ward-level maps and candidate breakdowns.',
    color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  },
];

const stats = [
  {
    icon: MapPin,
    label: 'Wards Tracked',
    value: '~7,000',
    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  {
    icon: Calendar,
    label: 'Elections Covered',
    value: '2012-2024',
    color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  {
    icon: Vote,
    label: 'Race Types',
    value: '9+',
    color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  },
  {
    icon: Database,
    label: 'Data Source',
    value: 'LTSB',
    color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
];

export default function LandingPage() {
  return (
    <div className="h-full overflow-y-auto">
      {/* Accent line */}
      <div className="h-1 bg-gradient-to-r from-wi-blue via-purple-500 to-wi-red" />

      {/* Hero section */}
      <section className="relative overflow-hidden border-b border-border/40 bg-gradient-to-b from-content2/50 to-background px-4 py-12 sm:py-20">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-content2/50 px-4 py-1.5 text-xs font-medium text-muted-foreground">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            Ward-Level Election Intelligence
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            <span className="text-wi-blue">Wisconsin</span>{' '}
            <span className="text-wi-red">Election Data</span>
            <br />
            <span className="text-foreground">At Ward Level</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Explore election results, model future outcomes, and discover partisan
            trends across all ~7,000 Wisconsin wards. Built on official data from
            the Legislative Technology Services Bureau.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <NavLink
              to="/map"
              className="inline-flex items-center gap-2 rounded-lg bg-wi-blue px-5 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:bg-wi-blue/90 hover:shadow-xl"
            >
              <Map className="h-4 w-4" />
              Open Election Map
              <ArrowRight className="h-4 w-4" />
            </NavLink>
            <NavLink
              to="/wards"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-5 py-2.5 text-sm font-medium transition-colors hover:bg-content2"
            >
              <Search className="h-4 w-4" />
              Find My Ward
            </NavLink>
          </div>
        </div>

        {/* Decorative gradient line */}
        <div className="pointer-events-none absolute -bottom-px left-0 right-0 h-px bg-gradient-to-r from-transparent via-wi-blue/30 to-transparent" />
      </section>

      {/* Stats bar — MetricCards */}
      <section className="border-b border-border/40 bg-content2/20 px-4 py-6">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s) => (
            <MetricCard
              key={s.label}
              icon={s.icon}
              label={s.label}
              value={s.value}
              color={s.color}
            />
          ))}
        </div>
      </section>

      {/* Feature cards */}
      <section className="px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-8 text-center text-2xl font-bold">What You Can Do</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ to, icon: Icon, title, description, color }) => (
              <NavLink
                key={to}
                to={to}
                className="group rounded-xl border border-border/50 bg-background p-5 transition-all duration-200 hover:border-border hover:shadow-lg hover:shadow-wi-blue/5"
              >
                <div className={`mb-3 inline-flex rounded-lg p-2.5 ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mb-1.5 font-semibold group-hover:text-wi-blue">
                  {title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>
                <div className="mt-3 flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors group-hover:text-wi-blue">
                  Explore
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </div>
              </NavLink>
            ))}
          </div>
        </div>
      </section>

      {/* Data transparency note */}
      <section className="border-t border-border/40 bg-content2/20 px-4 py-8">
        <div className="mx-auto max-w-2xl text-center">
          <h3 className="mb-2 font-semibold">Open Data, Transparent Methods</h3>
          <p className="text-sm text-muted-foreground">
            All election data comes from Wisconsin&apos;s Legislative Technology Services Bureau
            (LTSB) ArcGIS Open Data Portal. Ward-level results from combined reporting
            units are population-weighted estimates and are clearly marked throughout the app.
          </p>
        </div>
      </section>
    </div>
  );
}
