import { useNavigate } from 'react-router';
import { MapPin, Share2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ReportCardResponse } from '@/services/api';
import { useMapStore } from '@/stores/mapStore';

interface ReportCardHeaderProps {
  metadata: ReportCardResponse['metadata'];
  hasEstimates: boolean;
}

export function ReportCardHeader({ metadata, hasEstimates }: ReportCardHeaderProps) {
  const navigate = useNavigate();
  const setSelectedWard = useMapStore((s) => s.setSelectedWard);

  const handleViewOnMap = () => {
    setSelectedWard(metadata.ward_id);
    navigate('/map');
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback: select-all in a temporary input
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">{metadata.ward_name}</h1>
          <p className="text-muted-foreground">
            {metadata.municipality}, {metadata.county} County
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="mr-1 h-4 w-4" />
            Share
          </Button>
          <Button variant="outline" size="sm" onClick={handleViewOnMap}>
            <MapPin className="mr-1 h-4 w-4" />
            View on Map
          </Button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {metadata.congressional_district && (
          <Badge variant="secondary">
            Congressional District {metadata.congressional_district}
          </Badge>
        )}
        {metadata.state_senate_district && (
          <Badge variant="secondary">
            Senate District {metadata.state_senate_district}
          </Badge>
        )}
        {metadata.assembly_district && (
          <Badge variant="secondary">
            Assembly District {metadata.assembly_district}
          </Badge>
        )}
        {hasEstimates && (
          <Badge variant="outline" className="border-amber-300 text-amber-600">
            Combined Reporting Unit
          </Badge>
        )}
      </div>
    </div>
  );
}
