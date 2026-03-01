import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { MapPin, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useWardSearch } from '@/features/ward-explorer/hooks/useWardSearch';

export function WardFinder() {
  const navigate = useNavigate();
  const [addressInput, setAddressInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [geocodeLoading, setGeocodeLoading] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  const { data: searchResults, isLoading: searchLoading } = useWardSearch(searchQuery);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length >= 2) {
      setSearchQuery(value);
    } else {
      setSearchQuery('');
    }
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
        navigate(`/wards/${data.ward.ward_id}/report`);
      } else {
        setGeocodeError('No ward found at that address.');
      }
    } catch {
      setGeocodeError('Geocoding failed. Please try again.');
    } finally {
      setGeocodeLoading(false);
    }
  };

  const handleSelectWard = (wardId: string) => {
    navigate(`/wards/${wardId}/report`);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">My Ward Report Card</h1>
        <p className="mt-2 text-muted-foreground">
          Look up any Wisconsin ward to see its partisan lean, voting trends, and election history.
        </p>
      </div>

      {/* Address lookup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4" />
            Find by Address
          </CardTitle>
        </CardHeader>
        <CardContent>
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
            >
              {geocodeLoading ? 'Finding...' : 'Find Ward'}
            </Button>
          </div>
          {geocodeError && (
            <p className="mt-2 text-sm text-destructive">{geocodeError}</p>
          )}
        </CardContent>
      </Card>

      {/* Ward name search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="h-4 w-4" />
            Search by Ward Name
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            onChange={handleSearchChange}
            placeholder="Search by ward name, municipality, or county..."
          />

          {searchLoading && (
            <p className="mt-3 text-sm text-muted-foreground">Searching...</p>
          )}

          {searchResults && searchResults.results.length > 0 && (
            <div className="mt-3 max-h-80 space-y-1 overflow-y-auto">
              <p className="text-xs text-muted-foreground">
                {searchResults.count} results
              </p>
              {searchResults.results.map((ward) => (
                <button
                  key={ward.ward_id}
                  onClick={() => handleSelectWard(ward.ward_id)}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-content2"
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
            <p className="mt-3 text-sm text-muted-foreground">
              No wards found matching "{searchQuery}"
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
