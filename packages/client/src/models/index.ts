import { modelRegistry } from './registry';
import { uniformSwingModel } from './uniform-swing';
import { proportionalSwingModel } from './proportional-swing';
import { demographicSwingModel } from './demographic-swing';
import { mrpModel } from './mrp';

// Register built-in models
modelRegistry.register(uniformSwingModel);
modelRegistry.register(proportionalSwingModel);
modelRegistry.register(demographicSwingModel);
modelRegistry.register(mrpModel);

export { modelRegistry } from './registry';
export type { ElectionModel, ModelParameter } from './types';
