import { useState, useMemo } from 'react';
import { Info, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePageTitle } from '@/shared/hooks/usePageTitle';
import { QueryErrorState } from '@/shared/components/QueryErrorState';
import {
  useSpringContests,
  useSpringResults,
  useSpringCountySummary,
} from './hooks/useSpringElections';
import type { SpringContest } from './hooks/useSpringElections';

type ViewMode = 'reporting-units' | 'counties';

export default function SupremeCourt() {
  usePageTitle('Supreme Court Elections');

  const { data: contestsData, isError: contestsError, error: contestsErrorObj } = useSpringContests();

  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [viewMode, setViewMode] = useState<ViewMode>('counties');
  const [countyFilter, setCountyFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  const contest: SpringContest | undefined = contestsData?.contests.find(
    (c) => c.year === selectedYear,
  );

  const { data: resultsData, isLoading: resultsLoading, isError: resultsError, error: resultsErrorObj } = useSpringResults(
    viewMode === 'reporting-units' ? selectedYear : null,
    countyFilter || undefined,
    searchQuery || undefined,
    page,
    50,
  );

  const { data: countyData, isLoading: countyLoading, isError: countyError, error: countyErrorObj } = useSpringCountySummary(
    viewMode === 'counties' ? selectedYear : null,
  );

  // Filter county summary client-side for search
  const filteredCounties = useMemo(() => {
    if (!countyData?.counties) return [];
    if (!searchQuery) return countyData.counties;
    const q = searchQuery.toLowerCase();
    return countyData.counties.filter((c) => c.county.toLowerCase().includes(q));
  }, [countyData, searchQuery]);

  const years = contestsData?.contests.map((c) => c.year) ?? [];
  const totalPages = resultsData ? Math.ceil(resultsData.total / resultsData.page_size) : 0;

  const handleYearChange = (val: string) => {
    setSelectedYear(Number(val));
    setPage(1);
  };

  return (
    <div className="flex h-full w-full max-w-full flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-border/30 bg-content1 px-4 py-4 md:px-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-bold sm:text-2xl">Wisconsin Supreme Court Elections</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Spring election results by reporting unit
            </p>
          </div>
          {contest && (
            <div className="sm:text-right">
              <div className="text-sm text-muted-foreground">
                {contest.election_date
                  ? new Date(contest.election_date + 'T00:00:00').toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : contest.year}
              </div>
              <div className="mt-1 text-lg font-semibold">
                {contest.total_votes.toLocaleString()} total votes
              </div>
            </div>
          )}
        </div>

        {/* Statewide summary */}
        {contest && <StatewideSummary contest={contest} />}

        {/* Disclaimer */}
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-xs text-amber-800">
            <strong>Why no map?</strong> Wisconsin Supreme Court elections are spring nonpartisan
            races. The Wisconsin Elections Commission reports results at the{' '}
            <em>reporting unit</em> level, where a single reporting unit may combine multiple
            wards (e.g., "Town of Westport Wards 1-4"). Unlike November general elections, the
            Legislative Technology Services Bureau (LTSB) has not disaggregated these results to
            individual ward boundaries. Until that data is available, we display results in table
            format grouped by county and reporting unit.
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/30 px-3 py-3 sm:gap-3 sm:px-4 md:px-6">
        <Select value={String(selectedYear)} onValueChange={handleYearChange}>
          <SelectTrigger className="w-[80px] sm:w-[100px]">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={viewMode} onValueChange={(v) => { setViewMode(v as ViewMode); setPage(1); }}>
          <SelectTrigger className="w-[130px] sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="reporting-units">By Reporting Unit</SelectItem>
            <SelectItem value="counties">By County</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative min-w-0 flex-1 basis-[120px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            placeholder={viewMode === 'counties' ? 'Search counties...' : 'Search reporting units...'}
            className="pl-9"
          />
        </div>

        {viewMode === 'reporting-units' && (
          <Input
            value={countyFilter}
            onChange={(e) => { setCountyFilter(e.target.value); setPage(1); }}
            placeholder="Filter by county..."
            className="w-36 sm:w-48"
          />
        )}

        {(resultsLoading || countyLoading) && (
          <span className="text-sm text-muted-foreground">Loading...</span>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-3 py-4 sm:px-4 md:px-6">
        {contestsError && (
          <QueryErrorState error={contestsErrorObj!} />
        )}
        {viewMode === 'reporting-units' && resultsError && (
          <QueryErrorState error={resultsErrorObj!} />
        )}
        {viewMode === 'counties' && countyError && (
          <QueryErrorState error={countyErrorObj!} />
        )}
        {viewMode === 'reporting-units' && resultsData && resultsData.results.length === 0 && (
          <p className="py-8 text-center text-muted-foreground">No reporting units found matching your filters.</p>
        )}
        {viewMode === 'reporting-units' && resultsData && resultsData.results.length > 0 && (
          <ReportingUnitTable
            results={resultsData.results}
            contest={contest}
          />
        )}
        {viewMode === 'counties' && countyData && filteredCounties.length === 0 && (
          <p className="py-8 text-center text-muted-foreground">No counties found matching your search.</p>
        )}
        {viewMode === 'counties' && countyData && filteredCounties.length > 0 && (
          <CountyTable counties={filteredCounties} />
        )}
      </div>

      {/* Pagination (reporting units only) */}
      {viewMode === 'reporting-units' && resultsData && totalPages > 1 && (
        <nav aria-label="Reporting units pagination" className="flex items-center justify-between border-t border-border/30 px-3 py-3 sm:px-4 md:px-6">
          <span className="text-sm text-muted-foreground">
            {resultsData.total.toLocaleString()} reporting units
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </nav>
      )}
    </div>
  );
}

function StatewideSummary({ contest }: { contest: SpringContest }) {
  const c1Pct = contest.total_votes > 0
    ? (contest.candidate_1_total / contest.total_votes) * 100
    : 0;
  const c2Pct = contest.total_votes > 0
    ? (contest.candidate_2_total / contest.total_votes) * 100
    : 0;
  const twoParty = contest.candidate_1_total + contest.candidate_2_total;
  const c1Bar = twoParty > 0 ? (contest.candidate_1_total / twoParty) * 100 : 50;

  return (
    <div className="mt-4 rounded-xl border border-border/30 bg-content2 p-4" aria-label={`Statewide results: ${contest.candidate_1_name} vs ${contest.candidate_2_name}`}>
      <div className="mb-2 flex items-center justify-between">
        <span className="font-medium text-rep" aria-label={`Conservative candidate: ${contest.candidate_1_name}`}>
          {contest.candidate_1_name}
        </span>
        <span className="font-medium text-dem" aria-label={`Liberal candidate: ${contest.candidate_2_name}`}>
          {contest.candidate_2_name}
        </span>
      </div>
      <div className="mb-2 flex h-4 overflow-hidden rounded-full" role="img" aria-label={`Vote bar: ${c1Pct.toFixed(1)}% to ${c2Pct.toFixed(1)}%`}>
        <div
          style={{ width: `${c1Bar}%`, backgroundColor: 'var(--rep)' }}
          className="transition-all"
        />
        <div
          style={{ width: `${100 - c1Bar}%`, backgroundColor: 'var(--dem)' }}
          className="transition-all"
        />
      </div>
      <div className="flex items-center justify-between text-sm">
        <span>
          {contest.candidate_1_total.toLocaleString()} ({c1Pct.toFixed(1)}%)
        </span>
        <Badge variant={c2Pct > c1Pct ? 'default' : 'secondary'} className="mx-2">
          {c2Pct > c1Pct
            ? `${contest.candidate_2_name.split(' ').pop()} +${(c2Pct - c1Pct).toFixed(1)}`
            : `${contest.candidate_1_name.split(' ').pop()} +${(c1Pct - c2Pct).toFixed(1)}`}
        </Badge>
        <span>
          {contest.candidate_2_total.toLocaleString()} ({c2Pct.toFixed(1)}%)
        </span>
      </div>
    </div>
  );
}

function ReportingUnitTable({
  results,
  contest,
}: {
  results: Array<{
    id: number;
    county: string;
    reporting_unit: string;
    candidate_1_name: string;
    candidate_1_votes: number;
    candidate_1_pct: number;
    candidate_2_name: string;
    candidate_2_votes: number;
    candidate_2_pct: number;
    total_votes: number;
    margin: number;
  }>;
  contest?: SpringContest;
}) {
  return (
    <div className="rounded-xl border border-border/30 overflow-x-auto">
    <table className="w-full text-sm">
      <thead className="sticky top-0 bg-content1/95 backdrop-blur-sm">
        <tr className="border-b border-border/30 text-left">
          <th className="px-2 py-2.5 text-xs font-medium uppercase tracking-wider sm:px-4">County</th>
          <th className="hidden px-4 py-2.5 text-xs font-medium uppercase tracking-wider sm:table-cell">Reporting Unit</th>
          <th className="px-2 py-2.5 text-xs font-medium uppercase tracking-wider text-right sm:px-4">
            {contest?.candidate_1_name.split(' ').pop() ?? 'Cand. 1'}
          </th>
          <th className="px-2 py-2.5 text-xs font-medium uppercase tracking-wider text-right sm:px-4">
            {contest?.candidate_2_name.split(' ').pop() ?? 'Cand. 2'}
          </th>
          <th className="hidden px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-right sm:table-cell">Total</th>
          <th className="px-2 py-2.5 text-xs font-medium uppercase tracking-wider w-20 sm:w-40 sm:px-4">Result</th>
        </tr>
      </thead>
      <tbody>
        {results.map((r) => (
          <tr key={r.id} className="border-b border-border/30 hover:bg-content2 transition-colors">
            <td className="whitespace-nowrap px-2 py-2 font-medium sm:px-4">
              {r.county}
              <div className="text-xs font-normal text-muted-foreground sm:hidden">{r.reporting_unit}</div>
            </td>
            <td className="hidden px-4 py-2 sm:table-cell">{r.reporting_unit}</td>
            <td className="px-2 py-2 text-right tabular-nums sm:px-4">
              {r.candidate_1_votes.toLocaleString()}
              <span className="ml-1 text-xs text-muted-foreground">
                ({r.candidate_1_pct.toFixed(1)}%)
              </span>
            </td>
            <td className="px-2 py-2 text-right tabular-nums sm:px-4">
              {r.candidate_2_votes.toLocaleString()}
              <span className="ml-1 text-xs text-muted-foreground">
                ({r.candidate_2_pct.toFixed(1)}%)
              </span>
            </td>
            <td className="hidden px-4 py-2 text-right tabular-nums sm:table-cell">
              {r.total_votes.toLocaleString()}
            </td>
            <td className="px-2 py-2 sm:px-4">
              <MarginBar margin={r.margin} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}

function CountyTable({
  counties,
}: {
  counties: Array<{
    county: string;
    candidate_1_name: string;
    candidate_1_votes: number;
    candidate_2_name: string;
    candidate_2_votes: number;
    total_votes: number;
    margin: number;
    reporting_units: number;
  }>;
}) {
  if (counties.length === 0) return null;

  return (
    <div className="rounded-xl border border-border/30 overflow-x-auto">
    <table className="w-full text-sm">
      <thead className="sticky top-0 bg-content1/95 backdrop-blur-sm">
        <tr className="border-b border-border/30 text-left">
          <th className="px-2 py-2.5 text-xs font-medium uppercase tracking-wider sm:px-4">County</th>
          <th className="px-2 py-2.5 text-xs font-medium uppercase tracking-wider text-right sm:px-4">
            {counties[0].candidate_1_name.split(' ').pop()}
          </th>
          <th className="px-2 py-2.5 text-xs font-medium uppercase tracking-wider text-right sm:px-4">
            {counties[0].candidate_2_name.split(' ').pop()}
          </th>
          <th className="hidden px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-right sm:table-cell">Total</th>
          <th className="hidden px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-right md:table-cell">Units</th>
          <th className="px-2 py-2.5 text-xs font-medium uppercase tracking-wider w-20 sm:w-48 sm:px-4">Result</th>
        </tr>
      </thead>
      <tbody>
        {counties.map((c) => {
          const c1Pct = c.total_votes > 0 ? (c.candidate_1_votes / c.total_votes) * 100 : 0;
          const c2Pct = c.total_votes > 0 ? (c.candidate_2_votes / c.total_votes) * 100 : 0;
          return (
            <tr key={c.county} className="border-b border-border/30 hover:bg-content2 transition-colors">
              <td className="whitespace-nowrap px-2 py-2 font-medium sm:px-4">{c.county}</td>
              <td className="px-2 py-2 text-right tabular-nums sm:px-4">
                {c.candidate_1_votes.toLocaleString()}
                <span className="ml-1 text-xs text-muted-foreground">
                  ({c1Pct.toFixed(1)}%)
                </span>
              </td>
              <td className="px-2 py-2 text-right tabular-nums sm:px-4">
                {c.candidate_2_votes.toLocaleString()}
                <span className="ml-1 text-xs text-muted-foreground">
                  ({c2Pct.toFixed(1)}%)
                </span>
              </td>
              <td className="hidden px-4 py-2 text-right tabular-nums sm:table-cell">
                {c.total_votes.toLocaleString()}
              </td>
              <td className="hidden px-4 py-2 text-right tabular-nums md:table-cell">{c.reporting_units}</td>
              <td className="px-2 py-2 sm:px-4">
                <MarginBar margin={c.margin} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
    </div>
  );
}

function MarginBar({ margin }: { margin: number }) {
  // margin: positive = candidate 1 (conservative) leads, negative = candidate 2 (liberal) leads
  const absMargin = Math.abs(margin);
  const barWidth = Math.min(absMargin, 60); // Cap at 60% width for visual
  const isC1 = margin > 0;

  return (
    <div className="flex items-center gap-1" role="img" aria-label={`Margin: ${isC1 ? '+' : ''}${margin.toFixed(1)} points`}>
      <div className="hidden h-3 w-full items-center sm:flex">
        {/* Left half (conservative) */}
        <div className="flex h-full w-1/2 justify-end">
          {isC1 && (
            <div
              className="h-full rounded-l"
              style={{
                width: `${(barWidth / 60) * 100}%`,
                backgroundColor: 'var(--rep)',
              }}
            />
          )}
        </div>
        {/* Center line */}
        <div className="h-full w-px bg-border" />
        {/* Right half (liberal) */}
        <div className="flex h-full w-1/2">
          {!isC1 && (
            <div
              className="h-full rounded-r"
              style={{
                width: `${(barWidth / 60) * 100}%`,
                backgroundColor: 'var(--dem)',
              }}
            />
          )}
        </div>
      </div>
      <span
        className={`whitespace-nowrap text-right text-xs font-medium tabular-nums sm:w-14 ${isC1 ? 'text-rep' : 'text-dem'}`}
      >
        {isC1 ? '+' : ''}{margin.toFixed(1)}
      </span>
    </div>
  );
}
