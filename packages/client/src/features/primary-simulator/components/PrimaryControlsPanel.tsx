import { memo, useState, useCallback } from 'react';
import { Info } from 'lucide-react';
import { usePrimaryStore } from '@/stores/primaryStore';
import type { PrimaryGlobalParams } from '@/types/primary';

/** Slider configuration for a single global parameter. */
interface SliderConfig {
  param: keyof PrimaryGlobalParams;
  label: string;
  min: number;
  max: number;
  step: number;
  suffix: string;
  tooltip?: string;
}

const GLOBAL_SLIDERS: SliderConfig[] = [
  {
    param: 'turnoutRate',
    label: 'Primary Turnout',
    min: 5,
    max: 45,
    step: 1,
    suffix: '%',
  },
  {
    param: 'temperature',
    label: 'Competitiveness',
    min: 0.3,
    max: 3.0,
    step: 0.1,
    suffix: '',
    tooltip:
      'Lower = more concentrated vote (frontrunners dominate). Higher = more spread out (competitive field).',
  },
];

const WEIGHT_SLIDERS: SliderConfig[] = [
  { param: 'geoWeight', label: 'Geography', min: 0, max: 3.0, step: 0.1, suffix: '' },
  { param: 'ideologyWeight', label: 'Ideology', min: 0, max: 3.0, step: 0.1, suffix: '' },
  { param: 'demographicWeight', label: 'Demographics', min: 0, max: 3.0, step: 0.1, suffix: '' },
  { param: 'endorsementWeight', label: 'Endorsements', min: 0, max: 3.0, step: 0.1, suffix: '' },
];

/** Format a numeric value for display: integers as-is, floats to 1 decimal. */
function formatValue(value: number, suffix: string): string {
  const formatted = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return formatted + suffix;
}

/** Memoized parameter slider that only re-renders when its own value changes. */
const ParamSlider = memo(function ParamSlider({
  label,
  value,
  min,
  max,
  step,
  suffix,
  tooltip,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  tooltip?: string;
  onChange: (value: number) => void;
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <label className="text-xs text-muted-foreground w-28 shrink-0">
          {label}
          {tooltip && (
            <button
              type="button"
              className="ml-1 inline-flex align-middle"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onFocus={() => setShowTooltip(true)}
              onBlur={() => setShowTooltip(false)}
              aria-label={`Info about ${label}`}
            >
              <Info className="h-3 w-3 text-muted-foreground/60" />
            </button>
          )}
        </label>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="flex-1 h-1.5"
          aria-label={`${label}: ${formatValue(value, suffix)}`}
        />
        <span className="text-xs font-mono w-10 text-right">
          {formatValue(value, suffix)}
        </span>
      </div>
      {tooltip && showTooltip && (
        <p className="text-xs text-muted-foreground/80 ml-28 pl-2 italic">
          {tooltip}
        </p>
      )}
    </div>
  );
});

/**
 * Inline controls panel for the Primary Simulator.
 *
 * Contains the Poll Preset Selector, global parameter sliders (turnout,
 * temperature, factor weights), and a reset button.
 *
 * Mobile drawer handling is done by the parent (index.tsx) so this component
 * renders purely inline — it works the same in the desktop sidebar and inside
 * the mobile slide-in drawer.
 */
export function PrimaryControlsPanel() {
  const globalParams = usePrimaryStore((s) => s.globalParams);
  const setGlobalParam = usePrimaryStore((s) => s.setGlobalParam);
  const resetToDefaults = usePrimaryStore((s) => s.resetToDefaults);

  // Stable callbacks for memoized slider components
  const handleTurnoutRate = useCallback(
    (v: number) => setGlobalParam('turnoutRate', v),
    [setGlobalParam],
  );
  const handleTemperature = useCallback(
    (v: number) => setGlobalParam('temperature', v),
    [setGlobalParam],
  );
  const handleGeoWeight = useCallback(
    (v: number) => setGlobalParam('geoWeight', v),
    [setGlobalParam],
  );
  const handleIdeologyWeight = useCallback(
    (v: number) => setGlobalParam('ideologyWeight', v),
    [setGlobalParam],
  );
  const handleDemographicWeight = useCallback(
    (v: number) => setGlobalParam('demographicWeight', v),
    [setGlobalParam],
  );
  const handleEndorsementWeight = useCallback(
    (v: number) => setGlobalParam('endorsementWeight', v),
    [setGlobalParam],
  );

  const handlers: Record<keyof PrimaryGlobalParams, (v: number) => void> = {
    turnoutRate: handleTurnoutRate,
    temperature: handleTemperature,
    geoWeight: handleGeoWeight,
    ideologyWeight: handleIdeologyWeight,
    demographicWeight: handleDemographicWeight,
    endorsementWeight: handleEndorsementWeight,
  };

  return (
    <div className="space-y-3">
      {/* Global Parameters */}
      <div className="space-y-3 rounded-lg border border-border/30 bg-content2/50 p-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Global Parameters
        </h3>

        {GLOBAL_SLIDERS.map((config) => (
          <ParamSlider
            key={config.param}
            label={config.label}
            value={globalParams[config.param]}
            min={config.min}
            max={config.max}
            step={config.step}
            suffix={config.suffix}
            tooltip={config.tooltip}
            onChange={handlers[config.param]}
          />
        ))}
      </div>

      {/* Factor Weights */}
      <div className="space-y-3 rounded-lg border border-border/30 bg-content2/50 p-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Factor Weights
        </h3>

        {WEIGHT_SLIDERS.map((config) => (
          <ParamSlider
            key={config.param}
            label={config.label}
            value={globalParams[config.param]}
            min={config.min}
            max={config.max}
            step={config.step}
            suffix={config.suffix}
            onChange={handlers[config.param]}
          />
        ))}
      </div>

      {/* Reset button */}
      <button
        onClick={resetToDefaults}
        className="w-full rounded-lg border border-border/60 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-content2"
      >
        Reset All to Defaults
      </button>
    </div>
  );
}
