import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { MapPin, ClipboardList, Search as SearchIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { WardSearchBox } from './components/WardSearchBox';
import { useWardSearch } from './hooks/useWardSearch';
import { useWardDetail } from '@/features/election-map/hooks/useWardDetail';
import { useMapStore } from '@/stores/mapStore';

const RACE_LABELS: Record<string, string> = {
  president: 'President',
  governor: 'Governor',
  us_senate: 'US Senate',
  us_house: 'US House',
  state_senate: 'State Senate',
  state_assembly: 'State Assembly',
  attorney_general: 'AG',
  secretary_of_state: 'SoS',
  treasurer: 'Treasurer',
};

export default function WardExplorer() {
  const navigate = useNavigate();
  const setSelectedWard = useMapStore((s) => s.setSelectedWard);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWardId, setSelectedWardId] = useState<string | null>(null);
  const [addressInput, setAddressInput] = useState('');
  const [geocodeLoading, setGeocodeLoading] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  const { data: searchResults, isLoading: searchLoading } = useWardSearch(searchQuery);
  const { data: wardDetail, isLoading: detailLoading } = useWardDetail(selectedWardId);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (query.length < 2) setSelectedWardId(null);
  }, []);

  const handleGeocodeAddress = async () => {
    if (!addressInput.trim()) return;
    setGeocodeLoading(true);
    setGeocodeError(null);
    try {
      const res = await fetch(
        `/api/v1/wards/geocode?address=${encodeURIComponent(addressInput)}&lat=0&lng=0`,
      );
      if (!res.ok) {
        if (res.status === 400) {
          setGeocodeError('This address is not in Wisconsin. Please enter a Wisconsin address.');
        } else {
          setGeocodeError('Address not found. Please enter a valid street address.');
        }
        return;
      }
      const data = await res.json();
      if (data.ward) {
        setSelectedWardId(data.ward.ward_id);
      } else {
        setGeocodeError('No ward found at that address.');
      }
    } catch {
      setGeocodeError('Geocoding failed. Please try again.');
    } finally {
      setGeocodeLoading(false);
    }
  };

  const handleViewOnMap = (wardId: string) => {
    setSelectedWard(wardId);
    navigate('/map');
  };

  return (
    <div className="flex h-full">
      {/* Left panel: Search */}
      <div className="flex w-96 flex-col border-r border-border/30 bg-content1">
        <div className="space-y-4 p-4">
          <h2 className="text-xl font-bold">Ward Explorer</h2>

          {/* Ward search */}
          <WardSearchBox onSearch={handleSearch} />

          {/* Address lookup */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Or look up by address
            </label>
            <div className="flex gap-2">
              <Input
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                placeholder="123 Main St, Madison, WI"
                onKeyDown={(e) => e.key === 'Enter' && handleGeocodeAddress()}
              />
              <Button
                onClick={handleGeocodeAddress}
                disabled={geocodeLoading || !addressInput.trim()}
                size="sm"
              >
                <MapPin className="mr-1 h-4 w-4" />
                Find
              </Button>
            </div>
            {geocodeError && (
              <p className="text-sm text-destructive">{geocodeError}</p>
            )}
          </div>
        </div>

        <Separator />

        {/* Search results */}
        <ScrollArea className="flex-1">
          <div className="p-4">
            {searchLoading && (
              <p className="text-sm text-muted-foreground">Searching...</p>
            )}
            {searchResults && searchResults.results.length > 0 && (
              <div className="space-y-1">
                <p className="mb-2 text-xs text-muted-foreground">
                  {searchResults.count} results for "{searchResults.query}"
                </p>
                {searchResults.results.map((ward) => (
                  <button
                    key={ward.ward_id}
                    onClick={() => setSelectedWardId(ward.ward_id)}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-content2 ${
                      selectedWardId === ward.ward_id
                        ? 'bg-content2 border-l-2 border-dem font-medium'
                        : ''
                    }`}
                  >
                    <div className="font-medium">{ward.ward_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {ward.municipality}, {ward.county} County
                    </div>
                  </button>
                ))}
              </div>
            )}
            {searchResults && searchResults.results.length === 0 && searchQuery.length >= 2 && (
              <p className="text-sm text-muted-foreground">
                No wards found for "{searchQuery}"
              </p>
            )}
            {!searchQuery && !selectedWardId && (
              <p className="text-sm text-muted-foreground">
                Search for a ward by name, municipality, or county to get started.
              </p>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Right panel: Ward detail */}
      <div className="flex-1 overflow-auto bg-background p-6">
        {detailLoading && selectedWardId && (
          <div className="mx-auto max-w-3xl space-y-4 p-6">
            <div className="h-8 w-64 animate-pulse rounded-lg bg-content2" />
            <div className="h-4 w-48 animate-pulse rounded bg-content2" />
            <div className="mt-4 flex gap-2">
              <div className="h-6 w-16 animate-pulse rounded-full bg-content2" />
              <div className="h-6 w-16 animate-pulse rounded-full bg-content2" />
              <div className="h-6 w-16 animate-pulse rounded-full bg-content2" />
            </div>
            <div className="grid gap-3 pt-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2 rounded-xl border border-border/30 p-4">
                  <div className="flex justify-between">
                    <div className="h-4 w-24 animate-pulse rounded bg-content2" />
                    <div className="h-4 w-12 animate-pulse rounded bg-content2" />
                  </div>
                  <div className="h-2.5 w-full animate-pulse rounded-full bg-content2" />
                  <div className="flex justify-between">
                    <div className="h-3 w-20 animate-pulse rounded bg-content2" />
                    <div className="h-3 w-20 animate-pulse rounded bg-content2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!selectedWardId && (
          <div className="flex h-full items-center justify-center text-center">
            <div className="flex flex-col items-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-content2">
                <SearchIcon className="h-7 w-7 text-muted-foreground/60" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-muted-foreground">
                Select a ward to view details
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Search by name or enter an address to find your ward.
              </p>
            </div>
          </div>
        )}

        {wardDetail && (
          <div className="mx-auto max-w-3xl space-y-6">
            {/* Ward header */}
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{wardDetail.ward_name}</h2>
                  <p className="text-muted-foreground">
                    {wardDetail.municipality}, {wardDetail.county} County
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/wards/${wardDetail.ward_id}/report`)}
                  >
                    <ClipboardList className="mr-1 h-4 w-4" />
                    Report Card
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewOnMap(wardDetail.ward_id)}
                  >
                    <MapPin className="mr-1 h-4 w-4" />
                    View on Map
                  </Button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {wardDetail.congressional_district && (
                  <Badge variant="secondary">
                    Congressional District {wardDetail.congressional_district}
                  </Badge>
                )}
                {wardDetail.state_senate_district && (
                  <Badge variant="secondary">
                    Senate District {wardDetail.state_senate_district}
                  </Badge>
                )}
                {wardDetail.assembly_district && (
                  <Badge variant="secondary">
                    Assembly District {wardDetail.assembly_district}
                  </Badge>
                )}
                {wardDetail.is_estimated && (
                  <Badge variant="outline" className="border-amber-300 text-amber-600">
                    Combined Reporting Unit
                  </Badge>
                )}
              </div>
            </div>

            <Separator />

            {/* Election history */}
            <div>
              <h3 className="mb-4 text-lg font-semibold">Election History</h3>
              {wardDetail.elections.length === 0 ? (
                <p className="text-muted-foreground">No election data available.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {wardDetail.elections.map((e) => {
                    const twoParty = e.dem_votes + e.rep_votes;
                    const demBarPct = twoParty > 0 ? (e.dem_votes / twoParty) * 100 : 50;
                    const marginLabel =
                      e.margin > 0
                        ? `D+${e.margin.toFixed(1)}`
                        : e.margin < 0
                          ? `R+${Math.abs(e.margin).toFixed(1)}`
                          : 'Even';

                    return (
                      <Card key={`${e.election_year}-${e.race_type}`} className="transition-shadow duration-200 hover:shadow-md">
                        <CardHeader className="pb-2">
                          <CardTitle className="flex items-center justify-between text-sm">
                            <span>
                              {e.election_year} {RACE_LABELS[e.race_type] ?? e.race_type}
                            </span>
                            <span
                              className={`font-bold ${e.margin > 0 ? 'text-dem' : 'text-rep'}`}
                            >
                              {marginLabel}
                            </span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {/* Bar */}
                          <div className="mb-2 flex h-2.5 overflow-hidden rounded-full">
                            <div
                              style={{ width: `${demBarPct}%`, backgroundColor: 'var(--dem)' }}
                            />
                            <div
                              style={{
                                width: `${100 - demBarPct}%`,
                                backgroundColor: 'var(--rep)',
                              }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>
                              DEM {e.dem_votes.toLocaleString()} ({e.dem_pct.toFixed(1)}%)
                            </span>
                            <span>
                              REP {e.rep_votes.toLocaleString()} ({e.rep_pct.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            Total: {e.total_votes.toLocaleString()}
                            {e.is_estimate && (
                              <span className="ml-1 text-amber-600">*est.</span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {wardDetail.is_estimated && (
              <p className="text-sm text-amber-600">
                * This ward's data comes from a combined reporting unit. Vote totals are
                population-weighted estimates, not direct counts. County and state totals
                remain exact.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
