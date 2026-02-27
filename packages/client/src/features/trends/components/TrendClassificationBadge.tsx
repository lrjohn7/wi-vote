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
        className="border-blue-200 bg-blue-50 text-blue-700"
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
        className="border-red-200 bg-red-50 text-red-700"
        variant="outline"
      >
        Trending R{slopeText}
      </Badge>
    );
  }

  return (
    <Badge
      className="border-gray-200 bg-gray-50 text-gray-600"
      variant="outline"
    >
      Inconclusive
    </Badge>
  );
}
