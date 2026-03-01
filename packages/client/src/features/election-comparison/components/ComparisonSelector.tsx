import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useElections } from '@/features/election-map/hooks/useElections';
import { RACE_LABELS } from '@/shared/lib/raceLabels';
import type { RaceType } from '@/types/election';

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
    <div className="flex items-center gap-2 rounded-lg border border-border/30 bg-content2/50 px-3 py-1.5">
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
