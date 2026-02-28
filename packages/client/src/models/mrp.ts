import type { ElectionModel, ModelParameter } from './types';
import type { WardData, Prediction } from '@/types/election';

/**
 * MRP (Multilevel Regression with Poststratification) model definition.
 *
 * This model runs server-side via the FastAPI backend. The `predict()` method
 * here is a stub — actual computation happens via fetchMrpPrediction() in the
 * SwingModeler component. The model definition provides parameter metadata
 * for the UI controls.
 */

const mrpParameters: ModelParameter[] = [
  {
    id: 'baseElectionYear',
    label: 'Base Election',
    type: 'select',
    defaultValue: '2024',
    options: [],
    description: 'Election to use as the baseline for projections',
  },
  {
    id: 'baseRaceType',
    label: 'Base Race',
    type: 'select',
    defaultValue: 'president',
    options: [
      { label: 'President', value: 'president' },
      { label: 'Governor', value: 'governor' },
      { label: 'US Senate', value: 'us_senate' },
      { label: 'State Senate', value: 'state_senate' },
      { label: 'State Assembly', value: 'state_assembly' },
    ],
  },
  {
    id: 'turnoutChange',
    label: 'Turnout Change (%)',
    type: 'slider',
    min: -30,
    max: 30,
    step: 1,
    defaultValue: 0,
    description: 'Uniform percentage change in turnout across all wards',
    group: 'adjustments',
  },
  {
    id: 'collegeShift',
    label: 'College-Educated Shift',
    type: 'slider',
    min: -10,
    max: 10,
    step: 0.5,
    defaultValue: 0,
    description: 'Shift in vote margin among college-educated areas (D+)',
    group: 'demographic',
  },
  {
    id: 'urbanShift',
    label: 'Urban Shift',
    type: 'slider',
    min: -10,
    max: 10,
    step: 0.5,
    defaultValue: 0,
    description: 'Shift in vote margin in urban areas (>3,000/sq mi)',
    group: 'demographic',
  },
  {
    id: 'ruralShift',
    label: 'Rural Shift',
    type: 'slider',
    min: -10,
    max: 10,
    step: 0.5,
    defaultValue: 0,
    description: 'Shift in vote margin in rural areas (<500/sq mi)',
    group: 'demographic',
  },
  {
    id: 'incomeShift',
    label: 'Income Effect Shift',
    type: 'slider',
    min: -10,
    max: 10,
    step: 0.5,
    defaultValue: 0,
    description: 'Shift in income coefficient effect on vote share',
    group: 'demographic',
  },
];

export const mrpModel: ElectionModel = {
  id: 'mrp',
  name: 'MRP (Bayesian)',
  description:
    'Multilevel regression with poststratification. Uses demographics and geographic random effects for ward-level predictions with Bayesian credible intervals.',
  version: '1.0.0',
  parameters: mrpParameters,

  // Stub — MRP prediction happens server-side
  predict(_wardData: WardData[], _params: Record<string, unknown>): Prediction[] {
    return [];
  },
};
