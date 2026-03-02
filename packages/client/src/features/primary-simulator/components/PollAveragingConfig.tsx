import { memo, useState, useCallback } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { usePrimaryStore } from '@/stores/primaryStore';

/**
 * PollAveragingConfig -- collapsible settings panel for the EWMA poll
 * averaging algorithm. Exposes half-life, frequency dampening toggle,
 * and partisan penalty toggle.
 *
 * Reads and writes pollAveragingConfig from the primary store.
 */
export const PollAveragingConfig = memo(function PollAveragingConfig() {
  const [isOpen, setIsOpen] = useState(false);
  const config = usePrimaryStore((s) => s.pollAveragingConfig);
  const setPollAveragingConfig = usePrimaryStore((s) => s.setPollAveragingConfig);

  const handleToggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleHalfLifeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setPollAveragingConfig({ halfLifeDays: parseInt(e.target.value) || 25 });
    },
    [setPollAveragingConfig],
  );

  const handleFrequencyChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setPollAveragingConfig({ frequencyDampening: e.target.checked });
    },
    [setPollAveragingConfig],
  );

  const handlePartisanChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setPollAveragingConfig({ partisanPenalty: e.target.checked });
    },
    [setPollAveragingConfig],
  );

  return (
    <div className="glass-panel rounded-lg">
      {/* Disclosure button */}
      <button
        type="button"
        onClick={handleToggleOpen}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
        aria-expanded={isOpen}
        aria-controls="poll-avg-config-panel"
      >
        {isOpen ? (
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
        )}
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Averaging Settings
        </span>
      </button>

      {/* Collapsible content */}
      {isOpen && (
        <div
          id="poll-avg-config-panel"
          className="border-t border-border/20 px-3 pb-3 pt-2 space-y-3"
        >
          {/* Half-life slider */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label htmlFor="pac-halflife" className="text-xs text-muted-foreground">
                Half-life
              </label>
              <span className="text-xs font-mono tabular-nums text-muted-foreground">
                {config.halfLifeDays}d
              </span>
            </div>
            <input
              id="pac-halflife"
              type="range"
              min={5}
              max={60}
              step={1}
              value={config.halfLifeDays}
              onChange={handleHalfLifeChange}
              className="w-full h-1.5 accent-foreground cursor-pointer"
              aria-label={`Half-life: ${config.halfLifeDays} days`}
            />
            <p className="text-[10px] text-muted-foreground/60">
              Older polls lose weight exponentially. Lower = favors recent polls.
            </p>
          </div>

          {/* Frequency dampening toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.frequencyDampening}
              onChange={handleFrequencyChange}
              className="h-3 w-3 rounded accent-foreground cursor-pointer"
            />
            <span className="text-xs text-muted-foreground">
              Frequency dampening
            </span>
          </label>
          <p className="text-[10px] text-muted-foreground/60 -mt-2 ml-5">
            Reduce weight of pollsters who release many polls in a short window.
          </p>

          {/* Partisan penalty toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.partisanPenalty}
              onChange={handlePartisanChange}
              className="h-3 w-3 rounded accent-foreground cursor-pointer"
            />
            <span className="text-xs text-muted-foreground">
              Partisan penalty
            </span>
          </label>
          <p className="text-[10px] text-muted-foreground/60 -mt-2 ml-5">
            Apply a 30% weight reduction to polls from partisan organizations.
          </p>
        </div>
      )}
    </div>
  );
});
