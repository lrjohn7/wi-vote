import { useState, memo, useCallback } from 'react';
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
import { useScenarioList } from '../hooks/useScenarios';
import { SaveScenarioDialog } from './SaveScenarioDialog';
import { MrpStatus } from './MrpStatus';
import { REGION_LABELS, type Region } from '@/shared/lib/regionMapping';
import { RACE_LABELS } from '@/shared/lib/raceLabels';
import type { ScenarioSummary } from '@/services/api';
import type { RaceType } from '@/types/election';

const REGIONAL_PARAM_KEYS: { region: Region; paramKey: string }[] = [
  { region: 'milwaukee_metro', paramKey: 'swing_milwaukee_metro' },
  { region: 'madison_metro', paramKey: 'swing_madison_metro' },
  { region: 'fox_valley', paramKey: 'swing_fox_valley' },
  { region: 'rural', paramKey: 'swing_rural' },
];

const REGIONAL_TURNOUT_PARAM_KEYS: { region: Region; paramKey: string }[] = [
  { region: 'milwaukee_metro', paramKey: 'turnout_milwaukee_metro' },
  { region: 'madison_metro', paramKey: 'turnout_madison_metro' },
  { region: 'fox_valley', paramKey: 'turnout_fox_valley' },
  { region: 'rural', paramKey: 'turnout_rural' },
];

const DEMOGRAPHIC_TURNOUT_PARAM_KEYS: { paramKey: string; label: string; desc: string }[] = [
  { paramKey: 'turnout_urban', label: 'Urban Turnout', desc: '>3,000/sq mi' },
  { paramKey: 'turnout_suburban', label: 'Suburban Turnout', desc: '500-3,000/sq mi' },
  { paramKey: 'turnout_rural_class', label: 'Rural Turnout', desc: '<500/sq mi' },
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

/** Memoized slider that only re-renders when its own value changes */
const ParameterSlider = memo(function ParameterSlider({
  label,
  value,
  min,
  max,
  step,
  formatValue,
  onChange,
  description,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  formatValue: (v: number) => string;
  onChange: (v: number) => void;
  description?: string;
}) {
  const colorClass = value > 0 ? 'text-dem' : value < 0 ? 'text-rep' : '';
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs text-muted-foreground">{label}</label>
        <span className={`text-sm font-semibold ${colorClass}`}>
          {formatValue(value)}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
        aria-label={`${label}: ${formatValue(value)}`}
      />
      {description && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatValue(min)}</span>
          <span>{description}</span>
          <span>{formatValue(max)}</span>
        </div>
      )}
    </div>
  );
});

