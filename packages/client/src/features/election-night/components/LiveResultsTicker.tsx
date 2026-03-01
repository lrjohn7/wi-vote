import { memo } from 'react';
import type { LiveRaceSummary } from '../hooks/useLiveResults';

const RACE_LABELS: Record<string, string> = {
  president: 'President',
  governor: 'Governor',
  us_senate: 'US Senate',
  us_house: 'US House',
  state_senate: 'State Senate',
  state_assembly: 'State Assembly',
  attorney_general: 'Attorney General',
  secretary_of_state: 'Secretary of State',
  treasurer: 'Treasurer',
};

interface LiveResultsTickerProps {
  races: LiveRaceSummary[];
}

export const LiveResultsTicker = memo(function LiveResultsTicker({
  races,
}: LiveResultsTickerProps) {
  if (races.length === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground">
        No results reported yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {races.map((race) => {
        const leadingDem = race.margin > 0;
        const marginLabel = race.margin > 0
          ? `D+${race.margin.toFixed(1)}`
          : race.margin < 0
            ? `R+${Math.abs(race.margin).toFixed(1)}`
            : 'Even';
        const demBarPct = race.total_votes > 0
          ? (race.total_dem_votes / (race.total_dem_votes + race.total_rep_votes)) * 100
          : 50;

        return (
          <div
            key={race.race_type}
            className="rounded-xl border border-border/30 bg-content2/50 p-3"
          >
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-medium">
                {RACE_LABELS[race.race_type] ?? race.race_type}
              </span>
              <span
                className={`text-sm font-bold ${leadingDem ? 'text-dem' : 'text-rep'}`}
              >
                {marginLabel}
              </span>
            </div>

            {/* Two-party bar */}
            <div
              className="mb-1.5 flex h-3 overflow-hidden rounded-full"
              role="img"
              aria-label={`Democrat ${demBarPct.toFixed(0)}%, Republican ${(100 - demBarPct).toFixed(0)}%`}
            >
              <div
                className="transition-all duration-500"
                style={{ width: `${demBarPct}%`, backgroundColor: 'var(--dem)' }}
              />
              <div
                className="transition-all duration-500"
                style={{ width: `${100 - demBarPct}%`, backgroundColor: 'var(--rep)' }}
              />
            </div>

            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                DEM {race.total_dem_votes.toLocaleString()} ({race.dem_pct.toFixed(1)}%)
              </span>
              <span>
                REP {race.total_rep_votes.toLocaleString()} ({race.rep_pct.toFixed(1)}%)
              </span>
            </div>

            {/* Reporting progress */}
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-content2">
                <div
                  className="h-full rounded-full bg-amber-400 transition-all duration-500"
                  style={{ width: `${race.pct_reporting}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {race.pct_reporting.toFixed(0)}% reporting
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
});
