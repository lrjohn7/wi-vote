import { useState, useMemo, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { WardSearchBox } from '@/features/ward-explorer/components/WardSearchBox';
import { useWardSearch } from '@/features/ward-explorer/hooks/useWardSearch';
import { QueryErrorState } from '@/shared/components/QueryErrorState';
import { usePageTitle } from '@/shared/hooks/usePageTitle';
import { useWardTrend, useAreaTrends } from './hooks/useTrends';
import { TrendTimeSeries } from './components/TrendTimeSeries';
import { TrendClassificationBadge } from './components/TrendClassificationBadge';
import { AreaTrendSummary } from './components/AreaTrendSummary';
import { TrendSparklineGrid } from './components/TrendSparklineGrid';
import { TrendMapOverlay } from './components/TrendMapOverlay';

const RACE_OPTIONS = [
  { label: 'President', value: 'president' },
  { label: 'Governor', value: 'governor' },
  { label: 'US Senate', value: 'us_senate' },
  { label: 'State Senate', value: 'state_senate' },
  { label: 'State Assembly', value: 'state_assembly' },
];

export default function Trends() {
  usePageTitle('Partisan Trends');

  // Ward Trends tab state
  const [wardSearchQuery, setWardSearchQuery] = useState('');
  const [selectedWardId, setSelectedWardId] = useState<string | null>(null);
  const [wardRaceType, setWardRaceType] = useState('president');
  const { data: wardTrendData, isLoading: wardLoading, isError: wardError, error: wardErrorObj, refetch: wardRefetch } = useWardTrend(selectedWardId);
  const { data: wardSearchResults } = useWardSearch(wardSearchQuery);

  const handleWardSearch = useCallback((query: string) => {
    setWardSearchQuery(query);
  }, []);

  // Area Trends tab state
  const [areaFilterType, setAreaFilterType] = useState<'county' | 'district'>('county');
  const [areaFilterValue, setAreaFilterValue] = useState('');
  const [districtType, setDistrictType] = useState('congressional');
  const [districtId, setDistrictId] = useState('');

  const areaFilters = useMemo(() => {
    const filters: Record<string, string> = {};
    if (areaFilterType === 'county' && areaFilterValue) {
      filters.county = areaFilterValue;
    } else if (areaFilterType === 'district' && districtType && districtId) {
      filters.district_type = districtType;
      filters.district_id = districtId;
    }
    return filters;
  }, [areaFilterType, areaFilterValue, districtType, districtId]);

  const { data: areaTrendData, isLoading: areaLoading, isError: areaError, error: areaErrorObj, refetch: areaRefetch } = useAreaTrends(areaFilters);

  // Find the trend for the selected race type
  const currentTrend = wardTrendData?.trends?.find((t) => t.race_type === wardRaceType);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border/50 bg-background/80 px-5 py-2.5 backdrop-blur-sm">
        <h2 className="text-lg font-semibold">Partisan Trends</h2>
        <p className="text-sm text-muted-foreground">
          Explore how wards, municipalities, and counties have shifted over time.
        </p>
      </div>

      <Tabs defaultValue="ward" className="flex flex-1 flex-col overflow-hidden">
        <div className="border-b px-4">
          <TabsList className="h-9">
            <TabsTrigger value="ward">Ward Trends</TabsTrigger>
            <TabsTrigger value="area">Area Trends</TabsTrigger>
            <TabsTrigger value="map">Trend Map</TabsTrigger>
          </TabsList>
        </div>

        {/* Ward Trends Tab */}
        <TabsContent value="ward" className="flex-1 overflow-y-auto p-4">
          <div className="mx-auto max-w-3xl space-y-4">
            {/* Ward search */}
            <div className="relative">
              <WardSearchBox
                onSearch={handleWardSearch}
                placeholder="Search wards by name, municipality, or county..."
              />
              {wardSearchResults && wardSearchResults.results.length > 0 && wardSearchQuery.length >= 2 && !selectedWardId && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-xl border border-border/30 bg-content1 shadow-lg">
                  {wardSearchResults.results.slice(0, 8).map((ward) => (
                    <button
                      key={ward.ward_id}
                      className="w-full px-3 py-2 text-left text-sm transition-colors hover:bg-content2 rounded-lg"
                      onClick={() => {
                        setSelectedWardId(ward.ward_id);
                        setWardSearchQuery('');
                      }}
                    >
                      <div className="font-medium">{ward.ward_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {ward.municipality}, {ward.county} County
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Race type selector */}
            <Select value={wardRaceType} onValueChange={setWardRaceType}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RACE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Results */}
            {!selectedWardId && (
              <p className="py-8 text-center text-muted-foreground">
                Enter a ward ID above to view its partisan trend over time.
              </p>
            )}

            {wardLoading && (
              <div className="space-y-3 py-4">
                <div className="h-4 w-40 animate-pulse rounded bg-content2" />
                <div className="h-64 w-full animate-pulse rounded-xl bg-content2" />
              </div>
            )}

            {wardError && selectedWardId && (
              <QueryErrorState error={wardErrorObj!} onRetry={() => wardRefetch()} />
            )}

            {wardTrendData && !wardLoading && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-medium">Ward {wardTrendData.ward_id}</h3>
                  {currentTrend && (
                    <TrendClassificationBadge
                      direction={currentTrend.direction}
                      slope={currentTrend.slope}
                    />
                  )}
                </div>

                {wardTrendData.elections.length > 0 ? (
                  <TrendTimeSeries
                    elections={wardTrendData.elections}
                    raceType={wardRaceType}
                    trend={currentTrend}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No election history found for this ward.
                  </p>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Area Trends Tab */}
        <TabsContent value="area" className="flex-1 overflow-y-auto p-4">
          <div className="mx-auto max-w-4xl space-y-4">
            {/* Filter controls */}
            <div className="flex flex-wrap gap-3">
              <Select
                value={areaFilterType}
                onValueChange={(v) => setAreaFilterType(v as 'county' | 'district')}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="county">County</SelectItem>
                  <SelectItem value="district">District</SelectItem>
                </SelectContent>
              </Select>

              {areaFilterType === 'county' ? (
                <Input
                  placeholder="County name (e.g., DANE)"
                  value={areaFilterValue}
                  onChange={(e) => setAreaFilterValue(e.target.value)}
                  className="w-48"
                  onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                />
              ) : (
                <>
                  <Select value={districtType} onValueChange={setDistrictType}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="congressional">Congressional</SelectItem>
                      <SelectItem value="state_senate">State Senate</SelectItem>
                      <SelectItem value="assembly">Assembly</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="District #"
                    value={districtId}
                    onChange={(e) => setDistrictId(e.target.value)}
                    className="w-24"
                  />
                </>
              )}
            </div>

            {/* Results */}
            {areaLoading && (
              <p className="py-8 text-center text-muted-foreground">Loading area trends...</p>
            )}

            {areaError && (
              <QueryErrorState error={areaErrorObj!} onRetry={() => areaRefetch()} />
            )}

            {!areaLoading && !areaTrendData && !areaError && (
              <p className="py-8 text-center text-muted-foreground">
                Select a county or district to view aggregated trends.
              </p>
            )}

            {areaTrendData && !areaLoading && (
              <div className="space-y-6">
                <AreaTrendSummary
                  summary={areaTrendData.summary}
                  totalWards={areaTrendData.total_wards}
                />

                <div>
                  <h3 className="mb-2 text-sm font-medium">Ward Sparklines</h3>
                  <TrendSparklineGrid trends={areaTrendData.trends} />
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Trend Map Tab */}
        <TabsContent value="map" className="flex-1 overflow-hidden">
          <TrendMapOverlay />
        </TabsContent>
      </Tabs>
    </div>
  );
}
