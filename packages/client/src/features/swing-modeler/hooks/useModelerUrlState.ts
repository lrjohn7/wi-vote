import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { useModelStore } from '@/stores/modelStore';
import { api } from '@/services/api';
import type { RaceType } from '@/types/election';

const VALID_RACE_TYPES: RaceType[] = [
  'president', 'governor', 'us_senate', 'us_house',
  'state_senate', 'state_assembly', 'attorney_general',
  'secretary_of_state', 'treasurer',
];

const REGIONAL_URL_MAP: { urlKey: string; paramKey: string }[] = [
  { urlKey: 'swing_mke', paramKey: 'swing_milwaukee_metro' },
  { urlKey: 'swing_msn', paramKey: 'swing_madison_metro' },
  { urlKey: 'swing_fox', paramKey: 'swing_fox_valley' },
  { urlKey: 'swing_rural', paramKey: 'swing_rural' },
];

const DEMOGRAPHIC_URL_MAP: { urlKey: string; paramKey: string }[] = [
  { urlKey: 'urban', paramKey: 'urbanSwing' },
  { urlKey: 'suburban', paramKey: 'suburbanSwing' },
  { urlKey: 'rural', paramKey: 'ruralSwing' },
];

const MRP_URL_MAP: { urlKey: string; paramKey: string }[] = [
  { urlKey: 'college', paramKey: 'collegeShift' },
  { urlKey: 'mrp_urban', paramKey: 'urbanShift' },
  { urlKey: 'mrp_rural', paramKey: 'ruralShift' },
  { urlKey: 'income', paramKey: 'incomeShift' },
];

export function useModelerUrlState() {
  const [searchParams, setSearchParams] = useSearchParams();
  const parameters = useModelStore((s) => s.parameters);
  const activeModelId = useModelStore((s) => s.activeModelId);
  const setParameter = useModelStore((s) => s.setParameter);
  const setParameters = useModelStore((s) => s.setParameters);
  const setActiveModel = useModelStore((s) => s.setActiveModel);
  const initialized = useRef(false);
  const scenarioLoaded = useRef(false);

  // Read URL params on mount -> initialize stores
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // If a scenario ID is in the URL, load it from the API
    const scenarioId = searchParams.get('scenario');
    if (scenarioId) {
      api
        .loadScenario(scenarioId)
        .then((scenario) => {
          setActiveModel(scenario.model_id);
          setParameters(scenario.parameters as Record<string, unknown>);
          scenarioLoaded.current = true;
        })
        .catch(() => {
          // Scenario not found — fall through to default state
        });
      return;
    }

    const year = searchParams.get('year');
    const race = searchParams.get('race');
    const swing = searchParams.get('swing');
    const turnout = searchParams.get('turnout');
    const model = searchParams.get('model');

    if (model && (model === 'uniform-swing' || model === 'proportional-swing' || model === 'demographic-swing' || model === 'mrp')) {
      setActiveModel(model);
    }

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

    for (const { urlKey, paramKey } of REGIONAL_URL_MAP) {
      const raw = searchParams.get(urlKey);
      if (raw != null && raw !== '') {
        const val = parseFloat(raw);
        if (!isNaN(val)) setParameter(paramKey, val);
      }
    }

    for (const { urlKey, paramKey } of DEMOGRAPHIC_URL_MAP) {
      const raw = searchParams.get(urlKey);
      if (raw != null && raw !== '') {
        const val = parseFloat(raw);
        if (!isNaN(val)) setParameter(paramKey, val);
      }
    }

    for (const { urlKey, paramKey } of MRP_URL_MAP) {
      const raw = searchParams.get(urlKey);
      if (raw != null && raw !== '') {
        const val = parseFloat(raw);
        if (!isNaN(val)) setParameter(paramKey, val);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Write store state to URL params
  useEffect(() => {
    if (!initialized.current) return;

    const params = new URLSearchParams();

    if (activeModelId && activeModelId !== 'uniform-swing') {
      params.set('model', activeModelId);
    }

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

    for (const { urlKey, paramKey } of REGIONAL_URL_MAP) {
      const val = parameters[paramKey];
      if (typeof val === 'number' && val !== 0) {
        params.set(urlKey, String(val));
      }
    }

    for (const { urlKey, paramKey } of DEMOGRAPHIC_URL_MAP) {
      const val = parameters[paramKey];
      if (typeof val === 'number' && val !== 0) {
        params.set(urlKey, String(val));
      }
    }

    for (const { urlKey, paramKey } of MRP_URL_MAP) {
      const val = parameters[paramKey];
      if (typeof val === 'number' && val !== 0) {
        params.set(urlKey, String(val));
      }
    }

    setSearchParams(params, { replace: true });
  }, [parameters, activeModelId, setSearchParams]);
}
