import { modelRegistry } from './registry';
import { uniformSwingModel } from './uniform-swing';
import { proportionalSwingModel } from './proportional-swing';
import { demographicSwingModel } from './demographic-swing';

// Register built-in models
modelRegistry.register(uniformSwingModel);
modelRegistry.register(proportionalSwingModel);
modelRegistry.register(demographicSwingModel);

export { modelRegistry } from './registry';
export type { ElectionModel, ModelParameter } from './types';
