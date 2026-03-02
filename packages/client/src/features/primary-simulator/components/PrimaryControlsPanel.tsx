import { useState, memo, useCallback } from 'react';
import { SlidersHorizontal, X, Info } from 'lucide-react';
import { usePrimaryStore } from '@/stores/primaryStore';
import { PollManager } from './PollManager';
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

interface PrimaryControlsPanelProps {
  children?: React.ReactNode;
}

/**
 * Main sidebar panel for the Primary Simulator.
 *
 * Contains the Poll Preset Selector, global parameter sliders (turnout,
 * temperature, factor weights), and a children slot for CandidateCardList
 * and ResultsSummary.
 *
 * Follows the same layout patterns as the SwingModeler ControlsPanel:
 * w-80 desktop sidebar, mobile drawer with overlay, overflow-y-auto.
 */
export function PrimaryControlsPanel({ children }: PrimaryControlsPanelProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

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

  const panelContent = (
    <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-0">
      {/* Mobile close button */}
      <div className="mb-3 flex items-center justify-between md:hidden">
        <h3 className="text-sm font-semibold">Primary Controls</h3>
        <button
          onClick={() => setMobileOpen(false)}
          className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-content2"
          aria-label="Close controls"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Poll Manager (Polls + Scenarios tabs) */}
      <PollManager />

      <hr className="border-border/40 my-3" />

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

      <hr className="border-border/40 my-3" />

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

      <hr className="border-border/40 my-3" />

      {/* Children slot: CandidateCardList, ResultsSummary, etc. */}
      {children}

      <hr className="border-border/40 my-3" />

      {/* Reset button */}
      <button
        onClick={resetToDefaults}
        className="w-full rounded-lg border border-border/60 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-content2"
      >
        Reset All to Defaults
      </button>
    </div>
  );

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="absolute bottom-36 left-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-content1 shadow-lg border border-border/30 md:hidden"
        aria-label="Open primary controls"
      >
        <SlidersHorizontal className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-[85vw] max-w-sm flex-col border-r border-border/30 bg-content1 transition-transform duration-300 md:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {panelContent}
      </div>

      {/* Desktop: render inline (parent sidebar provides the container) */}
      <div className="hidden md:block">
        {panelContent}
      </div>
    </>
  );
}
