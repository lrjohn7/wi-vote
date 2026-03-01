import { useNavigate } from 'react-router';
import { X, ClipboardList } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useWardDetail } from '../hooks/useWardDetail';
import { useMapStore } from '@/stores/mapStore';

const RACE_LABELS: Record<string, string> = {
  president: 'President',
  governor: 'Governor',
  us_senate: 'US Senate',
  us_house: 'US House',
  state_senate: 'State Senate',
  state_assembly: 'State Assembly',
  attorney_general: 'AG',
  secretary_of_state: 'SoS',
  treasurer: 'Treasurer',
};

export function WardDetailPanel() {
  const navigate = useNavigate();
  const selectedWardId = useMapStore((s) => s.selectedWardId);
  const setSelectedWard = useMapStore((s) => s.setSelectedWard);
  const { data: ward, isLoading } = useWardDetail(selectedWardId);

  if (!selectedWardId) return null;

  return (
    <div className="absolute right-0 top-0 z-30 flex h-full w-[420px] flex-col border-l border-border/30 bg-content1/95 shadow-lg backdrop-blur-sm animate-in slide-in-from-right-full duration-300">
      {/* Header */}
      <div className="flex items-start justify-between px-5 py-4">
        <div className="min-w-0 flex-1">
          {isLoading ? (
            <div className="space-y-2">
              <div className="h-6 w-48 animate-pulse rounded bg-muted" />
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            </div>
          ) : ward ? (
            <>
              <h3 className="truncate text-lg font-semibold">{ward.ward_name}</h3>
              <p className="text-sm text-muted-foreground">
                {ward.municipality}, {ward.county} County
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Ward not found</p>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          {ward && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="Report Card"
              onClick={() => navigate(`/wards/${ward.ward_id}/report`)}
            >
              <ClipboardList className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSelectedWard(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {ward && (
        <>
          {/* District Badges */}
          <div className="flex flex-wrap gap-1.5 px-4 pb-3">
            {ward.congressional_district && (
              <Badge variant="secondary">CD-{ward.congressional_district}</Badge>
            )}
            {ward.state_senate_district && (
              <Badge variant="secondary">SD-{ward.state_senate_district}</Badge>
            )}
            {ward.assembly_district && (
              <Badge variant="secondary">AD-{ward.assembly_district}</Badge>
            )}
            {ward.is_estimated && (
              <Badge variant="outline" className="border-amber-300 text-amber-600">
                Estimated*
              </Badge>
            )}
          </div>

          <Separator />

          {/* Election Results */}
          <ScrollArea className="flex-1">
            <div className="p-4">
              <h4 className="mb-3 text-sm font-medium text-muted-foreground">
                Election History
              </h4>
              {ward.elections.length === 0 ? (
                <p className="text-sm text-muted-foreground">No election data available</p>
              ) : (
                <div className="space-y-2">
                  {ward.elections.map((e) => {
                    const totalTwoParty = e.dem_votes + e.rep_votes;
                    const demBarPct = totalTwoParty > 0
                      ? (e.dem_votes / totalTwoParty) * 100
                      : 50;
                    const marginLabel =
                      e.margin > 0
                        ? `D+${e.margin.toFixed(1)}`
                        : e.margin < 0
                          ? `R+${Math.abs(e.margin).toFixed(1)}`
                          : 'Even';

                    return (
                      <div
                        key={`${e.election_year}-${e.race_type}`}
                        className="rounded-xl border border-border/30 bg-content2/50 p-3 transition-shadow duration-200 hover:shadow-md"
                      >
                        <div className="mb-1.5 flex items-center justify-between">
                          <span className="text-sm font-medium">
                            {e.election_year} {RACE_LABELS[e.race_type] ?? e.race_type}
                          </span>
                          <span
                            className={`text-sm font-semibold ${e.margin > 0 ? 'text-dem' : 'text-rep'}`}
                          >
                            {marginLabel}
                          </span>
                        </div>

                        {/* Two-party bar */}
                        <div className="mb-1.5 flex h-2.5 overflow-hidden rounded-full">
                          <div
                            className="transition-all"
                            style={{
                              width: `${demBarPct}%`,
                              backgroundColor: 'var(--dem)',
                            }}
                          />
                          <div
                            className="transition-all"
                            style={{
                              width: `${100 - demBarPct}%`,
                              backgroundColor: 'var(--rep)',
                            }}
                          />
                        </div>

                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>
                            DEM {e.dem_votes.toLocaleString()} ({e.dem_pct.toFixed(1)}%)
                          </span>
                          <span>
                            REP {e.rep_votes.toLocaleString()} ({e.rep_pct.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          Total: {e.total_votes.toLocaleString()}
                          {e.is_estimate && (
                            <span className="ml-1 text-amber-600">*est.</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {ward.is_estimated && (
                <p className="mt-4 text-xs text-amber-600">
                  * This ward's data comes from a combined reporting unit. Vote totals are
                  population-weighted estimates, not direct counts.
                </p>
              )}
            </div>
          </ScrollArea>
        </>
      )}
    </div>
  );
}
