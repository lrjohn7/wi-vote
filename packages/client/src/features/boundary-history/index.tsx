import { History } from 'lucide-react';
import { usePageTitle } from '@/shared/hooks/usePageTitle';
import { ComingSoonOverlay } from '@/shared/components/ComingSoonOverlay';

export default function BoundaryHistory() {
  usePageTitle('Boundary History');

  return (
    <ComingSoonOverlay
      title="Ward Boundary History"
      description="Explore how Wisconsin's ward boundaries have changed over time. Animate boundary transitions across redistricting cycles from 2011 through 2022."
      icon={<History className="h-10 w-10" />}
    />
  );
}
