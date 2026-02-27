import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  // Ward Trends tab state
  const [wardSearch, setWardSearch] = useState('');
  const [selectedWardId, setSelectedWardId] = useState<string | null>(null);
  const [wardRaceType, setWardRaceType] = useState('president');
  const { data: wardTrendData, isLoading: wardLoading } = useWardTrend(selectedWardId);

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

  const { data: areaTrendData, isLoading: areaLoading } = useAreaTrends(areaFilters);

  const handleWardSearchSubmit = () => {
    const trimmed = wardSearch.trim();
    if (trimmed) {
      setSelectedWardId(trimmed);
    }
  };

  // Find the trend for the selected race type
  const currentTrend = wardTrendData?.trends?.find((t) => t.race_type === wardRaceType);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b bg-background px-4 py-3">
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
            {/* Ward ID search */}
            <div className="flex gap-2">
              <Input
                placeholder="Enter ward ID (e.g., 55079001001)"
                value={wardSearch}
                onChange={(e) => setWardSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleWardSearchSubmit(); }}
              />
              <button
                className="shrink-0 rounded-md bg-primary px-4 text-sm text-primary-foreground hover:bg-primary/90"
                onClick={handleWardSearchSubmit}
              >
                Search
              </button>
            </div>

            {/* Race type selector */}
            <Select value={wardRaceType} onValueChange={setWardRaceType}>
              <SelectTrigger className="w-48">
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
              <p className="py-8 text-center text-muted-foreground">Loading trend data...</p>
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

            {!areaLoading && !areaTrendData && (
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
