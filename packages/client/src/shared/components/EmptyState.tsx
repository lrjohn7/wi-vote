import type { LucideIcon } from 'lucide-react';
import { SearchX } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  children?: React.ReactNode;
}

/**
 * Consistent empty state display for when there's no data or user hasn't
 * made a selection yet. Renders a centered icon + title + description.
 *
 * Usage:
 *   <EmptyState title="No results found" description="Try a different search." />
 *   <EmptyState icon={MapPin} title="Select a ward" description="Click on the map..." />
 */
export function EmptyState({
  icon: Icon = SearchX,
  title,
  description,
  children,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-8 text-center" role="status">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-content2/60">
        <Icon className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-medium text-foreground">{title}</h3>
        {description && (
          <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}
