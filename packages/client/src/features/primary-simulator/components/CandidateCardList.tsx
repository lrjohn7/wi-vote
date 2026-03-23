import { usePrimaryStore } from '@/stores/primaryStore';
import { CandidateCard } from './CandidateCard';

/**
 * Renders the full list of candidate cards for the primary simulator.
 *
 * Each card is expandable to reveal all adjustable parameters (polling baseline,
 * geographic base, ideology, demographic affinities, endorsement strength).
 * Cards can be toggled active/inactive to simulate candidate dropouts.
 */
export function CandidateCardList({ useShortName }: { useShortName?: boolean } = {}) {
  const candidates = usePrimaryStore((s) => s.candidates);

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground px-1">Candidates</h3>
      {candidates.map((c) => (
        <CandidateCard key={c.id} candidateId={c.id} useShortName={useShortName} />
      ))}
    </div>
  );
}
