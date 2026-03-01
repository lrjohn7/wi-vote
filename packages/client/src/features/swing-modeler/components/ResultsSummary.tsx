import { useMemo, memo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import type { Prediction } from '@/types/election';
import type { MapDataResponse } from '@/features/election-map/hooks/useMapData';
import type { WardMeta } from '@/shared/lib/wardMetadata';
import {
  aggregateByCounty,
  aggregateByCongressionalDistrict,
  aggregateBySenateDistrict,
  aggregateByAssemblyDistrict,
  type AggregatedResult,
} from '../lib/aggregatePredictions';

interface ResultsSummaryProps {
  predictions: Prediction[] | null;
  baseMapData: MapDataResponse | null;
  wardMetadata?: Record<string, WardMeta>;
}

function formatMargin(margin: number): string {
  if (Math.abs(margin) < 0.05) return 'Even';
  if (margin > 0) return `D+${margin.toFixed(1)}`;
  return `R+${Math.abs(margin).toFixed(1)}`;
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function AggregationTable({ rows }: { rows: AggregatedResult[] }) {
  if (rows.length === 0) {
    return <p className="py-2 text-xs text-muted-foreground">No district data available.</p>;
  }

  return (
    <div className="max-h-64 overflow-y-auto">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-content1">
          <tr className="border-b text-left text-muted-foreground">
            <th scope="col" className="py-1 pr-2 font-medium">Area</th>
            <th scope="col" className="py-1 pr-2 text-right font-medium">Margin</th>
            <th scope="col" className="py-1 text-right font-medium">Wards</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-b border-border/50">
              <td className="py-1 pr-2 truncate max-w-[120px]" title={r.label}>
                {r.label}
              </td>
              <td className="py-1 pr-2 text-right">
                <span
                  className={`font-semibold ${r.margin > 0 ? 'text-dem' : r.margin < 0 ? 'text-rep' : ''}`}
                >
                  {formatMargin(r.margin)}
                </span>
              </td>
              <td className="py-1 text-right text-muted-foreground">{r.wardCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const ResultsSummary = memo(function ResultsSummary({ predictions, baseMapData, wardMetadata }: ResultsSummaryProps) {
  if (!predictions || predictions.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        Select a base election to see projected results.
      </div>
    );
  }

  // Aggregate statewide totals
  const totalDem = predictions.reduce((sum, p) => sum + p.predictedDemVotes, 0);
  const totalRep = predictions.reduce((sum, p) => sum + p.predictedRepVotes, 0);
  const totalVotes = predictions.reduce((sum, p) => sum + p.predictedTotalVotes, 0);
  const margin = totalVotes > 0 ? ((totalDem - totalRep) / totalVotes) * 100 : 0;

  const twoPartyTotal = totalDem + totalRep;
  const demBarPct = twoPartyTotal > 0 ? (totalDem / twoPartyTotal) * 100 : 50;

  const wardsWonDem = predictions.filter((p) => p.predictedMargin > 0).length;
  const wardsWonRep = predictions.filter((p) => p.predictedMargin < 0).length;
  const wardsTied = predictions.length - wardsWonDem - wardsWonRep;

  // Compute baseline totals for shift comparison
  let baselineMargin: number | null = null;
  if (baseMapData) {
    const baseDem = Object.values(baseMapData.data).reduce((s, e) => s + e.demVotes, 0);
    const baseRep = Object.values(baseMapData.data).reduce((s, e) => s + e.repVotes, 0);
    const baseTotal = Object.values(baseMapData.data).reduce((s, e) => s + e.totalVotes, 0);
    if (baseTotal > 0) {
      baselineMargin = ((baseDem - baseRep) / baseTotal) * 100;
    }
  }

  const shift = baselineMargin != null ? margin - baselineMargin : null;
  const winner = margin > 0 ? 'DEM' : margin < 0 ? 'REP' : 'TIE';
  const winnerColorClass = margin > 0 ? 'text-dem' : 'text-rep';

  // Aggregations by geography
  const meta = wardMetadata ?? {};
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const countyRows = useMemo(() => aggregateByCounty(predictions, meta), [predictions, meta]);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const cdRows = useMemo(() => aggregateByCongressionalDistrict(predictions, meta), [predictions, meta]);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const sdRows = useMemo(() => aggregateBySenateDistrict(predictions, meta), [predictions, meta]);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const adRows = useMemo(() => aggregateByAssemblyDistrict(predictions, meta), [predictions, meta]);

  const hasAggregations = Object.keys(meta).length > 0;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">Projected Results</h3>

      {/* Winner + Margin */}
      <div
        className={`rounded-lg border border-border/30 p-3 shadow-sm ${margin > 0 ? 'bg-dem-bg' : 'bg-rep-bg'}`}
      >
        <div className="text-center">
          <div
            className={`text-3xl font-extrabold ${winnerColorClass}`}
          >
            {formatMargin(margin)}
          </div>
          <div className="text-xs text-muted-foreground">
            Projected {winner === 'TIE' ? 'Tie' : `${winner} Win`}
          </div>
        </div>

        {/* Two-party bar */}
        <div className="mt-2 flex h-3 overflow-hidden rounded-full" role="img" aria-label={`Two-party vote: Democrat ${demBarPct.toFixed(1)}%, Republican ${(100 - demBarPct).toFixed(1)}%`}>
          <div
            className="transition-all duration-150"
            style={{ width: `${demBarPct}%`, backgroundColor: 'var(--dem)' }}
          />
          <div
            className="transition-all duration-150"
            style={{ width: `${100 - demBarPct}%`, backgroundColor: 'var(--rep)' }}
          />
        </div>
        <div className="mt-1 flex justify-between text-xs text-muted-foreground">
          <span>{demBarPct.toFixed(1)}%</span>
          <span>{(100 - demBarPct).toFixed(1)}%</span>
        </div>
      </div>

      {/* Vote Totals */}
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-dem font-medium">DEM</span>
          <span>{formatNumber(totalDem)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-rep font-medium">REP</span>
          <span>{formatNumber(totalRep)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Total</span>
          <span>{formatNumber(totalVotes)}</span>
        </div>
      </div>

      {/* Shift from baseline */}
      {shift != null && (
        <div className="rounded-lg border border-border/30 bg-content2/50 p-2 text-center">
          <div className="text-xs text-muted-foreground">Shift from baseline</div>
          <div
            className={`text-sm font-semibold ${shift > 0 ? 'text-dem' : shift < 0 ? 'text-rep' : ''}`}
          >
            {shift > 0 ? '+' : ''}{shift.toFixed(1)} points
          </div>
        </div>
      )}

      {/* Wards won */}
      <div className="space-y-1 text-xs text-muted-foreground">
        <div className="flex justify-between">
          <span>Wards won (DEM)</span>
          <span className="font-medium text-dem">{formatNumber(wardsWonDem)}</span>
        </div>
        <div className="flex justify-between">
          <span>Wards won (REP)</span>
          <span className="font-medium text-rep">{formatNumber(wardsWonRep)}</span>
        </div>
        {wardsTied > 0 && (
          <div className="flex justify-between">
            <span>Tied</span>
            <span>{formatNumber(wardsTied)}</span>
          </div>
        )}
      </div>

      {/* County / District Aggregation Tabs */}
      {hasAggregations && (
        <>
          <Separator className="my-2" />
          <Tabs defaultValue="counties" className="w-full">
            <TabsList className="grid w-full grid-cols-4 h-8">
              <TabsTrigger value="counties" className="text-[10px] px-1">Counties</TabsTrigger>
              <TabsTrigger value="cd" className="text-[10px] px-1">Congress</TabsTrigger>
              <TabsTrigger value="sd" className="text-[10px] px-1">Senate</TabsTrigger>
              <TabsTrigger value="ad" className="text-[10px] px-1">Assembly</TabsTrigger>
            </TabsList>
            <TabsContent value="counties">
              <AggregationTable rows={countyRows} />
            </TabsContent>
            <TabsContent value="cd">
              <AggregationTable rows={cdRows} />
            </TabsContent>
            <TabsContent value="sd">
              <AggregationTable rows={sdRows} />
            </TabsContent>
            <TabsContent value="ad">
              <AggregationTable rows={adRows} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
});
