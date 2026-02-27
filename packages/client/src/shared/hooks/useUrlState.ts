import { useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { useMapStore } from '@/stores/mapStore';
import type { RaceType } from '@/types/election';

const VALID_RACE_TYPES: RaceType[] = [
  'president', 'governor', 'us_senate', 'us_house',
  'state_senate', 'state_assembly', 'attorney_general',
  'secretary_of_state', 'treasurer',
];

export function useUrlState() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeElection = useMapStore((s) => s.activeElection);
  const selectedWardId = useMapStore((s) => s.selectedWardId);
  const displayMetric = useMapStore((s) => s.displayMetric);
  const setActiveElection = useMapStore((s) => s.setActiveElection);
  const setSelectedWard = useMapStore((s) => s.setSelectedWard);
  const setDisplayMetric = useMapStore((s) => s.setDisplayMetric);

  // Read URL params on mount
  useEffect(() => {
    const year = searchParams.get('year');
    const race = searchParams.get('race');
    const ward = searchParams.get('ward');
    const metric = searchParams.get('metric');

    if (year && race && VALID_RACE_TYPES.includes(race as RaceType)) {
      setActiveElection(Number(year), race as RaceType);
    }
    if (ward) {
      setSelectedWard(ward);
    }
    if (metric && ['margin', 'demPct', 'repPct', 'turnout', 'totalVotes'].includes(metric)) {
      setDisplayMetric(metric as typeof displayMetric);
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Write store state to URL params
  useEffect(() => {
    const params = new URLSearchParams();

    if (activeElection) {
      params.set('year', String(activeElection.year));
      params.set('race', activeElection.raceType);
    }
    if (selectedWardId) {
      params.set('ward', selectedWardId);
    }
    if (displayMetric !== 'margin') {
      params.set('metric', displayMetric);
    }

    setSearchParams(params, { replace: true });
  }, [activeElection, selectedWardId, displayMetric, setSearchParams]);
}
