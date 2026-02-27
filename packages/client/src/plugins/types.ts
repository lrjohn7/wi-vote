import type React from 'react';
import type { RaceType } from '@/types/election';

export interface RacePlugin {
  id: RaceType;
  label: string;
  shortLabel: string;
  description: string;
  availableYears: number[];
  color: string;
  icon?: string;
  aggregationLevel:
    | 'statewide'
    | 'congressional'
    | 'state_senate'
    | 'state_assembly';
  component: React.LazyExoticComponent<React.ComponentType>;
}
