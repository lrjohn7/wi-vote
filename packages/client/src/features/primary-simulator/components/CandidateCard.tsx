import { useState, useCallback, memo, useId } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { usePrimaryStore, type PrimaryCandidateState } from '@/stores/primaryStore';

/**
 * Center coordinates for each geographic region.
 * Used to update geographicBaseCoords when the user changes the dropdown.
 */
const REGION_COORDS: Record<string, [number, number]> = {
  milwaukee_metro: [-87.9065, 43.0389],
  madison_metro: [-89.4012, 43.0731],
  kenosha_racine: [-87.8212, 42.5847],
  fox_valley: [-88.4154, 44.2619],
  sw_rural: [-90.8, 43.3],
  nw_rural: [-90.5, 45.5],
};

/** Human-readable labels for each geographic region. */
const REGION_LABELS: Record<string, string> = {
  milwaukee_metro: 'Milwaukee',
  madison_metro: 'Madison',
  kenosha_racine: 'Kenosha/Racine',
  fox_valley: 'Fox Valley',
  sw_rural: 'SW Rural',
  nw_rural: 'NW Rural',
};

/** All region keys in display order. */
const REGION_KEYS = Object.keys(REGION_LABELS);

interface CandidateCardProps {
  candidateId: string;
}

/**
 * Format a 0-1 affinity value as X.XX.
 */
function formatAffinity(value: number): string {
  return value.toFixed(2);
}

/**
 * Look up the region key that matches a geographic base value from the store.
 * Handles both region key format (e.g. 'milwaukee_metro') and display label
 * format (e.g. 'Milwaukee') for backwards compatibility.
 */
function findRegionKey(geographicBase: string): string {
  if (REGION_COORDS[geographicBase]) {
    return geographicBase;
  }
  const lower = geographicBase.toLowerCase();
  const match = REGION_KEYS.find((key) => REGION_LABELS[key].toLowerCase() === lower);
  return match ?? 'milwaukee_metro';
}

// ---------------------------------------------------------------------------
// CandidateSlider - reusable slider row for a single candidate parameter
// ---------------------------------------------------------------------------

type CandidateParamKey = keyof Omit<
  PrimaryCandidateState,
  'id' | 'name' | 'shortName' | 'color' | 'geographicBase' | 'geographicBaseCoords' | 'isActive'
>;

interface CandidateSliderProps {
  label: string;
  param: CandidateParamKey;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  candidateId: string;
  color: string;
  disabled: boolean;
}

const CandidateSlider = memo(function CandidateSlider({
  label,
  param,
  value,
  min,
  max,
  step,
  format,
  candidateId,
  color,
  disabled,
}: CandidateSliderProps) {
  const setCandidateParam = usePrimaryStore((s) => s.setCandidateParam);
  const sliderId = candidateId + '-' + param;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setCandidateParam(candidateId, param, parseFloat(e.target.value));
    },
    [candidateId, param, setCandidateParam],
  );

  return (
    <div className="flex items-center gap-2 mt-1.5">
      <label
        htmlFor={sliderId}
        className="text-xs text-muted-foreground w-24 shrink-0"
      >
        {label}
      </label>
      <input
        id={sliderId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        className="flex-1 h-1.5 accent-current disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
        style={{ accentColor: color }}
        aria-label={label + ': ' + format(value)}
      />
      <span className="text-xs font-mono w-12 text-right tabular-nums">
        {format(value)}
      </span>
    </div>
  );
});

// ---------------------------------------------------------------------------
// CandidateCard - main component
// ---------------------------------------------------------------------------

/**
 * Expandable card component for a single primary candidate.
 *
 * Collapsed: shows color dot, name, polling %, and active toggle.
 * Expanded: reveals all adjustable parameters organized in sections.
 */
