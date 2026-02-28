import { useState } from 'react';
import { X, Info } from 'lucide-react';

export function TrendInfoBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      role="status"
      className="mx-4 mt-3 flex items-start gap-2.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800"
    >
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <div className="flex-1 space-y-1">
        <p className="font-medium">How trends are calculated</p>
        <p className="leading-relaxed text-blue-700">
          Each ward's partisan trend is determined by linear regression on its
          Democratic margin across all available elections.{' '}
          <span className="font-medium">Blue</span> = trending Democratic,{' '}
          <span className="font-medium">Red</span> = trending Republican,{' '}
          <span className="font-medium">Gray</span> = inconclusive (p &gt; 0.05).
          Color intensity reflects the magnitude of the shift.
        </p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded p-0.5 text-blue-400 hover:bg-blue-100 hover:text-blue-600"
        aria-label="Dismiss info"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
