import { ExpressInstance, HookBuilder, HookCallback, HookLifeCycle } from './types';
import { logger } from '../services';

const hooksByLifeCycle: Record<HookLifeCycle, HookCallback[]> = {
  beforeMiddlewares: [],
  beforeRoutes: [],
  afterRoutes: [],
  afterErrorMiddlewares: [],
};

const registerHook = (lifecycle: HookLifeCycle, callback: HookCallback): void => {
  hooksByLifeCycle[lifecycle] = [...hooksByLifeCycle[lifecycle], callback];
};

export const triggerHooks = (lifecycle: HookLifeCycle, app: ExpressInstance): void => {
  for (const hook of hooksByLifeCycle[lifecycle]) {
    try {
      hook(app);
    } catch (e) {
      logger.error(`Exception thrown when running hooks on lifecycle: ${lifecycle}`);
    }
  }
};

export const hookAPI: HookBuilder = {
  beforeMiddlewares: (cb) => registerHook('beforeMiddlewares', cb),
  beforeRoutes: (cb) => registerHook('beforeRoutes', cb),
  afterRoutes: (cb) => registerHook('afterRoutes', cb),
  afterErrorMiddlewares: (cb) => registerHook('afterErrorMiddlewares', cb),
};
