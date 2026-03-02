import { usePrimaryStore } from '@/stores/primaryStore';
import { POLL_PRESETS } from '../lib/pollPresets';

/**
 * Dropdown that lets users select from predefined poll snapshots or "Custom" mode.
 *
 * When a preset is selected, candidate polling baselines are updated to match the
 * poll snapshot. When "Custom" is selected, baselines remain as-is and the user
 * can adjust them manually via CandidateCards.
 */
export function PollPresetSelector() {
  const activePresetId = usePrimaryStore((s) => s.activePresetId);
  const setActivePresetId = usePrimaryStore((s) => s.setActivePresetId);
  const applyPreset = usePrimaryStore((s) => s.applyPreset);

  const activePreset = POLL_PRESETS.find((p) => p.id === activePresetId);

  const handlePresetChange = (presetId: string) => {
    setActivePresetId(presetId);
    if (presetId !== 'custom') {
      const preset = POLL_PRESETS.find((p) => p.id === presetId);
      if (preset) applyPreset(preset.candidates);
    }
  };

  return (
    <div className="space-y-2">
      <label
        htmlFor="poll-preset-select"
        className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
      >
        Poll Baseline
      </label>

      <select
        id="poll-preset-select"
        value={activePresetId}
        onChange={(e) => handlePresetChange(e.target.value)}
        className="w-full rounded-md border border-border/60 bg-content2/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        aria-label="Select poll baseline preset"
      >
        {POLL_PRESETS.map((preset) => (
          <option key={preset.id} value={preset.id}>
            {preset.name}
          </option>
        ))}
        <option value="custom">Custom</option>
      </select>

      {activePreset && activePresetId !== 'custom' && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Source: {activePreset.source}</span>
          {activePreset.date && (
            <>
              <span className="text-border">|</span>
              <span>
                {new Date(activePreset.date + 'T00:00:00').toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </>
          )}
          {activePreset.undecided > 0 && (
            <>
              <span className="text-border">|</span>
              <span>{activePreset.undecided}% undec.</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
