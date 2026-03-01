import { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import type { DemographicData } from '@/types/election';

interface DemographicsSectionProps {
  data: DemographicData;
  compact?: boolean;
}

const CLASSIFICATION_COLORS: Record<string, string> = {
  urban: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  suburban: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  rural: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
};

const ETHNICITY_COLORS: { key: keyof DemographicData; label: string; color: string }[] = [
  { key: 'whitePct', label: 'White', color: '#94a3b8' },
  { key: 'blackPct', label: 'Black', color: '#6366f1' },
  { key: 'hispanicPct', label: 'Hispanic', color: '#f59e0b' },
  { key: 'asianPct', label: 'Asian', color: '#10b981' },
];

function formatIncome(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
  return `$${value.toLocaleString()}`;
}

function formatDensity(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k/mi²`;
  return `${value.toFixed(0)}/mi²`;
}

export const DemographicsSection = memo(function DemographicsSection({
  data,
  compact = false,
}: DemographicsSectionProps) {
  const otherPct = Math.max(0, 100 - data.whitePct - data.blackPct - data.hispanicPct - data.asianPct);
  const classLabel = data.urbanRuralClass.charAt(0).toUpperCase() + data.urbanRuralClass.slice(1);

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={CLASSIFICATION_COLORS[data.urbanRuralClass] ?? ''}
          >
            {classLabel}
          </Badge>
          <span className="text-xs text-muted-foreground">
            Pop. {data.totalPopulation.toLocaleString()}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDensity(data.populationDensity)}
          </span>
        </div>

        {/* Ethnicity bar */}
        <div>
          <div
            className="flex h-2 overflow-hidden rounded-full"
            role="img"
            aria-label={`Race/Ethnicity: White ${data.whitePct.toFixed(0)}%, Black ${data.blackPct.toFixed(0)}%, Hispanic ${data.hispanicPct.toFixed(0)}%, Asian ${data.asianPct.toFixed(0)}%`}
          >
            {ETHNICITY_COLORS.map(({ key, color }) => {
              const pct = data[key] as number;
              if (pct < 0.5) return null;
              return (
                <div
                  key={key}
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              );
            })}
            {otherPct > 0.5 && (
              <div style={{ width: `${otherPct}%`, backgroundColor: '#71717a' }} />
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
            {ETHNICITY_COLORS.map(({ key, label, color }) => {
              const pct = data[key] as number;
              if (pct < 0.5) return null;
              return (
                <span key={key} className="flex items-center gap-1">
                  <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
                  {label} {pct.toFixed(0)}%
                </span>
              );
            })}
          </div>
        </div>

        {/* Education + Income row */}
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>College: {data.collegDegreePct.toFixed(0)}%</span>
          <span>Income: {formatIncome(data.medianHouseholdIncome)}</span>
        </div>
      </div>
    );
  }

  // Full mode for report card
  return (
    <div className="space-y-4">
      {/* Classification + Population */}
      <div className="flex items-center gap-3">
        <Badge
          variant="outline"
          className={`text-sm ${CLASSIFICATION_COLORS[data.urbanRuralClass] ?? ''}`}
        >
          {classLabel}
        </Badge>
        <span className="text-sm text-muted-foreground">
          {formatDensity(data.populationDensity)}
        </span>
      </div>

      {/* Population stats */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-2xl font-bold tabular-nums">
            {data.totalPopulation.toLocaleString()}
          </div>
          <div className="text-sm text-muted-foreground">Total Population</div>
        </div>
        <div>
          <div className="text-2xl font-bold tabular-nums">
            {data.votingAgePopulation.toLocaleString()}
          </div>
          <div className="text-sm text-muted-foreground">Voting Age</div>
        </div>
      </div>

      {/* Race/Ethnicity */}
      <div>
        <h4 className="mb-2 text-sm font-medium text-muted-foreground">Race & Ethnicity</h4>
        <div
          className="flex h-4 overflow-hidden rounded-full"
          role="img"
          aria-label={`Race/Ethnicity: White ${data.whitePct.toFixed(0)}%, Black ${data.blackPct.toFixed(0)}%, Hispanic ${data.hispanicPct.toFixed(0)}%, Asian ${data.asianPct.toFixed(0)}%`}
        >
          {ETHNICITY_COLORS.map(({ key, color }) => {
            const pct = data[key] as number;
            if (pct < 0.5) return null;
            return (
              <div
                key={key}
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            );
          })}
          {otherPct > 0.5 && (
            <div style={{ width: `${otherPct}%`, backgroundColor: '#71717a' }} />
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {ETHNICITY_COLORS.map(({ key, label, color }) => {
            const pct = data[key] as number;
            if (pct < 0.5) return null;
            return (
              <span key={key} className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                {label} {pct.toFixed(1)}%
              </span>
            );
          })}
          {otherPct > 0.5 && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#71717a' }} />
              Other {otherPct.toFixed(1)}%
            </span>
          )}
        </div>
      </div>

      {/* Education & Income */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <h4 className="mb-1.5 text-sm font-medium text-muted-foreground">Education</h4>
          <div className="text-xl font-bold tabular-nums">
            {data.collegDegreePct.toFixed(1)}%
          </div>
          <div className="text-xs text-muted-foreground">College degree</div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-content2">
            <div
              className="h-full rounded-full bg-indigo-500"
              style={{ width: `${Math.min(100, data.collegDegreePct)}%` }}
            />
          </div>
        </div>
        <div>
          <h4 className="mb-1.5 text-sm font-medium text-muted-foreground">Income</h4>
          <div className="text-xl font-bold tabular-nums">
            ${data.medianHouseholdIncome.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground">Median household</div>
        </div>
      </div>
    </div>
  );
});
