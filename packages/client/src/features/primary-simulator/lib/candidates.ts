import type { PrimaryCandidateProfile, PrimaryGlobalParams } from '@/types/primary';

/**
 * Default candidate profiles for the 2026 Wisconsin Democratic gubernatorial primary.
 *
 * Each profile includes polling baseline, geographic home base, ideology score,
 * demographic affinities, and endorsement strength. These values are the starting
 * defaults that users can adjust via the simulator UI.
 */
export const DEFAULT_CANDIDATES: PrimaryCandidateProfile[] = [
  {
    id: 'barnes',
    name: 'Mandela Barnes',
    shortName: 'Barnes',
    party: 'DEM',
    color: '#1e3a5f',
    pollingBaseline: 10,
    geographicBase: 'milwaukee_metro',
    geographicBaseCoords: [-87.9065, 43.0389],
    geographicRadius: 40,
    ideologyScore: 4,
    affinityBlack: 0.9,
    affinityHispanic: 0.5,
    affinityCollege: 0.5,
    affinityWorkingClass: 0.6,
    affinityUrban: 0.9,
    affinitySuburban: 0.3,
    affinityRural: 0.15,
    endorsementStrength: 0.4,
    isActive: true,
  },
  {
    id: 'crowley',
    name: 'David Crowley',
    shortName: 'Crowley',
    party: 'DEM',
    color: '#0d9488',
    pollingBaseline: 5,
    geographicBase: 'milwaukee_metro',
    geographicBaseCoords: [-87.9065, 43.0389],
    geographicRadius: 35,
    ideologyScore: 5,
    affinityBlack: 0.85,
    affinityHispanic: 0.45,
    affinityCollege: 0.45,
    affinityWorkingClass: 0.55,
    affinityUrban: 0.85,
    affinitySuburban: 0.35,
    affinityRural: 0.1,
    endorsementStrength: 0.5,
    isActive: true,
  },
  {
    id: 'rodriguez',
    name: 'Sara Rodriguez',
    shortName: 'Rodriguez',
    party: 'DEM',
    color: '#7c3aed',
    pollingBaseline: 6,
    geographicBase: 'milwaukee_metro',
    geographicBaseCoords: [-88.1065, 43.0600],
    geographicRadius: 45,
    ideologyScore: 6,
    affinityBlack: 0.3,
    affinityHispanic: 0.65,
    affinityCollege: 0.6,
    affinityWorkingClass: 0.4,
    affinityUrban: 0.4,
    affinitySuburban: 0.8,
    affinityRural: 0.25,
    endorsementStrength: 0.6,
    isActive: true,
  },
  {
    id: 'hong',
    name: 'Francesca Hong',
    shortName: 'Hong',
    party: 'DEM',
    color: '#16a34a',
    pollingBaseline: 11,
    geographicBase: 'madison_metro',
    geographicBaseCoords: [-89.4012, 43.0731],
    geographicRadius: 50,
    ideologyScore: 2,
    affinityBlack: 0.4,
    affinityHispanic: 0.45,
    affinityCollege: 0.85,
    affinityWorkingClass: 0.25,
    affinityUrban: 0.8,
    affinitySuburban: 0.45,
    affinityRural: 0.2,
    endorsementStrength: 0.3,
    isActive: true,
  },
  {
    id: 'roys',
    name: 'Kelda Roys',
    shortName: 'Roys',
    party: 'DEM',
    color: '#e11d48',
    pollingBaseline: 4,
    geographicBase: 'madison_metro',
    geographicBaseCoords: [-89.4012, 43.0731],
    geographicRadius: 55,
    ideologyScore: 3,
    affinityBlack: 0.3,
    affinityHispanic: 0.35,
    affinityCollege: 0.8,
    affinityWorkingClass: 0.3,
    affinityUrban: 0.7,
    affinitySuburban: 0.5,
    affinityRural: 0.4,
    endorsementStrength: 0.3,
    isActive: true,
  },
  {
    id: 'hughes',
    name: 'Missy Hughes',
    shortName: 'Hughes',
    party: 'DEM',
    color: '#d97706',
    pollingBaseline: 3,
    geographicBase: 'rural',
    geographicBaseCoords: [-90.8, 43.3],
    geographicRadius: 70,
    ideologyScore: 6,
    affinityBlack: 0.15,
    affinityHispanic: 0.2,
    affinityCollege: 0.45,
    affinityWorkingClass: 0.55,
    affinityUrban: 0.2,
    affinitySuburban: 0.5,
    affinityRural: 0.7,
    endorsementStrength: 0.2,
    isActive: true,
  },
  {
    id: 'brennan',
    name: 'Joel Brennan',
    shortName: 'Brennan',
    party: 'DEM',
    color: '#475569',
    pollingBaseline: 3,
    geographicBase: 'milwaukee_metro',
    geographicBaseCoords: [-87.9065, 43.0389],
    geographicRadius: 35,
    ideologyScore: 6,
    affinityBlack: 0.3,
    affinityHispanic: 0.3,
    affinityCollege: 0.5,
    affinityWorkingClass: 0.4,
    affinityUrban: 0.5,
    affinitySuburban: 0.5,
    affinityRural: 0.3,
    endorsementStrength: 0.2,
    isActive: true,
  },
  {
    id: 'mcguire',
    name: 'Tip McGuire',
    shortName: 'McGuire',
    party: 'DEM',
    color: '#ea580c',
    pollingBaseline: 2,
    geographicBase: 'milwaukee_metro',
    geographicBaseCoords: [-87.8212, 42.5847],
    geographicRadius: 40,
    ideologyScore: 5,
    affinityBlack: 0.25,
    affinityHispanic: 0.4,
    affinityCollege: 0.4,
    affinityWorkingClass: 0.5,
    affinityUrban: 0.35,
    affinitySuburban: 0.6,
    affinityRural: 0.3,
    endorsementStrength: 0.2,
    isActive: true,
  },
];

/**
 * Default global model parameters.
 *
 * These control how much weight each factor (geography, ideology, demographics,
 * endorsements) has in the softmax allocation, plus overall turnout and temperature.
 */
export const DEFAULT_GLOBAL_PARAMS: PrimaryGlobalParams = {
  turnoutRate: 22,
  temperature: 1.0,
  geoWeight: 1.0,
  ideologyWeight: 0.5,
  demographicWeight: 0.8,
  endorsementWeight: 0.3,
};

/**
 * Look up a candidate profile by ID from the default candidates list.
 *
 * @param id - Candidate identifier (e.g. 'barnes')
 * @returns The matching candidate profile, or undefined if not found
 */
export function getCandidateById(id: string): PrimaryCandidateProfile | undefined {
  return DEFAULT_CANDIDATES.find((c) => c.id === id);
}

/**
 * Get the hex color assigned to a candidate.
 *
 * @param id - Candidate identifier
 * @returns Hex color string, or '#94a3b8' (slate-400) if not found
 */
export function getCandidateColor(id: string): string {
  const candidate = DEFAULT_CANDIDATES.find((c) => c.id === id);
  return candidate?.color ?? '#94a3b8';
}
