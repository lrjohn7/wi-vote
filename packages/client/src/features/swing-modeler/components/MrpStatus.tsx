import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useModelStore } from '@/stores/modelStore';
import {
  fetchFittedModels,
  triggerMrpFit,
  checkFitStatus,
  type FittedModel,
  type FitStatus,
} from '@/services/mrpApi';
import { RACE_LABELS } from '@/shared/lib/raceLabels';

function formatDate(iso: string | null): string {
  if (!iso) return 'Unknown';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'Unknown';
  }
}

export function MrpStatus() {
  const parameters = useModelStore((s) => s.parameters);
  const baseYear = Number(parameters.baseElectionYear) || 2024;
  const baseRace = String(parameters.baseRaceType || 'president');

  const [fittedModels, setFittedModels] = useState<FittedModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [fittingTaskId, setFittingTaskId] = useState<string | null>(null);
  const [fitStatus, setFitStatus] = useState<FitStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch fitted models on mount
  useEffect(() => {
    setLoading(true);
    fetchFittedModels()
      .then(setFittedModels)
      .catch((err) => {
        console.error('Failed to fetch fitted models:', err);
        setError('Failed to load fitted models');
      })
      .finally(() => setLoading(false));
  }, []);

  // Check if current base election has a fitted model
  const currentFitted = fittedModels.find(
    (m) => m.year === baseYear && m.race_type === baseRace,
  );

  // Poll fit status when fitting is in progress
  useEffect(() => {
    if (!fittingTaskId) return;

    const interval = setInterval(async () => {
      try {
        const status = await checkFitStatus(fittingTaskId);
        setFitStatus(status);

        if (status.status === 'SUCCESS' || status.status === 'FAILURE') {
          clearInterval(interval);
          setFittingTaskId(null);

          if (status.status === 'SUCCESS') {
            // Refresh fitted models list
            const models = await fetchFittedModels();
            setFittedModels(models);
          }
        }
      } catch (err) {
        console.error('Failed to check fit status:', err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [fittingTaskId]);

  const handleFit = useCallback(async () => {
    setError(null);
    try {
      const { taskId } = await triggerMrpFit(baseYear, baseRace);
      setFittingTaskId(taskId);
      setFitStatus({ task_id: taskId, status: 'PENDING' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start fitting');
    }
  }, [baseYear, baseRace]);

  if (loading) {
    return (
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground">MRP Model Status</h4>
        <div className="h-8 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-muted-foreground">MRP Model Status</h4>

      {currentFitted ? (
        <div className="rounded border border-green-200 bg-green-50 p-2 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
            <span className="font-medium text-green-800">Model Available</span>
          </div>
          <div className="mt-1 space-y-0.5 text-green-700">
            <div>
              {RACE_LABELS[currentFitted.race_type] ?? currentFitted.race_type}{' '}
              {currentFitted.year}
            </div>
            <div>Fitted: {formatDate(currentFitted.fitted_at)}</div>
            {currentFitted.diagnostics.r_hat_max != null && (
              <div className="flex gap-3">
                <span>
                  R-hat: {currentFitted.diagnostics.r_hat_max.toFixed(3)}
                  {currentFitted.diagnostics.r_hat_max <= 1.05 ? ' (good)' : ' (warning)'}
                </span>
                {currentFitted.diagnostics.ess_min != null && (
                  <span>ESS: {Math.round(currentFitted.diagnostics.ess_min)}</span>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded border border-amber-200 bg-amber-50 p-2 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
            <span className="font-medium text-amber-800">No Model</span>
          </div>
          <p className="mt-1 text-amber-700">
            No fitted MRP model for {RACE_LABELS[baseRace] ?? baseRace} {baseYear}.
          </p>
          {!fittingTaskId && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2 h-7 text-xs"
              onClick={handleFit}
            >
              Fit Model
            </Button>
          )}
        </div>
      )}

      {/* Fitting progress */}
      {fittingTaskId && fitStatus && (
        <div className="rounded border border-blue-200 bg-blue-50 p-2 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-500" />
            <span className="font-medium text-blue-800">
              {fitStatus.status === 'PENDING' && 'Queued...'}
              {fitStatus.status === 'STARTED' && 'Starting...'}
              {fitStatus.status === 'PROGRESS' && (
                <>
                  {fitStatus.progress?.step === 'loading_data' && 'Loading data...'}
                  {fitStatus.progress?.step === 'fitting' &&
                    `Fitting (${fitStatus.progress?.ward_count ?? '?'} wards)...`}
                  {fitStatus.progress?.step === 'saving' && 'Saving model...'}
                </>
              )}
              {fitStatus.status === 'SUCCESS' && 'Complete!'}
              {fitStatus.status === 'FAILURE' && 'Failed'}
            </span>
          </div>
          {fitStatus.status === 'FAILURE' && fitStatus.error && (
            <p className="mt-1 text-red-600">{fitStatus.error}</p>
          )}
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}

      {/* Fitted models list */}
      {fittedModels.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            {fittedModels.length} fitted model{fittedModels.length !== 1 ? 's' : ''} available
          </summary>
          <ul className="mt-1 space-y-0.5 text-muted-foreground">
            {fittedModels.map((m) => (
              <li key={`${m.race_type}_${m.year}`} className="flex justify-between">
                <span>
                  {RACE_LABELS[m.race_type] ?? m.race_type} {m.year}
                </span>
                <span>{formatDate(m.fitted_at)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
