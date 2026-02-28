import type { Prediction, UncertaintyBand } from '@/types/election';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`MRP API error ${res.status}: ${body || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ── Types ──

export interface MrpPredictionResponse {
  model_id: string;
  predictions: Record<string, {
    demPct: number;
    repPct: number;
    margin: number;
    demVotes: number;
    repVotes: number;
    totalVotes: number;
    confidence: number;
    lowerMargin: number;
    upperMargin: number;
  }>;
  metadata: {
    year: number;
    race_type: string;
    ward_vintage: number;
    ward_count: number;
    r_hat_max?: number;
    ess_min?: number;
    draws?: number;
    chains?: number;
  };
}

export interface FittedModel {
  race_type: string;
  year: number;
  ward_vintage: number;
  fitted_at: string | null;
  diagnostics: {
    r_hat_max?: number;
    ess_min?: number;
    draws?: number;
    chains?: number;
  };
  filename: string;
}

export interface FitStatus {
  task_id: string;
  status: 'PENDING' | 'STARTED' | 'PROGRESS' | 'SUCCESS' | 'FAILURE' | 'RETRY';
  result?: Record<string, unknown>;
  error?: string;
  progress?: {
    step: string;
    ward_count?: number;
  };
}

// ── API methods ──

export async function fetchMrpPrediction(params: {
  baseElectionYear: number;
  baseRaceType: string;
  turnoutChange?: number;
  collegeShift?: number;
  urbanShift?: number;
  ruralShift?: number;
  incomeShift?: number;
}): Promise<MrpPredictionResponse> {
  return request<MrpPredictionResponse>('/api/v1/models/predict', {
    method: 'POST',
    body: JSON.stringify({
      model_id: 'mrp',
      parameters: params,
    }),
  });
}

export async function fetchFittedModels(): Promise<FittedModel[]> {
  const data = await request<{ models: FittedModel[] }>('/api/v1/models/mrp/fitted');
  return data.models;
}

export async function triggerMrpFit(
  year: number,
  raceType: string,
  options?: { draws?: number; tune?: number },
): Promise<{ taskId: string }> {
  const data = await request<{ task_id: string }>('/api/v1/models/mrp/fit', {
    method: 'POST',
    body: JSON.stringify({
      year,
      race_type: raceType,
      draws: options?.draws ?? 2000,
      tune: options?.tune ?? 1000,
    }),
  });
  return { taskId: data.task_id };
}

export async function checkFitStatus(taskId: string): Promise<FitStatus> {
  return request<FitStatus>(`/api/v1/models/mrp/fit/${taskId}`);
}

/**
 * Convert server MRP response into client Prediction[] + UncertaintyBand[] format
 * for compatibility with existing map rendering code.
 */
export function mrpResponseToPredictions(
  response: MrpPredictionResponse,
): { predictions: Prediction[]; uncertainty: UncertaintyBand[] } {
  const predictions: Prediction[] = [];
  const uncertainty: UncertaintyBand[] = [];

  for (const [wardId, data] of Object.entries(response.predictions)) {
    predictions.push({
      wardId,
      predictedDemPct: data.demPct,
      predictedRepPct: data.repPct,
      predictedMargin: data.margin,
      predictedDemVotes: data.demVotes,
      predictedRepVotes: data.repVotes,
      predictedTotalVotes: data.totalVotes,
      confidence: data.confidence,
    });

    uncertainty.push({
      wardId,
      lowerDemPct: (data.lowerMargin + 100) / 2,
      upperDemPct: (data.upperMargin + 100) / 2,
      lowerMargin: data.lowerMargin,
      upperMargin: data.upperMargin,
    });
  }

  return { predictions, uncertainty };
}
