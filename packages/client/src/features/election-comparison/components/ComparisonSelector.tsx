import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useElections } from '@/features/election-map/hooks/useElections';
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

interface ComparisonSelectorProps {
  label: string;
  year: number;
  race: RaceType;
  onYearChange: (year: number) => void;
  onRaceChange: (race: RaceType) => void;
}

export function ComparisonSelector({
  label,
  year,
  race,
  onYearChange,
  onRaceChange,
}: ComparisonSelectorProps) {
  const { data: electionsData } = useElections();
  const elections = electionsData?.elections ?? [];
  const years = [...new Set(elections.map((e) => e.year))].sort((a, b) => b - a);
  const racesForYear = elections
    .filter((e) => e.year === year)
    .map((e) => e.race_type);

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <Select
        value={String(year)}
        onValueChange={(val) => {
          const newYear = Number(val);
          onYearChange(newYear);
          const firstRace = elections.find((e) => e.year === newYear);
          if (firstRace && !elections.some((e) => e.year === newYear && e.race_type === race)) {
            onRaceChange(firstRace.race_type);
          }
        }}
      >
        <SelectTrigger className="w-24">
          <SelectValue />
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
        value={race}
        onValueChange={(val) => onRaceChange(val as RaceType)}
      >
        <SelectTrigger className="w-36">
          <SelectValue />
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
