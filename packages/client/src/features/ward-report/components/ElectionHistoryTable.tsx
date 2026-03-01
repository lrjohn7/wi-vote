import { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ReportCardElection } from '@/services/api';
import { RACE_LABELS } from '@/shared/lib/raceLabels';

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'president', label: 'President' },
  { key: 'governor', label: 'Governor' },
  { key: 'us_senate', label: 'US Senate' },
  { key: 'state_assembly', label: 'Assembly' },
  { key: 'state_senate', label: 'Senate' },
] as const;

interface ElectionHistoryTableProps {
  elections: ReportCardElection[];
}

export function ElectionHistoryTable({ elections }: ElectionHistoryTableProps) {
  const [activeFilter, setActiveFilter] = useState('all');
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleTabKeyDown = useCallback((e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let newIndex = index;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      newIndex = (index + 1) % FILTER_TABS.length;
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      newIndex = (index - 1 + FILTER_TABS.length) % FILTER_TABS.length;
    } else {
      return;
    }
    setActiveFilter(FILTER_TABS[newIndex].key);
    tabRefs.current[newIndex]?.focus();
  }, []);

  const filtered = activeFilter === 'all'
    ? elections
    : elections.filter((e) => e.race_type === activeFilter);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Election History</CardTitle>
        <div role="tablist" aria-label="Filter by race type" className="flex flex-wrap gap-1 pt-2">
          {FILTER_TABS.map((tab, idx) => (
            <button
              key={tab.key}
              ref={(el) => { tabRefs.current[idx] = el; }}
              role="tab"
              aria-selected={activeFilter === tab.key}
              tabIndex={activeFilter === tab.key ? 0 : -1}
              onClick={() => setActiveFilter(tab.key)}
              onKeyDown={(e) => handleTabKeyDown(e, idx)}
              className={`rounded-md px-3 py-2 text-xs font-medium transition-colors sm:py-1.5 ${
                activeFilter === tab.key
                  ? 'bg-foreground text-background'
                  : 'bg-content2 text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">No elections for this filter.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-4">Year</th>
                  <th className="pb-2 pr-4">Race</th>
                  <th className="pb-2 pr-4 text-right">DEM</th>
                  <th className="pb-2 pr-4 text-right">REP</th>
                  <th className="pb-2 pr-4 text-right">Total</th>
                  <th className="pb-2 pr-2">Margin</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => {
                  const twoParty = e.dem_votes + e.rep_votes;
                  const demBarPct = twoParty > 0 ? (e.dem_votes / twoParty) * 100 : 50;
                  const marginLabel =
                    e.margin > 0
                      ? `D+${e.margin.toFixed(1)}`
                      : e.margin < 0
                        ? `R+${Math.abs(e.margin).toFixed(1)}`
                        : 'Even';
                  const marginClass = e.margin > 0 ? 'text-dem' : e.margin < 0 ? 'text-rep' : 'text-muted-foreground';

                  return (
                    <tr
                      key={`${e.election_year}-${e.race_type}`}
                      className="border-b last:border-b-0"
                    >
                      <td className="py-2 pr-4 font-medium">{e.election_year}</td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {RACE_LABELS[e.race_type] ?? e.race_type}
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums">
                        {e.dem_votes.toLocaleString()}
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums">
                        {e.rep_votes.toLocaleString()}
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums text-muted-foreground">
                        {e.total_votes.toLocaleString()}
                        {e.is_estimate && (
                          <span className="ml-0.5 text-amber-600">*</span>
                        )}
                      </td>
                      <td className="py-2 pr-2">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-16 overflow-hidden rounded-full bg-content2">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${demBarPct}%`,
                                backgroundColor: 'var(--dem)',
                              }}
                            />
                          </div>
                          <span
                            className={`text-xs font-semibold ${marginClass}`}
                          >
                            {marginLabel}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
