import type { UncertaintyBand } from '@/types/election';

interface UncertaintyOverlayProps {
  uncertainty: UncertaintyBand[] | null;
  visible: boolean;
}

/**
 * Displays uncertainty information as a summary panel.
 * The actual opacity modulation happens via the map's setFeatureState.
 */
export function UncertaintyOverlay({ uncertainty, visible }: UncertaintyOverlayProps) {
  if (!visible || !uncertainty || uncertainty.length === 0) return null;

  // Compute summary statistics
  const ranges = uncertainty.map((b) => b.upperDemPct - b.lowerDemPct);
  const avgRange = ranges.reduce((a, b) => a + b, 0) / ranges.length;
  const highConfidence = ranges.filter((r) => r < 10).length;
  const lowConfidence = ranges.filter((r) => r > 25).length;

  return (
    <div className="glass-panel absolute right-4 top-16 z-10 w-48 p-3">
      <h4 className="mb-2 text-xs font-semibold text-muted-foreground">Uncertainty</h4>
      <div className="space-y-1 text-[10px] text-muted-foreground">
        <div className="flex justify-between">
          <span>Avg band width:</span>
          <span className="font-medium">{avgRange.toFixed(1)} pts</span>
        </div>
        <div className="flex justify-between">
          <span>High confidence:</span>
          <span className="font-medium">{highConfidence.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Low confidence:</span>
          <span className="font-medium">{lowConfidence.toLocaleString()}</span>
        </div>
      </div>
      <div className="mt-2 space-y-0.5">
        <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
          <div className="h-3 w-3 rounded-sm border" style={{ backgroundColor: 'rgba(100,100,100,1)' }} />
          <span>High confidence</span>
        </div>
        <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
          <div className="h-3 w-3 rounded-sm border" style={{ backgroundColor: 'rgba(100,100,100,0.3)' }} />
          <span>Low confidence</span>
        </div>
      </div>
    </div>
  );
}
