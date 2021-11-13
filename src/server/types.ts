import * as express from 'express';

export type ExpressInstance = express.Express;
export type ExpressRequest = express.Request;
export type ExpressResponse = express.Response;
export type ExpressNextFunction = express.NextFunction;

export interface HttpServer {
  getInstance: () => ExpressInstance;
  setLogger: (options: LoggerOptions | (() => LoggerOptions)) => void;
  start: (callback?: () => void) => void;
}

export interface ServerConfig {
  port?: number;
  router?: express.Router;
  rootPath: string;
  handlersPath: string;
  swaggerDoc?: Record<string, unknown>;
  hooks?: HooksBuilderFunction;
}

export interface LoggerOptions {
  level: string;
  pm2?: boolean;
}

export type HooksBuilderFunction = (hooks: HookBuilder) => void;
export type HookCallback = (app: ExpressInstance) => void;
export type HookLifeCycle = 'beforeMiddlewares' | 'beforeRoutes' | 'afterRoutes' | 'afterErrorMiddlewares';

export interface HookBuilder {
  beforeMiddlewares: (hook: HookCallback) => void;
  beforeRoutes: (hook: HookCallback) => void;
  afterRoutes: (hook: HookCallback) => void;
  afterErrorMiddlewares: (hook: HookCallback) => void;
}
