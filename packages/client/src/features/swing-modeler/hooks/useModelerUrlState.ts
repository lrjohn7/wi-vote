import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { useModelStore } from '@/stores/modelStore';
import type { RaceType } from '@/types/election';

const VALID_RACE_TYPES: RaceType[] = [
  'president', 'governor', 'us_senate', 'us_house',
  'state_senate', 'state_assembly', 'attorney_general',
  'secretary_of_state', 'treasurer',
];

export function useModelerUrlState() {
  const [searchParams, setSearchParams] = useSearchParams();
  const parameters = useModelStore((s) => s.parameters);
  const setParameter = useModelStore((s) => s.setParameter);
  const initialized = useRef(false);

  // Read URL params on mount -> initialize modelStore
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const year = searchParams.get('year');
    const race = searchParams.get('race');
    const swing = searchParams.get('swing');
    const turnout = searchParams.get('turnout');

    if (year) {
      setParameter('baseElectionYear', year);
    }
    if (race && VALID_RACE_TYPES.includes(race as RaceType)) {
      setParameter('baseRaceType', race);
    }
    if (swing != null && swing !== '') {
      const val = parseFloat(swing);
      if (!isNaN(val)) setParameter('swingPoints', val);
    }
    if (turnout != null && turnout !== '') {
      const val = parseFloat(turnout);
      if (!isNaN(val)) setParameter('turnoutChange', val);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Write store state to URL params
  useEffect(() => {
    if (!initialized.current) return;

    const params = new URLSearchParams();

    const year = parameters.baseElectionYear;
    const race = parameters.baseRaceType;
    const swing = parameters.swingPoints;
    const turnout = parameters.turnoutChange;

    if (year) params.set('year', String(year));
    if (race) params.set('race', String(race));
    if (typeof swing === 'number' && swing !== 0) {
      params.set('swing', String(swing));
    }
    if (typeof turnout === 'number' && turnout !== 0) {
      params.set('turnout', String(turnout));
    }

    setSearchParams(params, { replace: true });
  }, [parameters, setSearchParams]);
}
