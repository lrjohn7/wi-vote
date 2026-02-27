import { modelRegistry } from './registry';
import { uniformSwingModel } from './uniform-swing';

// Register built-in models
modelRegistry.register(uniformSwingModel);

export { modelRegistry } from './registry';
export type { ElectionModel, ModelParameter } from './types';
