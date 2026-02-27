import { create } from 'zustand';
import type { Prediction } from '@/types/election';

interface ModelState {
  activeModelId: string;
  parameters: Record<string, unknown>;
  predictions: Prediction[] | null;
  isComputing: boolean;

  setActiveModel: (modelId: string) => void;
  setParameter: (paramId: string, value: unknown) => void;
  setParameters: (params: Record<string, unknown>) => void;
  setPredictions: (predictions: Prediction[] | null) => void;
  setIsComputing: (computing: boolean) => void;
}

export const useModelStore = create<ModelState>((set) => ({
  activeModelId: 'uniform-swing',
  parameters: {},
  predictions: null,
  isComputing: false,

  setActiveModel: (modelId) => set({ activeModelId: modelId, parameters: {} }),
  setParameter: (paramId, value) =>
    set((state) => ({
      parameters: { ...state.parameters, [paramId]: value },
    })),
  setParameters: (params) => set({ parameters: params }),
  setPredictions: (predictions) => set({ predictions }),
  setIsComputing: (computing) => set({ isComputing: computing }),
}));
