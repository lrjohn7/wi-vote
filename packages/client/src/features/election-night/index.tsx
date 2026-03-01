import { Radio } from 'lucide-react';
import { usePageTitle } from '@/shared/hooks/usePageTitle';
import { ComingSoonOverlay } from '@/shared/components/ComingSoonOverlay';

export default function ElectionNight() {
  usePageTitle('Election Night');

  return (
    <ComingSoonOverlay
      title="Election Night Live"
      description="Watch Wisconsin election results come in ward-by-ward on election night. Real-time map updates, live vote tallies, and reporting progress as results are certified."
      icon={<Radio className="h-10 w-10" />}
    />
  );
}
