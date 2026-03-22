import { useState, useCallback, useMemo } from 'react';
import { usePrimaryStore } from '@/stores/primaryStore';
import type { PrimaryPoll, PollPopulation } from '@/types/primary';

interface AddPollFormProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Population type options for the select dropdown. */
const POPULATION_OPTIONS: { label: string; value: PollPopulation }[] = [
  { label: 'Likely Voters', value: 'lv' },
  { label: 'Registered Voters', value: 'rv' },
  { label: 'All Adults', value: 'a' },
];

/**
 * AddPollForm -- collapsible form for entering a new poll with per-candidate
 * percentages, sample size, pollster metadata, and quality ratings.
 *
 * When submitted, creates a PrimaryPoll with a random UUID, marks it as
 * user-added (isBuiltIn=false), and adds it to the store.
 */
export function AddPollForm({ isOpen, onClose }: AddPollFormProps) {
  const candidates = usePrimaryStore((s) => s.candidates);
  const addPoll = usePrimaryStore((s) => s.addPoll);

  // Form state
  const [pollster, setPollster] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sampleSize, setSampleSize] = useState(600);
  const [population, setPopulation] = useState<PollPopulation>('lv');
  const [pollsterRating, setPollsterRating] = useState(1.5);
  const [isPartisan, setIsPartisan] = useState(false);
  const [undecided, setUndecided] = useState(0);
  const [candidatePcts, setCandidatePcts] = useState<Record<string, number>>(
    () => {
      const initial: Record<string, number> = {};
      for (const c of candidates) {
        initial[c.id] = 0;
      }
      return initial;
    },
  );

  // Compute the sum of all candidate percentages + undecided
  const totalSum = useMemo(() => {
    let sum = undecided;
    for (const id of Object.keys(candidatePcts)) {
      sum += candidatePcts[id] ?? 0;
    }
    return sum;
  }, [candidatePcts, undecided]);

  const sumIsValid = totalSum >= 99 && totalSum <= 101;

  const handleCandidatePctChange = useCallback(
    (candidateId: string, value: number) => {
      setCandidatePcts((prev) => ({ ...prev, [candidateId]: value }));
    },
    [],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (!pollster.trim() || !startDate || !endDate || sampleSize < 50) {
        return;
      }

      const newPoll: PrimaryPoll = {
        id: crypto.randomUUID(),
        pollster: pollster.trim(),
        startDate,
        endDate,
        sampleSize,
        population,
        methodology: '',
        pollsterRating,
        isPartisan,
        marginOfError: null,
        sourceUrl: '',
        notes: '',
        candidates: { ...candidatePcts },
        undecided,
        isEnabled: true,
        isBuiltIn: false,
      };

      addPoll(newPoll);

      // Reset form
      setPollster('');
      setStartDate('');
      setEndDate('');
      setSampleSize(600);
      setPopulation('lv');
      setPollsterRating(1.5);
      setIsPartisan(false);
      setUndecided(0);
      const reset: Record<string, number> = {};
      for (const c of candidates) {
        reset[c.id] = 0;
      }
      setCandidatePcts(reset);

      onClose();
    },
    [
      pollster,
      startDate,
      endDate,
      sampleSize,
      population,
      pollsterRating,
      isPartisan,
      candidatePcts,
      undecided,
      candidates,
      addPoll,
      onClose,
    ],
  );

  if (!isOpen) return null;

  const isFormValid =
    pollster.trim().length > 0 &&
    startDate.length > 0 &&
    endDate.length > 0 &&
    sampleSize >= 50;

  return (
    <form
      onSubmit={handleSubmit}
      className="glass-panel p-3 space-y-3 rounded-lg"
      aria-label="Add a new poll"
    >
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Add Poll
      </h4>

      {/* Pollster name */}
      <div className="space-y-1">
        <label htmlFor="ap-pollster" className="text-xs text-muted-foreground">
          Pollster
        </label>
        <input
          id="ap-pollster"
          type="text"
          required
          value={pollster}
          onChange={(e) => setPollster(e.target.value)}
          placeholder="e.g. Marquette Law School"
          className="w-full rounded border border-border/30 bg-content2/50 px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Date row */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label htmlFor="ap-start" className="text-xs text-muted-foreground">
            Start Date
          </label>
          <input
            id="ap-start"
            type="date"
            required
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded border border-border/30 bg-content2/50 px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="ap-end" className="text-xs text-muted-foreground">
            End Date
          </label>
          <input
            id="ap-end"
            type="date"
            required
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded border border-border/30 bg-content2/50 px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      {/* Sample size + Population row */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label htmlFor="ap-sample" className="text-xs text-muted-foreground">
            Sample Size
          </label>
          <input
            id="ap-sample"
            type="number"
            required
            min={50}
            value={sampleSize}
            onChange={(e) => setSampleSize(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-full rounded border border-border/30 bg-content2/50 px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="ap-pop" className="text-xs text-muted-foreground">
            Population
          </label>
          <select
            id="ap-pop"
            value={population}
            onChange={(e) => setPopulation(e.target.value as PollPopulation)}
            className="w-full rounded border border-border/30 bg-content2/50 px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {POPULATION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Pollster rating + Partisan */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label htmlFor="ap-rating" className="text-xs text-muted-foreground">
            Pollster Rating ({pollsterRating.toFixed(1)})
          </label>
          <input
            id="ap-rating"
            type="range"
            min={0}
            max={3}
            step={0.1}
            value={pollsterRating}
            onChange={(e) => setPollsterRating(parseFloat(e.target.value))}
            className="w-full h-1.5 accent-foreground cursor-pointer"
            aria-label={`Pollster rating: ${pollsterRating.toFixed(1)}`}
          />
        </div>
        <div className="flex items-end pb-0.5">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={isPartisan}
              onChange={(e) => setIsPartisan(e.target.checked)}
              className="h-3 w-3 rounded accent-foreground cursor-pointer"
            />
            Partisan poll
          </label>
        </div>
      </div>

      {/* Per-candidate percentages */}
      <div className="space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Candidate Results (%)
        </span>
        {candidates
          .filter((c) => c.isActive)
          .map((c) => (
            <div key={c.id} className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: c.color }}
                aria-hidden="true"
              />
              <label
                htmlFor={`ap-cand-${c.id}`}
                className="text-xs flex-1 min-w-0 truncate"
              >
                {c.shortName}
              </label>
              <input
                id={`ap-cand-${c.id}`}
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={candidatePcts[c.id] ?? 0}
                onChange={(e) =>
                  handleCandidatePctChange(
                    c.id,
                    Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)),
                  )
                }
                className="w-16 rounded border border-border/30 bg-content2/50 px-2 py-0.5 text-xs font-mono text-right text-foreground focus:outline-none focus:ring-1 focus:ring-ring tabular-nums"
              />
            </div>
          ))}

        {/* Undecided */}
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full shrink-0 bg-muted-foreground/40" aria-hidden="true" />
          <label htmlFor="ap-undecided" className="text-xs flex-1 min-w-0">
            Undecided
          </label>
          <input
            id="ap-undecided"
            type="number"
            min={0}
            max={100}
            step={0.1}
            value={undecided}
            onChange={(e) =>
              setUndecided(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))
            }
            className="w-16 rounded border border-border/30 bg-content2/50 px-2 py-0.5 text-xs font-mono text-right text-foreground focus:outline-none focus:ring-1 focus:ring-ring tabular-nums"
          />
        </div>

        {/* Sum indicator */}
        <div className="flex justify-end">
          <span
            className={
              'text-[11px] font-mono tabular-nums ' +
              (sumIsValid ? 'text-green-500' : 'text-amber-500')
            }
          >
            Sum: {totalSum.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onClose}
          className="rounded px-3 py-1 text-xs text-muted-foreground hover:bg-muted/30 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!isFormValid}
          className="rounded bg-foreground/10 px-3 py-1 text-xs font-medium hover:bg-foreground/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Add Poll
        </button>
      </div>
    </form>
  );
}
