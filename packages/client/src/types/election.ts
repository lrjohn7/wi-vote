export type RaceType =
  | 'president'
  | 'governor'
  | 'us_senate'
  | 'us_house'
  | 'state_senate'
  | 'state_assembly'
  | 'attorney_general'
  | 'secretary_of_state'
  | 'treasurer';

export interface ElectionResult {
  year: number;
  raceType: RaceType;
  demVotes: number;
  repVotes: number;
  otherVotes: number;
  totalVotes: number;
  demPct: number;
  repPct: number;
  margin: number; // positive = D, negative = R
  isEstimate: boolean; // true if from disaggregated reporting unit
}

export interface DemographicData {
  totalPopulation: number;
  votingAgePopulation: number;
  whitePct: number;
  blackPct: number;
  hispanicPct: number;
  asianPct: number;
  collegDegreePct: number;
  medianHouseholdIncome: number;
  urbanRuralClass: 'urban' | 'suburban' | 'rural';
  populationDensity: number;
}

export interface WardData {
  wardId: string;
  wardName: string;
  municipality: string;
  county: string;
  congressionalDistrict: string;
  stateSenateDistrict: string;
  assemblyDistrict: string;
  elections: ElectionResult[];
  demographics?: DemographicData;
}

export interface Prediction {
  wardId: string;
  predictedDemPct: number;
  predictedRepPct: number;
  predictedMargin: number;
  predictedDemVotes: number;
  predictedRepVotes: number;
  predictedTotalVotes: number;
  confidence?: number; // 0-1
}

export interface UncertaintyBand {
  wardId: string;
  lowerDemPct: number;
  upperDemPct: number;
  lowerMargin: number;
  upperMargin: number;
}
