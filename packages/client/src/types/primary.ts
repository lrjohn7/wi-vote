/**
 * TypeScript types for the Wisconsin Primary Simulator feature.
 *
 * This is the shared contract that all primary simulator code imports from.
 * Covers candidate profiles, global model parameters, ward-level data,
 * prediction outputs, Monte Carlo results, worker protocol, poll presets,
 * and map display modes.
 */

// -- Candidate Profile -----------------------------------------------------------

/** A candidate's adjustable profile with polling, geography, ideology, and demographic affinities. */
export interface PrimaryCandidateProfile {
  /** Unique identifier, e.g. 'barnes', 'hong' */
  id: string;
  /** Full display name */
  name: string;
  /** Short label for compact UI */
  shortName: string;
  /** Party affiliation */
  party: 'DEM' | 'REP';
  /** Hex color for map/charts */
  color: string;

  // Core adjustable parameters
  /** Statewide poll percentage (0-100) */
  pollingBaseline: number;

  // Geographic base
  /** Region ID from regionMapping */
  geographicBase: string;
  /** [lng, lat] coordinates of the candidate's home base */
  geographicBaseCoords: [number, number];
  /** Radius in km over which home-turf advantage extends */
  geographicRadius: number;

  /** Ideology score: 1 = very progressive, 10 = very moderate */
  ideologyScore: number;

  // Demographic affinities (0.0 to 1.0 scale)
  /** Affinity with Black voters */
  affinityBlack: number;
  /** Affinity with Hispanic voters */
  affinityHispanic: number;
  /** Affinity with college-educated voters */
  affinityCollege: number;
  /** Affinity with working-class (non-college) voters */
  affinityWorkingClass: number;
  /** Affinity with urban voters */
  affinityUrban: number;
  /** Affinity with suburban voters */
  affinitySuburban: number;
  /** Affinity with rural voters */
  affinityRural: number;

  /** Endorsement / organizational strength (0.0 to 1.0) */
  endorsementStrength: number;

  /** Whether the candidate is still active; false = dropped out, excluded from softmax */
  isActive: boolean;
}

// -- Global Model Parameters -----------------------------------------------------

/** Global parameters that apply to the entire primary model, not per-candidate. */
export interface PrimaryGlobalParams {
  /** Expected primary turnout as % of voting-age population (default ~22) */
  turnoutRate: number;
  /** Softmax temperature (default 1.0; higher = more even spread across candidates) */
  temperature: number;
  /** Weight for geographic proximity factor (default 1.0) */
  geoWeight: number;
  /** Weight for ideological matching factor (default 0.5) */
  ideologyWeight: number;
  /** Weight for demographic affinity factor (default 0.8) */
  demographicWeight: number;
  /** Weight for endorsement strength factor (default 0.3) */
  endorsementWeight: number;
}

// -- Ward-Level Input Data -------------------------------------------------------

/** Demographic and geographic data for one reporting unit (ward) used as model input. */
export interface PrimaryWardData {
  /** Reporting unit / ward ID */
  ruId: string;
  /** Human-readable reporting unit name */
  ruName: string;
  /** County name */
  county: string;
  /** Centroid longitude */
  centroidLng: number;
  /** Centroid latitude */
  centroidLat: number;

  // Demographics (from bulk demographics endpoint)
  /** Percentage of Black residents */
  blackPct: number;
  /** Percentage of Hispanic residents */
  hispanicPct: number;
  /** Percentage of residents with a college degree */
  collegePct: number;
  /** Median household income in dollars */
  medianIncome: number;
  /** Population density (people per sq mile) */
  populationDensity: number;
  /** Urban/rural classification */
  urbanRuralClass: 'urban' | 'suburban' | 'rural';
  /** Voting-age population count */
  votingAgePopulation: number;

  // From general election data (proxy for primary propensity)
  /** Average D-R margin across recent elections; positive = D-leaning */
  partisanLean: number;
}

// -- Prediction Outputs ----------------------------------------------------------

/** Model output for a single reporting unit. */
export interface PrimaryRuPrediction {
  /** Reporting unit ID */
  ruId: string;
  /** Projected total votes cast in this ward */
  totalVotes: number;
  /** Per-candidate vote breakdowns */
  candidates: PrimaryCandidateVote[];
  /** ID of the candidate projected to win this ward */
  winnerId: string;
  /** Winner's percentage-point lead over the second-place candidate */
  winnerMargin: number;
}

/** A single candidate's projected result within a reporting unit. */
export interface PrimaryCandidateVote {
  /** Candidate ID */
  candidateId: string;
  /** Vote share as a fraction (0-1) */
  voteShare: number;
  /** Absolute projected vote count */
  votes: number;
}

// -- Monte Carlo Results ---------------------------------------------------------

/** Aggregated Monte Carlo simulation output for one candidate. */
export interface PrimaryMonteCarloResult {
  /** Candidate ID */
  candidateId: string;
  /** Fraction of simulations in which this candidate won (0-1) */
  winProbability: number;
  /** Median statewide vote share across simulations */
  medianVoteShare: number;
  /** 10th percentile statewide vote share */
  p10VoteShare: number;
  /** 90th percentile statewide vote share */
  p90VoteShare: number;
  /** Median absolute vote count across simulations */
  medianVotes: number;
}

// -- Web Worker Protocol ---------------------------------------------------------

/** Message sent from the main thread to the primary simulator Web Worker. */
export interface PrimaryWorkerRequest {
  /** Operation type */
  type: 'predict' | 'monteCarlo';
  /** Array of all candidate profiles (active and inactive) */
  candidates: PrimaryCandidateProfile[];
  /** Ward-level demographic/geographic data for every reporting unit */
  wardData: PrimaryWardData[];
  /** Global model parameters */
  globalParams: PrimaryGlobalParams;
  /** Number of Monte Carlo iterations; defaults to 5000 if omitted */
  monteCarloIterations?: number;
}

/** Message sent from the Web Worker back to the main thread. */
export interface PrimaryWorkerResponse {
  /** Matches the request type */
  type: 'predictions' | 'monteCarlo';
  /** Per-ward predictions (present when type === 'predictions') */
  predictions?: PrimaryRuPrediction[];
  /** Monte Carlo summary (present when type === 'monteCarlo') */
  monteCarlo?: PrimaryMonteCarloResult[];
  /** Statewide aggregate vote totals across all wards */
  statewideTotals?: PrimaryCandidateVote[];
  /** Wall-clock computation time in milliseconds */
  computeTimeMs: number;
}

// -- Poll Presets ----------------------------------------------------------------

/** A snapshot of a real or hypothetical poll, used to set candidate polling baselines. */
export interface PollPreset {
  /** Unique identifier */
  id: string;
  /** Human-readable label */
  name: string;
  /** Polling organization */
  source: string;
  /** Date of the poll (ISO format, or empty string for hypothetical) */
  date: string;
  /** Map of candidateId to poll percentage */
  candidates: Record<string, number>;
  /** Percentage of respondents who were undecided */
  undecided: number;
}

// -- Map Display Modes -----------------------------------------------------------

/** How the primary results are visualized on the map. */
export type PrimaryMapMode =
  /** Color each ward by the projected winner's color, opacity by margin */
  | 'winner'
  /** Show a single candidate's vote share as a light-to-dark heatmap */
  | 'candidate-heatmap';
