import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useElections } from '../hooks/useElections';
import { useMapStore } from '@/stores/mapStore';
import type { RaceType } from '@/types/election';

const RACE_LABELS: Record<string, string> = {
  president: 'President',
  governor: 'Governor',
  us_senate: 'US Senate',
  us_house: 'US House',
  state_senate: 'State Senate',
  state_assembly: 'State Assembly',
  attorney_general: 'Attorney General',
  secretary_of_state: 'Sec. of State',
  treasurer: 'Treasurer',
};

export function ElectionSelector() {
  const { data, isLoading } = useElections();
  const activeElection = useMapStore((s) => s.activeElection);
  const setActiveElection = useMapStore((s) => s.setActiveElection);

  if (isLoading || !data) {
    return <div className="text-sm text-muted-foreground">Loading elections...</div>;
  }

  const elections = data.elections;

  // Get unique years and race types
  const years = [...new Set(elections.map((e) => e.year))].sort((a, b) => b - a);
  const racesForYear = elections
    .filter((e) => e.year === activeElection?.year)
    .map((e) => e.race_type);

  return (
    <div className="flex items-center gap-2">
      <Select
        value={String(activeElection?.year ?? '')}
        onValueChange={(val) => {
          const year = Number(val);
          // Find first available race for this year
          const firstRace = elections.find((e) => e.year === year);
          if (firstRace) {
            setActiveElection(year, firstRace.race_type as RaceType);
          }
        }}
      >
        <SelectTrigger className="w-[100px]">
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

      <Select
        value={activeElection?.raceType ?? ''}
        onValueChange={(val) => {
          if (activeElection) {
            setActiveElection(activeElection.year, val as RaceType);
          }
        }}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Race" />
        </SelectTrigger>
        <SelectContent>
          {racesForYear.map((r) => (
            <SelectItem key={r} value={r}>
              {RACE_LABELS[r] ?? r}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
