import { memo, useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { usePrimaryStore } from '@/stores/primaryStore';
import type { PollSourceMode } from '@/stores/primaryStore';
import { SCENARIO_PRESETS } from '../lib/pollPresets';
import { PollAverageSummary } from './PollAverageSummary';
import { PollTrendChart } from './PollTrendChart';
import { PollTable } from './PollTable';
import { AddPollForm } from './AddPollForm';
import { PollAveragingConfig } from './PollAveragingConfig';

const TABS: { id: PollSourceMode; label: string }[] = [
  { id: 'average', label: 'Polls' },
  { id: 'scenario', label: 'Scenarios' },
];

/**
 * PollManager -- tabbed container that replaces the old PollPresetSelector.
 *
 * Two tabs:
 *   "Polls"     — multi-poll averaging (PollAverageSummary + PollTrendChart +
 *                  PollTable + AddPollForm + PollAveragingConfig)
 *   "Scenarios" — hypothetical scenario presets (dropdown + metadata)
 *
 * Switching tabs updates pollSource in the store, which in turn triggers
 * applyPollAverage or applyPreset as appropriate.
 */
export const PollManager = memo(function PollManager() {
  const pollSource = usePrimaryStore((s) => s.pollSource);
  const setPollSource = usePrimaryStore((s) => s.setPollSource);

  const [addPollOpen, setAddPollOpen] = useState(false);

  const handleTabChange = useCallback(
    (tab: PollSourceMode) => {
      setPollSource(tab);
    },
    [setPollSource],
  );

  const handleOpenAddPoll = useCallback(() => {
    setAddPollOpen(true);
  }, []);

  const handleCloseAddPoll = useCallback(() => {
    setAddPollOpen(false);
  }, []);

  return (
    <div className="space-y-3">
      {/* Tab strip */}
      <div
        className="flex rounded-lg bg-muted/30 p-0.5"
        role="tablist"
        aria-label="Poll data source"
      >
        {TABS.map((tab) => {
          const isActive = pollSource === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => handleTabChange(tab.id)}
              className={
                'flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ' +
                (isActive
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground')
              }
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Polls tab content */}
      {pollSource === 'average' && (
        <div className="space-y-3">
          <PollAverageSummary />
          <PollTrendChart />
          <PollTable />

          {/* Add poll toggle / form */}
          {addPollOpen ? (
            <AddPollForm isOpen={addPollOpen} onClose={handleCloseAddPoll} />
          ) : (
            <button
              type="button"
              onClick={handleOpenAddPoll}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border/50 px-3 py-2 text-xs text-muted-foreground hover:border-border hover:text-foreground transition-colors"
            >
              <Plus className="h-3 w-3" aria-hidden="true" />
              Add Poll
            </button>
          )}

          <PollAveragingConfig />
        </div>
      )}

      {/* Scenarios tab content */}
      {pollSource === 'scenario' && <ScenarioPanel />}
    </div>
  );
});

/**
 * ScenarioPanel -- scenario preset dropdown (formerly the standalone
 * PollPresetSelector). Renders inside PollManager's "Scenarios" tab.
 */
const ScenarioPanel = memo(function ScenarioPanel() {
  const activePresetId = usePrimaryStore((s) => s.activePresetId);
  const setActivePresetId = usePrimaryStore((s) => s.setActivePresetId);
  const applyPreset = usePrimaryStore((s) => s.applyPreset);

  const activePreset = SCENARIO_PRESETS.find((p) => p.id === activePresetId);

  const handlePresetChange = useCallback(
    (presetId: string) => {
      setActivePresetId(presetId);
      if (presetId !== 'custom') {
        const preset = SCENARIO_PRESETS.find((p) => p.id === presetId);
        if (preset) applyPreset(preset.candidates);
      }
    },
    [setActivePresetId, applyPreset],
  );

  return (
    <div className="glass-panel rounded-lg p-3 space-y-2">
      <label
        htmlFor="scenario-preset-select"
        className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
      >
        Scenario
      </label>

      <select
        id="scenario-preset-select"
        value={activePresetId}
        onChange={(e) => handlePresetChange(e.target.value)}
        className="w-full rounded-md border border-border/60 bg-content2/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        aria-label="Select scenario preset"
      >
        {SCENARIO_PRESETS.map((preset) => (
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
                {new Date(activePreset.date + 'T00:00:00').toLocaleDateString(
                  'en-US',
                  { month: 'short', day: 'numeric', year: 'numeric' },
                )}
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

      <p className="text-[10px] text-muted-foreground/60 italic">
        Hypothetical scenarios override poll averages. Switch to the Polls tab
        to use real polling data.
      </p>
    </div>
  );
});
