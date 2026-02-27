import type { WardData, Prediction, UncertaintyBand } from '@/types/election';

export interface ModelParameter {
  id: string;
  label: string;
  type: 'slider' | 'select' | 'toggle' | 'number';
  min?: number;
  max?: number;
  step?: number;
  defaultValue: number | string | boolean;
  options?: { label: string; value: string }[];
  description?: string;
  group?: string;
}

export interface ElectionModel {
  id: string;
  name: string;
  description: string;
  version: string;
  parameters: ModelParameter[];
  predict(wardData: WardData[], params: Record<string, unknown>): Prediction[];
  getUncertainty?(wardData: WardData[], params: Record<string, unknown>): UncertaintyBand[];
  validate?(wardData: WardData[]): { valid: boolean; errors: string[] };
}