/** Memoized turnout slider with neutral color */
const TurnoutSlider = memo(function TurnoutSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  description,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  description?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs text-muted-foreground">{label}</label>
        <span className="text-xs font-semibold">{formatTurnout(value)}</span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
        aria-label={`${label}: ${formatTurnout(value)}`}
      />
      {description && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatTurnout(min)}</span>
          <span>{description}</span>
          <span>{formatTurnout(max)}</span>
        </div>
      )}
    </div>
  );
});

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
  const [showRegionalTurnout, setShowRegionalTurnout] = useState(false);
  const [showDemographicTurnout, setShowDemographicTurnout] = useState(false);

  // Stable callbacks for memoized slider components
  const handleSetSwing = useCallback((v: number) => setParameter('swingPoints', v), [setParameter]);
  const handleSetTurnout = useCallback((v: number) => setParameter('turnoutChange', v), [setParameter]);
  const handleSetUrbanSwing = useCallback((v: number) => setParameter('urbanSwing', v), [setParameter]);
  const handleSetSuburbanSwing = useCallback((v: number) => setParameter('suburbanSwing', v), [setParameter]);
  const handleSetRuralSwing = useCallback((v: number) => setParameter('ruralSwing', v), [setParameter]);
  const handleSetCollegeShift = useCallback((v: number) => setParameter('collegeShift', v), [setParameter]);
  const handleSetUrbanShift = useCallback((v: number) => setParameter('urbanShift', v), [setParameter]);
  const handleSetRuralShift = useCallback((v: number) => setParameter('ruralShift', v), [setParameter]);
  const handleSetIncomeShift = useCallback((v: number) => setParameter('incomeShift', v), [setParameter]);

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
    for (const { paramKey } of REGIONAL_TURNOUT_PARAM_KEYS) {
      setParameter(paramKey, 0);
    }
    for (const { paramKey } of DEMOGRAPHIC_TURNOUT_PARAM_KEYS) {
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

  const handleLoadScenario = (scenario: ScenarioSummary) => {
    setActiveModel(scenario.model_id);
    setParameters(scenario.parameters as Record<string, unknown>);
  };

  return (
    <div className="flex w-full shrink-0 flex-col border-b border-border/30 bg-content1 md:w-80 md:border-b-0 md:border-r">
      <div className="overflow-y-auto p-4 space-y-0">
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
        <div className="space-y-3 rounded-lg border border-border/30 bg-content2/50 p-3">
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
        <div className="space-y-3 rounded-lg border border-border/30 bg-content2/50 p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Adjustments</h3>

          {isMrp ? (
            <>
              {/* MRP model: demographic group shift sliders */}
              <p className="text-xs text-muted-foreground">
                Bayesian posterior adjustments. Credible intervals reflect model uncertainty.
              </p>
              <ParameterSlider label="College-Educated Shift" value={collegeShift} min={-10} max={10} step={0.5} formatValue={formatSwing} onChange={handleSetCollegeShift} description="College degree areas" />
              <ParameterSlider label="Urban Shift" value={mrpUrbanShift} min={-10} max={10} step={0.5} formatValue={formatSwing} onChange={handleSetUrbanShift} description=">3,000 people/sq mi" />
              <ParameterSlider label="Rural Shift" value={mrpRuralShift} min={-10} max={10} step={0.5} formatValue={formatSwing} onChange={handleSetRuralShift} description="<500 people/sq mi" />
              <ParameterSlider label="Income Effect Shift" value={incomeShift} min={-10} max={10} step={0.5} formatValue={formatSwing} onChange={handleSetIncomeShift} description="Income coefficient" />
            </>
          ) : isDemographic ? (
            <>
              {/* Demographic model: per-classification sliders */}
              <ParameterSlider label="Urban Swing" value={urbanSwing} min={-10} max={10} step={0.1} formatValue={formatSwing} onChange={handleSetUrbanSwing} description=">3,000 people/sq mi" />
              <ParameterSlider label="Suburban Swing" value={suburbanSwing} min={-10} max={10} step={0.1} formatValue={formatSwing} onChange={handleSetSuburbanSwing} description="500-3,000 people/sq mi" />
              <ParameterSlider label="Rural Swing" value={ruralSwing} min={-10} max={10} step={0.1} formatValue={formatSwing} onChange={handleSetRuralSwing} description="<500 people/sq mi" />
            </>
          ) : (
            <>
              {/* Uniform/Proportional: single statewide swing slider */}
              <ParameterSlider label="Statewide Swing" value={swingPoints} min={-15} max={15} step={0.1} formatValue={formatSwing} onChange={handleSetSwing} description="Even" />
            </>
          )}

          <TurnoutSlider label="Statewide Turnout" value={turnoutChange} min={-30} max={30} step={1} onChange={handleSetTurnout} description="0" />

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
              REGIONAL_PARAM_KEYS.every(({ paramKey }) => (parameters[paramKey] as number ?? 0) === 0) &&
              REGIONAL_TURNOUT_PARAM_KEYS.every(({ paramKey }) => (parameters[paramKey] as number ?? 0) === 0) &&
              DEMOGRAPHIC_TURNOUT_PARAM_KEYS.every(({ paramKey }) => (parameters[paramKey] as number ?? 0) === 0)
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
                        className={`text-xs font-semibold ${val > 0 ? 'text-dem' : val < 0 ? 'text-rep' : ''}`}
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

        {/* Regional Turnout — for uniform/proportional models */}
        {!isDemographic && !isMrp && (
          <div className="space-y-3">
            <button
              className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              onClick={() => setShowRegionalTurnout(!showRegionalTurnout)}
              aria-expanded={showRegionalTurnout}
              aria-controls="regional-turnout-panel"
            >
              <span>Regional Turnout</span>
              {showRegionalTurnout ? (
                <ChevronDown className="h-4 w-4 transition-transform duration-200" />
              ) : (
                <ChevronRight className="h-4 w-4 transition-transform duration-200" />
              )}
            </button>

            {showRegionalTurnout && (
              <div id="regional-turnout-panel" className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Additional turnout offset on top of statewide turnout.
                </p>
                {REGIONAL_TURNOUT_PARAM_KEYS.map(({ region, paramKey }) => {
                  const val = (parameters[paramKey] as number) ?? 0;
                  return (
                    <div key={paramKey} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-muted-foreground">
                          {REGION_LABELS[region]}
                        </label>
                        <span className="text-xs font-semibold">
                          {formatTurnout(val)}
                        </span>
                      </div>
                      <Slider
                        value={[val]}
                        min={-20}
                        max={20}
                        step={1}
                        onValueChange={([v]) => setParameter(paramKey, v)}
                        aria-label={`${REGION_LABELS[region]} turnout: ${formatTurnout(val)}`}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Demographic Turnout — for demographic model */}
        {isDemographic && (
          <div className="space-y-3">
            <button
              className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              onClick={() => setShowDemographicTurnout(!showDemographicTurnout)}
              aria-expanded={showDemographicTurnout}
              aria-controls="demographic-turnout-panel"
            >
              <span>Demographic Turnout</span>
              {showDemographicTurnout ? (
                <ChevronDown className="h-4 w-4 transition-transform duration-200" />
              ) : (
                <ChevronRight className="h-4 w-4 transition-transform duration-200" />
              )}
            </button>

            {showDemographicTurnout && (
              <div id="demographic-turnout-panel" className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Turnout offset by classification, on top of statewide.
                </p>
                {DEMOGRAPHIC_TURNOUT_PARAM_KEYS.map(({ paramKey, label, desc }) => {
                  const val = (parameters[paramKey] as number) ?? 0;
                  return (
                    <div key={paramKey} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-muted-foreground">{label}</label>
                        <span className="text-xs font-semibold">{formatTurnout(val)}</span>
                      </div>
                      <Slider
                        value={[val]}
                        min={-20}
                        max={20}
                        step={1}
                        onValueChange={([v]) => setParameter(paramKey, v)}
                        aria-label={`${label}: ${formatTurnout(val)}`}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>-20%</span>
                        <span>{desc}</span>
                        <span>+20%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <Separator className="my-4" />

        {/* Scenario Presets */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Scenarios</h3>

          <SaveScenarioDialog />

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

          <CommunityScenarios onLoadScenario={handleLoadScenario} />
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

function CommunityScenarios({
  onLoadScenario,
}: {
  onLoadScenario: (s: ScenarioSummary) => void;
}) {
  const { data, isLoading } = useScenarioList(5);

  if (isLoading) return null;
  if (!data?.scenarios?.length) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground">Community</p>
      {data.scenarios.map((s) => (
        <Button
          key={s.id}
          variant="ghost"
          size="sm"
          className="h-auto w-full justify-start py-1 text-xs"
          onClick={() => onLoadScenario(s)}
          title={s.description ?? undefined}
        >
          <span className="truncate">{s.name}</span>
          <span className="ml-auto shrink-0 text-muted-foreground">
            {s.model_id.replace('-swing', '').replace('-', ' ')}
          </span>
        </Button>
      ))}
    </div>
  );
}
