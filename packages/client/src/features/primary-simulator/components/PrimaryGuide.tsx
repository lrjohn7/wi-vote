import { useState } from 'react';
import { X, Users, SlidersHorizontal, Map, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import { useDismissible } from '@/shared/hooks/useDismissible';

/**
 * Dismissible onboarding guide for the Primary Simulator.
 *
 * Shows a collapsible panel with step-by-step instructions on how to use
 * the simulator. Persists dismissal to localStorage so returning users
 * don't see it again.
 */
export function PrimaryGuide() {
  const [dismissed, handleDismiss] = useDismissible('wi-vote-primary-guide-dismissed');
  const [expanded, setExpanded] = useState(true);

  if (dismissed) return null;

  return (
    <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
      <div className="flex items-start justify-between gap-2">
        <button
          onClick={() => setExpanded((prev) => !prev)}
          className="flex items-center gap-1.5 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
          aria-expanded={expanded}
          aria-controls="primary-guide-content"
        >
          How to Use This Simulator
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </button>
        <button
          onClick={handleDismiss}
          className="shrink-0 rounded p-0.5 text-muted-foreground/60 hover:text-foreground hover:bg-foreground/10 transition-colors"
          aria-label="Dismiss guide"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {expanded && (
        <div id="primary-guide-content" className="mt-2.5 space-y-2.5">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Model a hypothetical Democratic gubernatorial primary across
            Wisconsin's ~7,000 wards. Adjust candidate profiles and see
            real-time ward-level projections on the map.
          </p>

          <div className="space-y-2">
            <Step
              icon={Users}
              number={1}
              title="Set up candidates"
              description="Click any candidate card to expand it. Adjust their polling baseline, geographic base, ideology, and demographic affinities. Toggle candidates on/off to simulate dropouts."
            />
            <Step
              icon={SlidersHorizontal}
              number={2}
              title="Tune global parameters"
              description="Set primary turnout rate (typically 15-25%), competitiveness (how spread the vote is), and factor weights to control how much geography, ideology, demographics, and endorsements matter."
            />
            <Step
              icon={Map}
              number={3}
              title="Explore the map"
              description="Winner mode colors each ward by projected winner. Heatmap mode shows a single candidate's vote share intensity. Hover over wards to see detailed projections."
            />
            <Step
              icon={BarChart3}
              number={4}
              title="Check probabilities"
              description="The Win Probability bars show Monte Carlo simulation results — each candidate's chance of winning statewide based on 2,000 randomized scenarios."
            />
          </div>

          <p className="text-[10px] text-muted-foreground/50 italic">
            Tip: Use the Polls tab to import real polling data or switch between poll scenarios.
          </p>
        </div>
      )}
    </div>
  );
}

function Step({
  icon: Icon,
  number,
  title,
  description,
}: {
  icon: typeof Users;
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-2.5">
      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-blue-400 mt-0.5">
        <Icon className="h-3 w-3" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-foreground/90">
          <span className="text-blue-400 mr-1">{number}.</span>
          {title}
        </p>
        <p className="text-[11px] text-muted-foreground/80 leading-relaxed mt-0.5">
          {description}
        </p>
      </div>
    </div>
  );
}
