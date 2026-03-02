import { memo } from 'react';
import { usePrimaryStore } from '@/stores/primaryStore';

/**
 * DropoutToggle -- small inline button for toggling a candidate's active
 * status (dropout / re-enter) within a CandidateCard.
 *
 * When a candidate is active, the button shows "Drop out" with a neutral
 * style that turns destructive on hover. When inactive (dropped out), it
 * shows "Re-enter" with a green style.
 */

interface DropoutToggleProps {
  /** The candidate ID to toggle */
  candidateId: string;
  /** Whether the candidate is currently active in the race */
  isActive: boolean;
}

export const DropoutToggle = memo(function DropoutToggle({
  candidateId,
  isActive,
}: DropoutToggleProps) {
  const toggleCandidateActive = usePrimaryStore((s) => s.toggleCandidateActive);

  // Look up the candidate name for the aria-label
  const candidateName = usePrimaryStore(
    (s) => s.candidates.find((c) => c.id === candidateId)?.shortName ?? candidateId,
  );

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        toggleCandidateActive(candidateId);
      }}
      className={
        'text-xs px-2 py-0.5 rounded-full border transition-colors ' +
        (isActive
          ? 'border-border/60 text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30'
          : 'border-green-500/30 text-green-600 bg-green-500/10 hover:bg-green-500/20')
      }
      aria-label={
        isActive
          ? `Remove ${candidateName} from race`
          : `Add ${candidateName} back to race`
      }
      title={isActive ? 'Drop out' : 'Re-enter race'}
    >
      {isActive ? 'Drop out' : 'Re-enter'}
    </button>
  );
});
