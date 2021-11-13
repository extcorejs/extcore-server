import { Router, NextFunction, Response as ExpressResponse, RequestHandler } from 'express';
import { HttpRequest, RequestParams, RequestQuery } from './types';

export type ExpressHandlerFunction<
  ReqBody = any,
  URLParams extends RequestParams = RequestParams,
  ReqQuery extends RequestQuery = RequestQuery,
> = (req: HttpRequest<ReqBody, URLParams, ReqQuery>, res: ExpressResponse, next?: NextFunction) => Promise<void> | void;

export type RouteConfig = ControllerRouteConfig | RouteGroupConfig;

interface ControllerRouteConfig {
  path: string;
  method?: 'get' | 'post' | 'put' | 'patch' | 'options' | 'delete' | 'head';
  controller: ExpressHandlerFunction;
  middlewares?: ExpressHandlerFunction[];
  children?: RouteConfig[];
}

interface RouteGroupConfig {
  path: string;
  middlewares?: ExpressHandlerFunction[];
  children: RouteConfig[];
}

export const createRouter = (routes: RouteConfig[]): Router => {
  const router = Router({ mergeParams: true });

  for (const routeConfig of routes) {
    registerRoute(router, routeConfig);
  }

  return router;
};

const registerRoute = (router: Router, routeConfig: RouteConfig) => {
  const middlewares = (routeConfig.middlewares || []) as RequestHandler[];

  if ('controller' in routeConfig && routeConfig.controller) {
    const method = routeConfig.method ? routeConfig.method : 'get';
    const handlers = [...middlewares, handleRequest(routeConfig.controller)] as RequestHandler[];

    router[method](routeConfig.path, handlers);
  }

  if (Array.isArray(routeConfig.children) && routeConfig.children.length > 0) {
    router.use(routeConfig.path, middlewares, createRouter(routeConfig.children));
  }
};

const handleRequest = (handler: ExpressHandlerFunction) => {
  return async (req: HttpRequest, res: ExpressResponse, next: NextFunction) => {
    try {
      await handler(req, res);
    } catch (e) {
      next(e);
    }
  };
};
