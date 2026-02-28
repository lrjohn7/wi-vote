import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
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
import { modelRegistry } from '@/models';
import { scenarioPresets } from '../lib/scenarioPresets';
import { MrpStatus } from './MrpStatus';
import { REGION_LABELS, type Region } from '@/shared/lib/regionMapping';
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

const REGIONAL_PARAM_KEYS: { region: Region; paramKey: string }[] = [
  { region: 'milwaukee_metro', paramKey: 'swing_milwaukee_metro' },
  { region: 'madison_metro', paramKey: 'swing_madison_metro' },
  { region: 'fox_valley', paramKey: 'swing_fox_valley' },
  { region: 'rural', paramKey: 'swing_rural' },
];

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
  const activeModelId = useModelStore((s) => s.activeModelId);
  const setParameter = useModelStore((s) => s.setParameter);
  const setParameters = useModelStore((s) => s.setParameters);
  const setActiveModel = useModelStore((s) => s.setActiveModel);

  const [showRegional, setShowRegional] = useState(false);

  const baseYear = String(parameters.baseElectionYear ?? '2024');
  const baseRace = String(parameters.baseRaceType ?? 'president') as RaceType;
  const swingPoints = (parameters.swingPoints as number) ?? 0;
  const turnoutChange = (parameters.turnoutChange as number) ?? 0;

  const elections = electionsData?.elections ?? [];
  const years = [...new Set(elections.map((e) => e.year))].sort((a, b) => b - a);
  const racesForYear = elections
    .filter((e) => e.year === Number(baseYear))
    .map((e) => e.race_type);

  const allModels = modelRegistry.getAll();

  const isDemographic = activeModelId === 'demographic-swing';
  const isMrp = activeModelId === 'mrp';

  const urbanSwing = (parameters.urbanSwing as number) ?? 0;
  const suburbanSwing = (parameters.suburbanSwing as number) ?? 0;
  const ruralSwing = (parameters.ruralSwing as number) ?? 0;

  // MRP-specific params
  const collegeShift = (parameters.collegeShift as number) ?? 0;
  const mrpUrbanShift = (parameters.urbanShift as number) ?? 0;
  const mrpRuralShift = (parameters.ruralShift as number) ?? 0;
  const incomeShift = (parameters.incomeShift as number) ?? 0;

  const handleReset = () => {
    setParameter('swingPoints', 0);
    setParameter('turnoutChange', 0);
    setParameter('urbanSwing', 0);
    setParameter('suburbanSwing', 0);
    setParameter('ruralSwing', 0);
    setParameter('collegeShift', 0);
    setParameter('urbanShift', 0);
    setParameter('ruralShift', 0);
    setParameter('incomeShift', 0);
    for (const { paramKey } of REGIONAL_PARAM_KEYS) {
      setParameter(paramKey, 0);
    }
  };

  const isDemographicDirty = urbanSwing !== 0 || suburbanSwing !== 0 || ruralSwing !== 0;
  const isMrpDirty = collegeShift !== 0 || mrpUrbanShift !== 0 || mrpRuralShift !== 0 || incomeShift !== 0;

  const handleModelChange = (modelId: string) => {
    // Preserve current parameters when switching models
    const currentParams = { ...parameters };
    setActiveModel(modelId);
    // Re-apply params since setActiveModel clears them
    setParameters(currentParams);
  };

  const handlePreset = (preset: typeof scenarioPresets[number]) => {
    setParameters(preset.params);
  };

  return (
    <div className="flex w-80 shrink-0 flex-col border-r bg-background">
      <div className="overflow-y-auto p-4">
        {/* Model Selector */}
        {allModels.length > 1 && (
          <>
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Model</h3>
              <Select value={activeModelId} onValueChange={handleModelChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Model" />
                </SelectTrigger>
                <SelectContent>
                  {allModels.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {allModels.find((m) => m.id === activeModelId)?.description}
              </p>
            </div>
            <Separator className="my-4" />
          </>
        )}

        {/* Base Election Selection */}
        <div className="space-y-3 rounded-lg bg-muted/30 p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Base Election</h3>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Year</label>
            {electionsLoading ? (
              <div className="h-9 animate-pulse rounded-md bg-muted" />
            ) : (
              <Select
                value={baseYear}
                onValueChange={(val) => {
                  setParameter('baseElectionYear', val);
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

        {/* Swing Sliders */}
        <div className="space-y-3 rounded-lg bg-muted/30 p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Adjustments</h3>

          {isMrp ? (
            <>
              {/* MRP model: demographic group shift sliders */}
              <p className="text-xs text-muted-foreground">
                Bayesian posterior adjustments. Credible intervals reflect model uncertainty.
              </p>
              {([
                { id: 'collegeShift', label: 'College-Educated Shift', value: collegeShift, desc: 'College degree areas' },
                { id: 'urbanShift', label: 'Urban Shift', value: mrpUrbanShift, desc: '>3,000 people/sq mi' },
                { id: 'ruralShift', label: 'Rural Shift', value: mrpRuralShift, desc: '<500 people/sq mi' },
                { id: 'incomeShift', label: 'Income Effect Shift', value: incomeShift, desc: 'Income coefficient' },
              ] as const).map(({ id, label, value, desc }) => (
                <div key={id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-muted-foreground">{label}</label>
                    <span
                      className="text-sm font-semibold"
                      style={{ color: value > 0 ? '#2166ac' : value < 0 ? '#b2182b' : undefined }}
                    >
                      {formatSwing(value)}
                    </span>
                  </div>
                  <Slider
                    value={[value]}
                    min={-10}
                    max={10}
                    step={0.5}
                    onValueChange={([val]) => setParameter(id, val)}
                    aria-label={`${label}: ${formatSwing(value)}`}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>R+10</span>
                    <span>{desc}</span>
                    <span>D+10</span>
                  </div>
                </div>
              ))}
            </>
          ) : isDemographic ? (
            <>
              {/* Demographic model: per-classification sliders */}
              {([
                { id: 'urbanSwing', label: 'Urban Swing', value: urbanSwing, desc: '>3,000 people/sq mi' },
                { id: 'suburbanSwing', label: 'Suburban Swing', value: suburbanSwing, desc: '500-3,000 people/sq mi' },
                { id: 'ruralSwing', label: 'Rural Swing', value: ruralSwing, desc: '<500 people/sq mi' },
              ] as const).map(({ id, label, value, desc }) => (
                <div key={id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-muted-foreground">{label}</label>
                    <span
                      className="text-sm font-semibold"
                      style={{ color: value > 0 ? '#2166ac' : value < 0 ? '#b2182b' : undefined }}
                    >
                      {formatSwing(value)}
                    </span>
                  </div>
                  <Slider
                    value={[value]}
                    min={-10}
                    max={10}
                    step={0.1}
                    onValueChange={([val]) => setParameter(id, val)}
                    aria-label={`${label}: ${formatSwing(value)}`}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>R+10</span>
                    <span>{desc}</span>
                    <span>D+10</span>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
              {/* Uniform/Proportional: single statewide swing slider */}
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
                  aria-label={`Statewide swing: ${formatSwing(swingPoints)}`}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>R+15</span>
                  <span>Even</span>
                  <span>D+15</span>
                </div>
              </div>
            </>
          )}

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
              aria-label={`Turnout change: ${formatTurnout(turnoutChange)}`}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
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
            disabled={
              swingPoints === 0 &&
              turnoutChange === 0 &&
              !isDemographicDirty &&
              !isMrpDirty &&
              REGIONAL_PARAM_KEYS.every(({ paramKey }) => (parameters[paramKey] as number ?? 0) === 0)
            }
          >
            Reset to Baseline
          </Button>
        </div>

        <Separator className="my-4" />

        {/* Regional Swing Sliders — only for uniform/proportional models */}
        {!isDemographic && !isMrp && <div className="space-y-3">
          <button
            className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            onClick={() => setShowRegional(!showRegional)}
            aria-expanded={showRegional}
            aria-controls="regional-swing-panel"
          >
            <span>Regional Swing</span>
            {showRegional ? (
              <ChevronDown className="h-4 w-4 transition-transform duration-200" />
            ) : (
              <ChevronRight className="h-4 w-4 transition-transform duration-200" />
            )}
          </button>

          {showRegional && (
            <div id="regional-swing-panel" className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Additional offset applied on top of statewide swing.
              </p>
              {REGIONAL_PARAM_KEYS.map(({ region, paramKey }) => {
                const val = (parameters[paramKey] as number) ?? 0;
                return (
                  <div key={paramKey} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-muted-foreground">
                        {REGION_LABELS[region]}
                      </label>
                      <span
                        className="text-xs font-semibold"
                        style={{ color: val > 0 ? '#2166ac' : val < 0 ? '#b2182b' : undefined }}
                      >
                        {formatSwing(val)}
                      </span>
                    </div>
                    <Slider
                      value={[val]}
                      min={-10}
                      max={10}
                      step={0.5}
                      onValueChange={([v]) => setParameter(paramKey, v)}
                      aria-label={`${REGION_LABELS[region]} swing: ${formatSwing(val)}`}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>}

        <Separator className="my-4" />

        {/* Scenario Presets */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Scenarios</h3>
          <div className="grid grid-cols-2 gap-1.5">
            {scenarioPresets.map((preset) => (
              <Button
                key={preset.id}
                variant="outline"
                size="sm"
                className="h-auto py-1.5 text-xs"
                onClick={() => handlePreset(preset)}
                title={preset.description}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>

        {/* MRP model status — only when MRP is selected */}
        {isMrp && (
          <>
            <Separator className="my-4" />
            <MrpStatus />
          </>
        )}

        <Separator className="my-4" />

        {/* Results summary slot */}
        {children}
      </div>
    </div>
  );
}
