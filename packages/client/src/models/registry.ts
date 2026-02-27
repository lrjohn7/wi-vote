import type { ElectionModel } from './types';

class ModelRegistry {
  private models = new Map<string, ElectionModel>();

  register(model: ElectionModel): void {
    this.models.set(model.id, model);
  }

  get(id: string): ElectionModel | undefined {
    return this.models.get(id);
  }

  getAll(): ElectionModel[] {
    return Array.from(this.models.values());
  }
}

export const modelRegistry = new ModelRegistry();
