import { useState, useCallback, type ReactNode } from 'react';
import { X, Info } from 'lucide-react';

interface DismissibleInfoBannerProps {
  /** LocalStorage key for persisting dismissal. Must be unique per page. */
  storageKey: string;
  /** Optional heading above the body text. */
  title?: string;
  /** Banner body content. */
  children: ReactNode;
  /** Additional CSS classes on the outer container. */
  className?: string;
  /** If true, renders with absolute positioning for map overlays. */
  overlay?: boolean;
}

/**
 * A compact, dismissible info banner that persists its dismissed state
 * to localStorage so returning users don't see it again.
 *
 * Two modes:
 * - Default: inline block element
 * - overlay=true: absolutely positioned at top-center, for map pages
 */
export function DismissibleInfoBanner({
  storageKey,
  title,
  children,
  className = '',
  overlay = false,
}: DismissibleInfoBannerProps) {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(storageKey) === '1',
  );

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    localStorage.setItem(storageKey, '1');
  }, [storageKey]);

  if (dismissed) return null;

  const baseClasses =
    'flex items-start gap-2.5 rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2 text-xs';
  const overlayClasses = overlay
    ? 'absolute top-2 left-1/2 -translate-x-1/2 z-20 max-w-lg w-[calc(100%-2rem)] shadow-lg backdrop-blur-sm'
    : '';

  return (
    <div
      role="status"
      className={`${baseClasses} ${overlayClasses} ${className}`}
    >
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-400" aria-hidden="true" />
      <div className="flex-1 space-y-0.5">
        {title && (
          <p className="font-medium text-blue-400">{title}</p>
        )}
        <div className="leading-relaxed text-muted-foreground">
          {children}
        </div>
      </div>
      <button
        onClick={handleDismiss}
        className="shrink-0 rounded p-0.5 text-muted-foreground/60 hover:text-foreground hover:bg-foreground/10 transition-colors"
        aria-label="Dismiss info"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
