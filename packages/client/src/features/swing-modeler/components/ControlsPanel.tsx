import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useElections } from '@/features/election-map/hooks/useElections';
import { useModelStore } from '@/stores/modelStore';
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

function formatSwing(value: number): string {
  if (value === 0) return 'Even';
  if (value > 0) return `D+${value.toFixed(1)}`;
  return `R+${Math.abs(value).toFixed(1)}`;
}

function formatTurnout(value: number): string {
  if (value === 0) return 'No change';
  if (value > 0) return `+${value}%`;
  return `${value}%`;
}

interface ControlsPanelProps {
  children?: React.ReactNode;
}

export function ControlsPanel({ children }: ControlsPanelProps) {
  const { data: electionsData, isLoading: electionsLoading } = useElections();
  const parameters = useModelStore((s) => s.parameters);
  const setParameter = useModelStore((s) => s.setParameter);

  const baseYear = String(parameters.baseElectionYear ?? '2024');
  const baseRace = String(parameters.baseRaceType ?? 'president') as RaceType;
  const swingPoints = (parameters.swingPoints as number) ?? 0;
  const turnoutChange = (parameters.turnoutChange as number) ?? 0;

  const elections = electionsData?.elections ?? [];
  const years = [...new Set(elections.map((e) => e.year))].sort((a, b) => b - a);
  const racesForYear = elections
    .filter((e) => e.year === Number(baseYear))
    .map((e) => e.race_type);

  const handleReset = () => {
    setParameter('swingPoints', 0);
    setParameter('turnoutChange', 0);
  };

  return (
    <div className="flex w-80 shrink-0 flex-col border-r bg-background">
      <div className="overflow-y-auto p-4">
        {/* Base Election Selection */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Base Election</h3>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Year</label>
            {electionsLoading ? (
              <div className="h-9 animate-pulse rounded-md bg-muted" />
            ) : (
              <Select
                value={baseYear}
                onValueChange={(val) => {
                  setParameter('baseElectionYear', val);
                  // Auto-select first available race for the new year
                  const firstRace = elections.find((e) => e.year === Number(val));
                  if (firstRace) {
                    setParameter('baseRaceType', firstRace.race_type);
                  }
                }}
              >
                <SelectTrigger className="w-full">
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
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Race</label>
            <Select
              value={baseRace}
              onValueChange={(val) => setParameter('baseRaceType', val)}
            >
              <SelectTrigger className="w-full">
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
        </div>

        <Separator className="my-4" />

        {/* Swing Slider */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Adjustments</h3>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground">Statewide Swing</label>
              <span
                className="text-sm font-semibold"
                style={{ color: swingPoints > 0 ? '#2166ac' : swingPoints < 0 ? '#b2182b' : undefined }}
              >
                {formatSwing(swingPoints)}
              </span>
            </div>
            <Slider
              value={[swingPoints]}
              min={-15}
              max={15}
              step={0.1}
              onValueChange={([val]) => setParameter('swingPoints', val)}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>R+15</span>
              <span>Even</span>
              <span>D+15</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground">Turnout Change</label>
              <span className="text-sm font-semibold">
                {formatTurnout(turnoutChange)}
              </span>
            </div>
            <Slider
              value={[turnoutChange]}
              min={-30}
              max={30}
              step={1}
              onValueChange={([val]) => setParameter('turnoutChange', val)}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>-30%</span>
              <span>0</span>
              <span>+30%</span>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleReset}
            disabled={swingPoints === 0 && turnoutChange === 0}
          >
            Reset to Baseline
          </Button>
        </div>

        <Separator className="my-4" />

        {/* Results summary slot */}
        {children}
      </div>
    </div>
  );
}
