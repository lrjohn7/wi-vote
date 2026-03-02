import { Link } from 'react-router';
import { Users, GraduationCap, DollarSign, TrendingUp } from 'lucide-react';
import { useSimilarWards } from '@/shared/hooks/useSimilarWards';
import { getColorForMargin } from '@/shared/lib/colorScale';

interface SimilarWardsProps {
  wardId: string;
}

function SimilarWardSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border/50 p-3">
          <div className="h-4 w-3/4 rounded bg-muted" />
          <div className="mt-2 h-3 w-1/2 rounded bg-muted" />
          <div className="mt-2 h-2 w-full rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

export function SimilarWards({ wardId }: SimilarWardsProps) {
  const { data, isLoading, isError } = useSimilarWards(wardId);

  return (
    <div className="glass-panel rounded-lg p-4">
      <div className="mb-4 flex items-center gap-2">
        <Users className="h-5 w-5 text-muted-foreground" />
        <div>
          <h3 className="text-base font-semibold text-foreground">
            Similar Wards
          </h3>
          <p className="text-sm text-muted-foreground">
            Wards with the most similar demographics and voting patterns
          </p>
        </div>
      </div>

      {isLoading && <SimilarWardSkeleton />}

      {isError && (
        <p className="text-sm text-muted-foreground">
          Unable to load similar wards
        </p>
      )}

      {data && data.similar_wards.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No similar wards found
        </p>
      )}

      {data && data.similar_wards.length > 0 && (
        <div className="space-y-2">
          {data.similar_wards.map((ward) => {
            const similarityPct = Math.round(ward.similarity_score * 100);
            const leanColor = getColorForMargin(ward.partisan_lean);
            const leanLabel =
              ward.partisan_lean > 0
                ? `D+${ward.partisan_lean.toFixed(1)}`
                : ward.partisan_lean < 0
                  ? `R+${Math.abs(ward.partisan_lean).toFixed(1)}`
                  : 'Even';

            return (
              <Link
                key={ward.ward_id}
                to={`/wards/${ward.ward_id}/report`}
                className="block rounded-lg border border-border/50 p-3 transition-colors hover:border-border hover:bg-accent/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {ward.ward_name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {ward.municipality}, {ward.county} County
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-muted-foreground">
                    {similarityPct}% match
                  </span>
                </div>

                {/* Similarity bar */}
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${similarityPct}%` }}
                  />
                </div>

                {/* Key stats */}
                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  <span
                    className="flex items-center gap-1 font-medium"
                    style={{ color: leanColor }}
                  >
                    <TrendingUp className="h-3 w-3" />
                    {leanLabel}
                  </span>
                  <span className="flex items-center gap-1">
                    <GraduationCap className="h-3 w-3" />
                    {ward.college_pct}%
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    ${ward.median_income.toLocaleString()}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
