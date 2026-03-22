import { Badge } from '@/components/ui/badge';

interface TrendClassificationBadgeProps {
  direction: string;
  slope: number | null;
}

export function TrendClassificationBadge({ direction, slope }: TrendClassificationBadgeProps) {
  if (direction === 'more_democratic') {
    const slopeText = slope != null ? ` +${Math.abs(slope).toFixed(1)}/yr` : '';
    return (
      <Badge
        className="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
        variant="outline"
      >
        Trending D{slopeText}
      </Badge>
    );
  }

  if (direction === 'more_republican') {
    const slopeText = slope != null ? ` +${Math.abs(slope).toFixed(1)}/yr` : '';
    return (
      <Badge
        className="border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300"
        variant="outline"
      >
        Trending R{slopeText}
      </Badge>
    );
  }

  return (
    <Badge
      className="border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800/30 dark:text-gray-400"
      variant="outline"
    >
      Inconclusive
    </Badge>
  );
}
