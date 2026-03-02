import { create } from 'zustand';
import { WISCONSIN_CENTER } from '@/shared/lib/mapConstants';
import type { RaceType } from '@/types/election';
import type { DisplayMetric } from '@/shared/lib/colorScale';

interface MapState {
  viewport: { center: [number, number]; zoom: number };
  selectedWardId: string | null;
  hoveredWardId: string | null;
  activeElection: { year: number; raceType: RaceType } | null;
  displayMetric: DisplayMetric;
  compareMode: boolean;
  compareElection: { year: number; raceType: RaceType } | null;
  is3DMode: boolean;

  setViewport: (viewport: { center: [number, number]; zoom: number }) => void;
  setSelectedWard: (wardId: string | null) => void;
  setHoveredWard: (wardId: string | null) => void;
  setActiveElection: (year: number, raceType: RaceType) => void;
  setDisplayMetric: (metric: DisplayMetric) => void;
  toggleCompareMode: () => void;
  setCompareElection: (year: number, raceType: RaceType) => void;
  toggle3DMode: () => void;
}

export const useMapStore = create<MapState>((set) => ({
  viewport: { center: WISCONSIN_CENTER, zoom: 7 },
  selectedWardId: null,
  hoveredWardId: null,
  activeElection: { year: 2024, raceType: 'president' },
  displayMetric: 'margin',
  compareMode: false,
  compareElection: null,
  is3DMode: false,

  setViewport: (viewport) => set({ viewport }),
  setSelectedWard: (wardId) => set({ selectedWardId: wardId }),
  setHoveredWard: (wardId) => set({ hoveredWardId: wardId }),
  setActiveElection: (year, raceType) =>
    set({ activeElection: { year, raceType } }),
  setDisplayMetric: (metric) => set({ displayMetric: metric }),
  toggleCompareMode: () =>
    set((state) => ({ compareMode: !state.compareMode })),
  setCompareElection: (year, raceType) =>
    set({ compareElection: { year, raceType } }),
  toggle3DMode: () =>
    set((state) => ({ is3DMode: !state.is3DMode })),
}));
