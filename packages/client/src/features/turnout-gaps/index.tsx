import { useState, useMemo } from 'react';
import { BarChart3 } from 'lucide-react';
import { usePageTitle } from '@/shared/hooks/usePageTitle';
import { useElections } from '@/features/election-map/hooks/useElections';
import { RACE_LABELS } from '@/shared/lib/raceLabels';
import { useTurnoutGaps } from './hooks/useTurnoutGaps';
import type { RaceType } from '@/types/election';

const NUMBER_FORMAT = new Intl.NumberFormat('en-US');

function fmt(n: number): string {
  return NUMBER_FORMAT.format(Math.round(n));
}

export default function TurnoutGaps() {
  usePageTitle('Votes Left on the Table');

  const { data: electionsData } = useElections();

  // Derive available years and race types from elections data
  const { years, raceTypes } = useMemo(() => {
    if (!electionsData?.elections) return { years: [], raceTypes: [] };
    const ys = [...new Set(electionsData.elections.map((e) => e.year))].sort((a, b) => b - a);
    const rts = [...new Set(electionsData.elections.map((e) => e.race_type))];
    return { years: ys, raceTypes: rts };
  }, [electionsData]);

  const [year, setYear] = useState<number | null>(null);
  const [raceType, setRaceType] = useState<RaceType | null>(null);
  const [party, setParty] = useState<'dem' | 'rep'>('dem');

  // Auto-select first year and race type when data loads
  useMemo(() => {
    if (years.length > 0 && !year) setYear(years[0]);
    if (raceTypes.length > 0 && !raceType) {
      // Prefer president if available
      const pref = raceTypes.find((rt) => rt === 'president');
      setRaceType((pref ?? raceTypes[0]) as RaceType);
    }
  }, [years, raceTypes, year, raceType]);

  const { data, isLoading, isError } = useTurnoutGaps(year, raceType, party);

  const partyColor = party === 'dem' ? 'text-wi-blue' : 'text-wi-red';

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="glass-panel flex flex-wrap items-center gap-4 rounded-none border-x-0 border-t-0 px-5 py-2.5">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">Votes Left on the Table</h1>
        </div>

        {/* Year selector */}
        <select
          value={year ?? ''}
          onChange={(e) => setYear(Number(e.target.value))}
          className="rounded-md border bg-background px-3 py-1.5 text-sm"
          aria-label="Election year"
        >
          {years.map((y)=>(
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        {/* Race type selector */}
        <select
          value={raceType ?? ''}
          onChange={(e) => setRaceType(e.target.value as RaceType)}
          className="rounded-md border bg-background px-3 py-1.5 text-sm"
          aria-label="Race type"
        >
          {raceTypes.map((rt)=>(
            <option key={rt} value={rt}>{RACE_LABELS[rt] ?? rt}</option>
          ))}
        </select>

        {/* Party toggle */}
        <div className="flex gap-1 rounded-lg bg-content2/60 p-1" role="radiogroup" aria-label="Party selection">
          <button
            onClick={() => setParty('dem')}
            role="radio"
            aria-checked={party === 'dem'}
            className={`rounded-md px-3 py-1 text-sm transition-colors ${party === 'dem' ? 'bg-wi-blue text-white font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Democratic
          </button>
          <button
            onClick={() => setParty('rep')}
            role="radio"
            aria-checked={party === 'rep'}
            className={`rounded-md px-3 py-1 text-sm transition-colors ${party === 'rep' ? 'bg-wi-red text-white font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Republican
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
          {/* Loading state */}
          {isLoading && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse rounded-lg border bg-content2/30 p-6">
                    <div className="h-8 w-24 rounded bg-content2/50" />
                    <div className="mt-2 h-4 w-16 rounded bg-content2/50" />
                  </div>
                ))}
              </div>
              <div className="animate-pulse rounded-lg border bg-content2/30 p-6">
                <div className="overflow-hidden space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-8 rounded bg-content2/50" />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Error state */}
          {isError && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-50 p-6 text-sm text-amber-800 dark:bg-amber-950/20 dark:text-amber-200">
              Failed to load turnout gap data. Please try a different election.
            </div>
          )}

          {/* Empty state */}
          {data && data.wards.length === 0 && (
            <div className="rounded-lg border bg-content2/30 p-8 text-center text-muted-foreground">
              No wards with untapped vote potential found for this election.
            </div>
          )}

          {/* Summary cards */}
          {data && data.wards.length > 0 && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-lg border bg-content2/30 p-4">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Total Potential Votes</div>
                  <div className={`mt-1 text-3xl font-bold ${partyColor}`}>{fmt(data.total_potential_votes)}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    additional {party === 'dem' ? 'Democratic' : 'Republican'} votes
                  </div>
                </div>

                <div className="rounded-lg border bg-content2/30 p-4">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Wards Below Average</div>
                  <div className="mt-1 text-3xl font-bold">{fmt(data.ward_count)}</div>
                  <div className="mt-1 text-xs text-muted-foreground">wards with untapped potential</div>
                </div>

                <div className="rounded-lg border bg-content2/30 p-4">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Avg Turnout Gap</div>
                  <div className="mt-1 text-3xl font-bold">{data.avg_gap.toFixed(1)}</div>
                  <div className="mt-1 text-xs text-muted-foreground">votes below county average</div>
                </div>
              </div>

              {/* Wards table */}
              <div className="rounded-lg border bg-content2/30">
                <div className="border-b px-4 py-3">
                  <h2 className="text-sm font-semibold">Top Wards with Untapped Potential</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-4 py-2">Ward</th>
                        <th className="px-4 py-2">County</th>
                        <th className="px-4 py-2 text-right">Votes</th>
                        <th className="px-4 py-2 text-right">County Avg</th>
                        <th className="px-4 py-2 text-right">Gap</th>
                        <th className="px-4 py-2 text-right">{party === 'dem' ? 'Dem %' : 'Rep %'}</th>
                        <th className="px-4 py-2 text-right">Potential</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.wards.map((w) => (
                        <tr key={w.ward_id} className="border-b last:border-b-0 hover:bg-content2/50">
                          <td className="px-4 py-2">
                            <div className="font-medium">{w.ward_name}</div>
                            <div className="text-xs text-muted-foreground">{w.municipality}</div>
                          </td>
                          <td className="px-4 py-2">{w.county}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{fmt(w.total_votes)}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{fmt(w.county_avg_turnout)}</td>
                          <td className="px-4 py-2 text-right tabular-nums text-amber-600">{w.turnout_gap.toFixed(1)}</td>
                          <td className={`px-4 py-2 text-right tabular-nums ${partyColor}`}>{w.party_pct.toFixed(1)}%</td>
                          <td className={`px-4 py-2 text-right tabular-nums font-bold ${partyColor}`}>+{fmt(w.potential_votes)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
