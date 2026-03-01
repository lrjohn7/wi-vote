import { useState, useCallback } from 'react';
import { BarChart3, X } from 'lucide-react';
import { WisconsinMap } from '@/shared/components/WisconsinMap';
import { MapLegend } from '@/features/election-map/components/MapLegend';
import { LiveResultsTicker } from './components/LiveResultsTicker';
import { ReportingProgress } from './components/ReportingProgress';
import { useLiveElections, useLiveResults } from './hooks/useLiveResults';
import { QueryErrorState } from '@/shared/components/QueryErrorState';
import type { MapDataResponse, WardMapEntry } from '@/features/election-map/hooks/useMapData';

export default function ElectionNight() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: elections, isLoading: electionsLoading, isError: electionsError, error: electionsErrorObj, refetch: electionsRefetch } = useLiveElections();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Auto-select active election or most recent
  const activeElection = elections?.find((e) => e.is_active);
  const effectiveDate = selectedDate ?? activeElection?.election_date ?? elections?.[0]?.election_date ?? null;

  const { data: liveData, isLoading: resultsLoading, isError: resultsError, error: resultsErrorObj, refetch: resultsRefetch } = useLiveResults(effectiveDate);

  // Convert live results to map data format
  const mapData: MapDataResponse | null = liveData
    ? {
        year: parseInt(effectiveDate?.slice(0, 4) ?? '2024'),
        raceType: liveData.races[0]?.race_type ?? 'president',
        wardCount: Object.keys(liveData.ward_results).length,
        data: Object.fromEntries(
          Object.entries(liveData.ward_results).map(([wardId, r]) => {
            const total = r.total_votes || 1;
            const entry: WardMapEntry = {
              demPct: (r.dem_votes / total) * 100,
              repPct: (r.rep_votes / total) * 100,
              margin: ((r.dem_votes - r.rep_votes) / total) * 100,
              totalVotes: r.total_votes,
              demVotes: r.dem_votes,
              repVotes: r.rep_votes,
              isEstimate: false,
            };
            return [wardId, entry];
          }),
        ),
      }
    : null;

  const handleWardClick = useCallback(() => {}, []);

  const noActiveElection = !electionsLoading && (!elections || elections.length === 0);

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="glass-panel flex items-center gap-4 rounded-none border-x-0 border-t-0 px-5 py-2.5">
        <h2 className="text-lg font-semibold">Election Night</h2>

        {activeElection && (
          <span className="flex items-center gap-1.5 text-sm text-green-500">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" aria-hidden="true" />
            Live
          </span>
        )}

        {elections && elections.length > 0 && (
          <select
            value={effectiveDate ?? ''}
            onChange={(e) => setSelectedDate(e.target.value || null)}
            className="rounded-md border border-border/30 bg-content2/50 px-3 py-1 text-sm"
            aria-label="Select election date"
          >
            {elections.map((e) => (
              <option key={e.election_date} value={e.election_date}>
                {e.election_name} {e.is_active ? '(Live)' : ''}
              </option>
            ))}
          </select>
        )}

        {resultsLoading && (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground" role="status" aria-label="Loading live results">
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" aria-hidden="true" />
            Updating...
          </span>
        )}

        {liveData && (
          <span className="ml-auto text-xs text-muted-foreground">
            Last poll: {new Date(liveData.last_poll).toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Main content */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Mobile toggle */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="absolute bottom-36 left-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-content1 shadow-lg border border-border/30 md:hidden"
          aria-label="Show results"
        >
          <BarChart3 className="h-5 w-5" />
        </button>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setSidebarOpen(false)} onKeyDown={(e) => { if (e.key === 'Escape') setSidebarOpen(false); }} role="presentation" />
        )}

        {/* Sidebar — mobile drawer + desktop static */}
        <aside className={`fixed inset-y-0 left-0 z-50 flex w-[85vw] max-w-sm flex-col gap-4 overflow-y-auto border-r border-border/30 bg-content1 p-4 transition-transform duration-300 md:relative md:inset-auto md:z-auto md:w-[360px] md:max-w-none md:translate-x-0 md:bg-content1/50 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          {/* Mobile close */}
          <div className="flex items-center justify-between md:hidden">
            <h3 className="text-sm font-semibold">Results</h3>
            <button onClick={() => setSidebarOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-content2" aria-label="Close results">
              <X className="h-4 w-4" />
            </button>
          </div>
          {(electionsError || resultsError) && (
            <div className="p-2">
              <QueryErrorState
                error={(electionsErrorObj ?? resultsErrorObj)!}
                onRetry={() => { electionsRefetch(); resultsRefetch(); }}
              />
            </div>
          )}
          {noActiveElection && !electionsError && (
            <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
              <div className="text-4xl">🗳️</div>
              <h3 className="text-lg font-semibold">No Active Election</h3>
              <p className="text-sm text-muted-foreground">
                Election night results will appear here when an election is in progress.
                Check back on election day for live ward-by-ward updates.
              </p>
              <div className="mt-4 rounded-xl border border-border/30 bg-content2/30 p-4 text-left text-xs text-muted-foreground">
                <p className="mb-2 font-medium text-foreground">How it works</p>
                <ul className="list-inside list-disc space-y-1">
                  <li>Results auto-refresh every 10 seconds during live elections</li>
                  <li>Ward-level results appear on the map as precincts report</li>
                  <li>Race summaries show statewide totals and margins</li>
                  <li>The map colors update in real-time as votes are counted</li>
                </ul>
              </div>
            </div>
          )}

          {liveData && (
            <>
              <ReportingProgress election={liveData.election} />
              <LiveResultsTicker races={liveData.races} />
            </>
          )}
        </aside>

        {/* Map area */}
        <div className="relative flex-1">
          <WisconsinMap
            mapData={mapData}
            onWardClick={handleWardClick}
          />

          <div className="absolute bottom-6 left-4 z-20">
            <MapLegend />
          </div>

          {/* Reporting overlay */}
          {liveData?.election.is_active && (
            <div className="absolute right-4 top-4 z-10">
              <div className="glass-panel flex items-center gap-2 rounded-lg px-3 py-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                <span className="text-sm font-medium">
                  {liveData.election.pct_reporting.toFixed(0)}% reporting
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
