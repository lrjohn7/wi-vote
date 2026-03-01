import { describe, it, expect, beforeEach } from 'vitest';
import { useMapStore } from './mapStore';

describe('mapStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useMapStore.setState({
      selectedWardId: null,
      hoveredWardId: null,
      activeElection: { year: 2024, raceType: 'president' },
      displayMetric: 'margin',
      compareMode: false,
      compareElection: null,
    });
  });

  it('has correct initial state', () => {
    const state = useMapStore.getState();
    expect(state.selectedWardId).toBeNull();
    expect(state.hoveredWardId).toBeNull();
    expect(state.displayMetric).toBe('margin');
    expect(state.compareMode).toBe(false);
    expect(state.activeElection).toEqual({ year: 2024, raceType: 'president' });
  });

  it('setSelectedWard updates selectedWardId', () => {
    useMapStore.getState().setSelectedWard('MIL-W-123');
    expect(useMapStore.getState().selectedWardId).toBe('MIL-W-123');
  });

  it('setSelectedWard can clear selection', () => {
    useMapStore.getState().setSelectedWard('MIL-W-123');
    useMapStore.getState().setSelectedWard(null);
    expect(useMapStore.getState().selectedWardId).toBeNull();
  });

  it('setHoveredWard updates hoveredWardId', () => {
    useMapStore.getState().setHoveredWard('DAN-W-5');
    expect(useMapStore.getState().hoveredWardId).toBe('DAN-W-5');
  });

  it('setActiveElection updates year and raceType', () => {
    useMapStore.getState().setActiveElection(2020, 'governor');
    expect(useMapStore.getState().activeElection).toEqual({
      year: 2020,
      raceType: 'governor',
    });
  });

  it('setDisplayMetric updates metric', () => {
    useMapStore.getState().setDisplayMetric('demPct');
    expect(useMapStore.getState().displayMetric).toBe('demPct');

    useMapStore.getState().setDisplayMetric('totalVotes');
    expect(useMapStore.getState().displayMetric).toBe('totalVotes');
  });

  it('toggleCompareMode flips the boolean', () => {
    expect(useMapStore.getState().compareMode).toBe(false);
    useMapStore.getState().toggleCompareMode();
    expect(useMapStore.getState().compareMode).toBe(true);
    useMapStore.getState().toggleCompareMode();
    expect(useMapStore.getState().compareMode).toBe(false);
  });

  it('setCompareElection updates comparison election', () => {
    useMapStore.getState().setCompareElection(2016, 'president');
    expect(useMapStore.getState().compareElection).toEqual({
      year: 2016,
      raceType: 'president',
    });
  });

  it('setViewport updates viewport', () => {
    useMapStore.getState().setViewport({ center: [-89.5, 44.0], zoom: 10 });
    expect(useMapStore.getState().viewport).toEqual({
      center: [-89.5, 44.0],
      zoom: 10,
    });
  });
});
