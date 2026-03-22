import { memo } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { useTimeLapse } from '../hooks/useTimeLapse';
import { RACE_LABELS } from '@/shared/lib/raceLabels';
import type { RaceType } from '@/types/election';

const SPEED_LABELS: Record<number, string> = {
  2000: '0.5x',
  1200: '1x',
  600: '2x',
  300: '4x',
};

export const ElectionTimeLapse = memo(function ElectionTimeLapse() {
  const {
    isPlaying, speed, setSpeed, currentIdx, years, tlRaceType, raceTypes,
    play, pause, stop, jumpTo, changeRaceType, currentYear, isReady, SPEEDS,
  } = useTimeLapse();

  if (!isReady) return null;

  return (
    <div className="flex items-center gap-2" role="group" aria-label="Election time-lapse controls">
      {/* Play / Pause */}
      <button
        onClick={isPlaying ? pause : play}
        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
        aria-label={isPlaying ? 'Pause time-lapse' : 'Play time-lapse'}
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>

      {/* Reset (only visible when animation has started) */}
      {(isPlaying || currentIdx > 0) && (
        <button
          onClick={stop}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
          aria-label="Reset time-lapse"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Race type selector */}
      <select
        value={tlRaceType}
        onChange={(e) => changeRaceType(e.target.value as RaceType)}
        disabled={isPlaying}
        className="rounded-md border border-border/60 bg-content2/50 px-1.5 py-0.5 text-xs text-foreground disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-ring"
        aria-label="Time-lapse race type"
      >
        {raceTypes.map((rt) => (
          <option key={rt} value={rt}>{RACE_LABELS[rt] ?? rt}</option>
        ))}
      </select>

      {/* Speed control */}
      <select
        value={speed}
        onChange={(e) => setSpeed(Number(e.target.value))}
        className="rounded-md border border-border/60 bg-content2/50 px-1.5 py-0.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        aria-label="Playback speed"
      >
        {SPEEDS.map((s) => (
          <option key={s} value={s}>{SPEED_LABELS[s]}</option>
        ))}
      </select>

      {/* Progress slider */}
      <div className="flex items-center gap-1.5">
        <input
          type="range"
          min={0}
          max={years.length - 1}
          value={currentIdx}
          onChange={(e) => jumpTo(Number(e.target.value))}
          className="h-1.5 w-24 cursor-pointer accent-foreground sm:w-32"
          aria-label="Time-lapse year"
          aria-valuetext={String(currentYear)}
          aria-valuemin={0}
          aria-valuemax={years.length - 1}
        />
        {currentYear && (
          <span className="min-w-[3ch] text-xs font-bold tabular-nums text-foreground">
            {currentYear}
          </span>
        )}
      </div>
    </div>
  );
});

/** Big year overlay displayed on the map during playback */
export const TimeLapseOverlay = memo(function TimeLapseOverlay({ year }: { year: number }) {
  return (
    <div className="pointer-events-none absolute left-4 top-4 z-20" aria-hidden="true">
      <div className="glass-panel px-4 py-2 backdrop-blur-md">
        <span className="text-4xl font-black tabular-nums text-foreground">{year}</span>
      </div>
    </div>
  );
});
