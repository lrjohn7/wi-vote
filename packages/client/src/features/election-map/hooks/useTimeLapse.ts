import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/services/queryKeys';
import { useElections } from './useElections';
import { useMapStore } from '@/stores/mapStore';
import type { RaceType } from '@/types/election';

const SPEEDS = [2000, 1200, 600, 300] as const;
const DEFAULT_SPEED = 1200;

export function useTimeLapse() {
  const { data: electionsData } = useElections();
  const setActiveElection = useMapStore((s) => s.setActiveElection);
  const queryClient = useQueryClient();

  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(DEFAULT_SPEED);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [tlRaceType, setTlRaceType] = useState<RaceType>('president');

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sorted years available for the selected race type
  const years = useMemo(() => {
    if (!electionsData?.elections) return [];
    return [...new Set(
      electionsData.elections
        .filter((e) => e.race_type === tlRaceType)
        .map((e) => e.year),
    )].sort((a, b) => a - b);
  }, [electionsData, tlRaceType]);

  // Distinct race types available
  const raceTypes = useMemo(() => {
    if (!electionsData?.elections) return [];
    return [...new Set(electionsData.elections.map((e) => e.race_type))];
  }, [electionsData]);

  // Prefetch all election data for the selected race type into TanStack cache
  const prefetchAll = useCallback(() => {
    for (const year of years) {
      queryClient.prefetchQuery({
        queryKey: queryKeys.elections.mapData(year, tlRaceType),
        queryFn: async () => {
          const res = await fetch(`/api/v1/elections/map-data/${year}/${tlRaceType}`);
          if (!res.ok) throw new Error(`Failed: ${res.status}`);
          return res.json();
        },
        staleTime: 5 * 60 * 1000,
      });
    }
  }, [years, tlRaceType, queryClient]);

  const play = useCallback(() => {
    prefetchAll();
    // If at the end, restart from beginning
    setCurrentIdx((prev) => {
      if (prev >= years.length - 1) {
        if (years[0]) setActiveElection(years[0], tlRaceType);
        return 0;
      }
      return prev;
    });
    setIsPlaying(true);
  }, [prefetchAll, years, tlRaceType, setActiveElection]);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const stop = useCallback(() => {
    setIsPlaying(false);
    setCurrentIdx(0);
    if (years[0]) setActiveElection(years[0], tlRaceType);
  }, [years, tlRaceType, setActiveElection]);

  const jumpTo = useCallback(
    (idx: number) => {
      const clamped = Math.max(0, Math.min(idx, years.length - 1));
      setCurrentIdx(clamped);
      if (years[clamped]) setActiveElection(years[clamped], tlRaceType);
    },
    [years, tlRaceType, setActiveElection],
  );

  // Animation loop
  useEffect(() => {
    if (!isPlaying || years.length === 0) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }

    intervalRef.current = setInterval(() => {
      setCurrentIdx((prev) => {
        const next = prev + 1;
        if (next >= years.length) {
          setIsPlaying(false);
          return prev;
        }
        setActiveElection(years[next], tlRaceType);
        return next;
      });
    }, speed);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [isPlaying, speed, years, tlRaceType, setActiveElection]);

  // When race type changes, reset index and update map
  const changeRaceType = useCallback(
    (rt: RaceType) => {
      setIsPlaying(false);
      setCurrentIdx(0);
      setTlRaceType(rt);
    },
    [],
  );

  return {
    isPlaying,
    speed,
    setSpeed,
    currentIdx,
    years,
    tlRaceType,
    raceTypes,
    play,
    pause,
    stop,
    jumpTo,
    changeRaceType,
    currentYear: years[currentIdx] ?? null,
    isReady: years.length > 1,
    SPEEDS,
  };
}