export const CandidateCard = memo(function CandidateCard({ candidateId }: CandidateCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const uniqueId = useId();

  const candidate = usePrimaryStore((s) => s.candidates.find((c) => c.id === candidateId));
  const setCandidates = usePrimaryStore((s) => s.setCandidates);
  const candidates = usePrimaryStore((s) => s.candidates);
  const toggleCandidateActive = usePrimaryStore((s) => s.toggleCandidateActive);

  const handleToggleActive = useCallback(
    (e: React.MouseEvent | React.ChangeEvent) => {
      e.stopPropagation();
      toggleCandidateActive(candidateId);
    },
    [candidateId, toggleCandidateActive],
  );

  const handleToggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const handleRegionChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const regionKey = e.target.value;
      const coords = REGION_COORDS[regionKey];
      if (coords) {
        // Update both geographicBase and geographicBaseCoords atomically
        setCandidates(
          candidates.map((c) =>
            c.id === candidateId
              ? { ...c, geographicBase: regionKey, geographicBaseCoords: coords }
              : c,
          ),
        );
      }
    },
    [candidateId, candidates, setCandidates],
  );

  if (!candidate) return null;

  const isActive = candidate.isActive;
  const contentId = 'candidate-details-' + uniqueId;

  return (
    <div
      className={
        'rounded-lg border-l-[3px] transition-colors duration-200 ' +
        (isActive
          ? 'bg-content2/40 border-border/30'
          : 'bg-muted/30 border-muted-foreground/30 opacity-60')
      }
      style={{ borderLeftColor: isActive ? candidate.color : undefined }}
    >
      {/* Collapsed header */}
      <button
        type="button"
        onClick={handleToggleExpand}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
        aria-expanded={isExpanded}
        aria-controls={contentId}
      >
        {/* Color dot */}
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: isActive ? candidate.color : '#9ca3af' }}
          aria-hidden="true"
        />

        {/* Candidate name */}
        <span
          className={
            'flex-1 text-sm font-semibold ' +
            (isActive ? '' : 'line-through text-muted-foreground')
          }
        >
          {candidate.name}
        </span>

        {/* Polling percentage */}
        <span className="text-xs font-mono text-muted-foreground">
          {Math.round(candidate.pollingBaseline)}%
        </span>

        {/* Active toggle */}
        <input
          type="checkbox"
          checked={isActive}
          onChange={handleToggleActive}
          onClick={(e) => e.stopPropagation()}
          className="h-3.5 w-3.5 shrink-0 rounded accent-current cursor-pointer"
          style={{ accentColor: candidate.color }}
          aria-label={candidate.name + ' active in primary'}
        />

        {/* Expand/collapse chevron */}
        {isExpanded ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        )}
      </button>

      {/* Expanded detail section */}
      {isExpanded && (
        <div
          id={contentId}
          className="border-t border-border/20 px-3 pb-3 pt-2 space-y-3"
        >
          {/* Core parameters */}
          <section aria-label="Core parameters">
            <CandidateSlider
              label="Polling Baseline"
              param="pollingBaseline"
              value={candidate.pollingBaseline}
              min={0}
              max={50}
              step={0.5}
              format={(v) => Math.round(v * 10) / 10 + '%'}
              candidateId={candidateId}
              color={candidate.color}
              disabled={!isActive}
            />

            <div className="flex items-center gap-2 mt-2">
              <label className="text-xs text-muted-foreground w-24 shrink-0">
                Geographic Base
              </label>
              <select
                value={findRegionKey(candidate.geographicBase)}
                onChange={handleRegionChange}
                disabled={!isActive}
                className="flex-1 rounded border border-border/30 bg-content1 px-2 py-1 text-xs disabled:opacity-50"
                aria-label={candidate.name + ' geographic base'}
              >
                {REGION_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {REGION_LABELS[key]}
                  </option>
                ))}
              </select>
            </div>

            <CandidateSlider
              label="Geo Radius (km)"
              param="geographicRadius"
              value={candidate.geographicRadius}
              min={10}
              max={100}
              step={5}
              format={(v) => v + 'km'}
              candidateId={candidateId}
              color={candidate.color}
              disabled={!isActive}
            />

            <CandidateSlider
              label="Ideology (prog-mod)"
              param="ideologyScore"
              value={candidate.ideologyScore}
              min={1}
              max={10}
              step={0.5}
              format={(v) => String(v)}
              candidateId={candidateId}
              color={candidate.color}
              disabled={!isActive}
            />
          </section>

          {/* Demographic affinities */}
          <section aria-label="Demographic affinities">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Demographic Affinities
            </h4>

            <CandidateSlider
              label="Black voters"
              param="affinityBlack"
              value={candidate.affinityBlack}
              min={0}
              max={1}
              step={0.05}
              format={formatAffinity}
              candidateId={candidateId}
              color={candidate.color}
              disabled={!isActive}
            />
            <CandidateSlider
              label="Hispanic voters"
              param="affinityHispanic"
              value={candidate.affinityHispanic}
              min={0}
              max={1}
              step={0.05}
              format={formatAffinity}
              candidateId={candidateId}
              color={candidate.color}
              disabled={!isActive}
            />
            <CandidateSlider
              label="College-educated"
              param="affinityCollege"
              value={candidate.affinityCollege}
              min={0}
              max={1}
              step={0.05}
              format={formatAffinity}
              candidateId={candidateId}
              color={candidate.color}
              disabled={!isActive}
            />
            <CandidateSlider
              label="Working class"
              param="affinityWorkingClass"
              value={candidate.affinityWorkingClass}
              min={0}
              max={1}
              step={0.05}
              format={formatAffinity}
              candidateId={candidateId}
              color={candidate.color}
              disabled={!isActive}
            />
            <CandidateSlider
              label="Urban voters"
              param="affinityUrban"
              value={candidate.affinityUrban}
              min={0}
              max={1}
              step={0.05}
              format={formatAffinity}
              candidateId={candidateId}
              color={candidate.color}
              disabled={!isActive}
            />
            <CandidateSlider
              label="Suburban voters"
              param="affinitySuburban"
              value={candidate.affinitySuburban}
              min={0}
              max={1}
              step={0.05}
              format={formatAffinity}
              candidateId={candidateId}
              color={candidate.color}
              disabled={!isActive}
            />
            <CandidateSlider
              label="Rural voters"
              param="affinityRural"
              value={candidate.affinityRural}
              min={0}
              max={1}
              step={0.05}
              format={formatAffinity}
              candidateId={candidateId}
              color={candidate.color}
              disabled={!isActive}
            />
          </section>

          {/* Endorsement strength */}
          <section aria-label="Endorsement strength">
            <CandidateSlider
              label="Endorsement strength"
              param="endorsementStrength"
              value={candidate.endorsementStrength}
              min={0}
              max={1}
              step={0.05}
              format={formatAffinity}
              candidateId={candidateId}
              color={candidate.color}
              disabled={!isActive}
            />
          </section>
        </div>
      )}
    </div>
  );
});
