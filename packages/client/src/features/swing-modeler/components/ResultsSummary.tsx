import type { Prediction } from '@/types/election';
import type { MapDataResponse } from '@/features/election-map/hooks/useMapData';

interface ResultsSummaryProps {
  predictions: Prediction[] | null;
  baseMapData: MapDataResponse | null;
}

function formatMargin(margin: number): string {
  if (Math.abs(margin) < 0.05) return 'Even';
  if (margin > 0) return `D+${margin.toFixed(1)}`;
  return `R+${Math.abs(margin).toFixed(1)}`;
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

export function ResultsSummary({ predictions, baseMapData }: ResultsSummaryProps) {
  if (!predictions || predictions.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        Select a base election to see projected results.
      </div>
    );
  }

  // Aggregate statewide totals
  const totalDem = predictions.reduce((sum, p) => sum + p.predictedDemVotes, 0);
  const totalRep = predictions.reduce((sum, p) => sum + p.predictedRepVotes, 0);
  const totalVotes = predictions.reduce((sum, p) => sum + p.predictedTotalVotes, 0);
  const margin = totalVotes > 0 ? ((totalDem - totalRep) / totalVotes) * 100 : 0;

  const twoPartyTotal = totalDem + totalRep;
  const demBarPct = twoPartyTotal > 0 ? (totalDem / twoPartyTotal) * 100 : 50;

  const wardsWonDem = predictions.filter((p) => p.predictedMargin > 0).length;
  const wardsWonRep = predictions.filter((p) => p.predictedMargin < 0).length;
  const wardsTied = predictions.length - wardsWonDem - wardsWonRep;

  // Compute baseline totals for shift comparison
  let baselineMargin: number | null = null;
  if (baseMapData) {
    const baseDem = Object.values(baseMapData.data).reduce((s, e) => s + e.demVotes, 0);
    const baseRep = Object.values(baseMapData.data).reduce((s, e) => s + e.repVotes, 0);
    const baseTotal = Object.values(baseMapData.data).reduce((s, e) => s + e.totalVotes, 0);
    if (baseTotal > 0) {
      baselineMargin = ((baseDem - baseRep) / baseTotal) * 100;
    }
  }

  const shift = baselineMargin != null ? margin - baselineMargin : null;
  const winner = margin > 0 ? 'DEM' : margin < 0 ? 'REP' : 'TIE';
  const winnerColor = margin > 0 ? '#2166ac' : '#b2182b';

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">Projected Results</h3>

      {/* Winner + Margin */}
      <div className="rounded-lg border p-3">
        <div className="text-center">
          <div
            className="text-2xl font-bold"
            style={{ color: winnerColor }}
          >
            {formatMargin(margin)}
          </div>
          <div className="text-xs text-muted-foreground">
            Projected {winner === 'TIE' ? 'Tie' : `${winner} Win`}
          </div>
        </div>

        {/* Two-party bar */}
        <div className="mt-2 flex h-3 overflow-hidden rounded-full">
          <div
            className="transition-all duration-150"
            style={{ width: `${demBarPct}%`, backgroundColor: '#2166ac' }}
          />
          <div
            className="transition-all duration-150"
            style={{ width: `${100 - demBarPct}%`, backgroundColor: '#b2182b' }}
          />
        </div>
        <div className="mt-1 flex justify-between text-xs text-muted-foreground">
          <span>{demBarPct.toFixed(1)}%</span>
          <span>{(100 - demBarPct).toFixed(1)}%</span>
        </div>
      </div>

      {/* Vote Totals */}
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-[#2166ac] font-medium">DEM</span>
          <span>{formatNumber(totalDem)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#b2182b] font-medium">REP</span>
          <span>{formatNumber(totalRep)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Total</span>
          <span>{formatNumber(totalVotes)}</span>
        </div>
      </div>

      {/* Shift from baseline */}
      {shift != null && (
        <div className="rounded-lg border p-2 text-center">
          <div className="text-xs text-muted-foreground">Shift from baseline</div>
          <div
            className="text-sm font-semibold"
            style={{ color: shift > 0 ? '#2166ac' : shift < 0 ? '#b2182b' : undefined }}
          >
            {shift > 0 ? '+' : ''}{shift.toFixed(1)} points
          </div>
        </div>
      )}

      {/* Wards won */}
      <div className="space-y-1 text-xs text-muted-foreground">
        <div className="flex justify-between">
          <span>Wards won (DEM)</span>
          <span className="font-medium text-[#2166ac]">{formatNumber(wardsWonDem)}</span>
        </div>
        <div className="flex justify-between">
          <span>Wards won (REP)</span>
          <span className="font-medium text-[#b2182b]">{formatNumber(wardsWonRep)}</span>
        </div>
        {wardsTied > 0 && (
          <div className="flex justify-between">
            <span>Tied</span>
            <span>{formatNumber(wardsTied)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
