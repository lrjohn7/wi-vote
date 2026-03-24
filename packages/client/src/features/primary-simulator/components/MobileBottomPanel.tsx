import { useState, useEffect, useCallback, memo } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { usePrimaryStore } from '@/stores/primaryStore';
import { CandidateCardList } from './CandidateCardList';
import { PollManager } from './PollManager';
import { PrimaryControlsPanel } from './PrimaryControlsPanel';
import { PrimaryResultsSummary } from './PrimaryResultsSummary';
import { WinProbabilityBars } from './WinProbabilityBars';

const MAX_COLLAPSED_CANDIDATES = 4;

/**
 * Persistent bottom panel for mobile Primary Simulator.
 *
 * Collapsed: shows top 4 candidates (last name + %) with a CTA to expand.
 * Expanded: full candidate list, global controls, polls/scenarios, results.
 *
 * Replaces the old FAB + left-drawer pattern for better discoverability.
 */
export const MobileBottomPanel = memo(function MobileBottomPanel() {
  const [expanded, setExpanded] = useState(false);
  const candidates = usePrimaryStore((s) => s.candidates);

  // Sort candidates by polling baseline descending for the collapsed summary
  const sortedCandidates = [...candidates].sort(
    (a, b) => b.pollingBaseline - a.pollingBaseline,
  );
  const topCandidates = sortedCandidates.slice(0, MAX_COLLAPSED_CANDIDATES);
  const remainingCount = sortedCandidates.length - MAX_COLLAPSED_CANDIDATES;

  // Collapse on Escape
  useEffect(() => {
    if (!expanded) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setExpanded(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [expanded]);

  const toggle = useCallback(() => setExpanded((prev) => !prev), []);
  const collapse = useCallback(() => setExpanded(false), []);

  return (
    <>
      {/* Overlay: tap map area to collapse when expanded */}
      {expanded && (
        <div
          className="fixed inset-0 z-20 md:hidden"
          onClick={collapse}
          aria-hidden="true"
        />
      )}

      {/* Bottom panel */}
      <div
        className={
          'fixed bottom-0 inset-x-0 z-30 md:hidden ' +
          'bg-content1 border-t border-border/30 rounded-t-xl shadow-lg ' +
          'transition-[max-height] duration-300 ease-out overflow-hidden ' +
          (expanded ? 'max-h-[65vh]' : 'max-h-[160px]')
        }
        role="region"
        aria-label="Primary simulator controls"
      >
        {/* Drag handle / toggle button */}
        <button
          onClick={toggle}
          className="flex w-full items-center justify-center py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse controls panel' : 'Expand controls panel'}
        >
          <span className="h-1 w-9 rounded-full bg-muted-foreground/40" aria-hidden="true" />
        </button>

        {/* Collapsed state: candidate summary + CTA */}
        {!expanded && (
          <div className="px-4 pb-[env(safe-area-inset-bottom,0px)]">
            {/* Top candidates */}
            <div className="space-y-0.5">
              {topCandidates.map((c) => (
                <div
                  key={c.id}
                  className={
                    'flex items-center justify-between py-1.5 ' +
                    (c.isActive ? '' : 'opacity-50')
                  }
                >
                  <span className="flex items-center gap-2 text-sm">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: c.isActive ? c.color : 'hsl(var(--muted-foreground))' }}
                      aria-hidden="true"
                    />
                    <span className={c.isActive ? 'text-foreground' : 'text-muted-foreground line-through'}>
                      {c.shortName}
                    </span>
                  </span>
                  <span className="text-sm font-semibold tabular-nums" style={{ color: c.isActive ? c.color : undefined }}>
                    {Math.round(c.pollingBaseline)}%
                  </span>
                </div>
              ))}
            </div>

            {/* +N more */}
            {remainingCount > 0 && (
              <p className="text-xs text-muted-foreground/60 text-center mt-1">
                +{remainingCount} more
              </p>
            )}

            {/* CTA */}
            <button
              onClick={toggle}
              className="mt-2 mb-1 flex w-full items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
            >
              Adjust candidates and explore scenarios
              <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Expanded state: full controls */}
        {expanded && (
          <div
            className="flex-1 overflow-y-auto px-4 pb-[env(safe-area-inset-bottom,0px)] space-y-3"
            style={{ overscrollBehaviorY: 'contain' }}
          >
            <CandidateCardList useShortName />
            <PollManager />
            <PrimaryControlsPanel />
            <PrimaryResultsSummary />
            <WinProbabilityBars />

            {/* Collapse button at bottom for easy access */}
            <button
              onClick={collapse}
              className="flex w-full items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium text-muted-foreground hover:bg-foreground/5 transition-colors mb-2"
            >
              Collapse
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </>
  );
});
