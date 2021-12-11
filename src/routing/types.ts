import { Request as ExpressRequest } from 'express';
import * as core from 'express-serve-static-core';
import { HandlerResponse } from './HandlerResponse';
import { Logger } from '../services';
import { ExpressMiddleware } from './router';
import { YupValidationSchema } from '../types/validation';

export type HttpMethod = 'get' | 'post' | 'delete' | 'put' | 'patch' | 'options';
export type RequestQuery = core.Query;
export type RequestParams = core.ParamsDictionary;

export interface HttpRequest<
  ReqBody = any,
  URLParams extends RequestParams = RequestParams,
  ReqQuery extends RequestQuery = RequestQuery,
> extends ExpressRequest<URLParams, any, ReqBody, ReqQuery> {
  requestId: string;
  body: ReqBody;
}

export interface Route<
  Returned,
  ReqBody = any,
  URLParams extends RequestParams = RequestParams,
  QueryParams extends RequestQuery = RequestQuery,
> {
  returned: Returned;
  requestBody: ReqBody;
  urlParams: URLParams;
  queryParams: QueryParams;
}

export type HandlerReturnValue<Returned> =
  | Returned
  | Promise<Returned>
  | HandlerResponse<Returned>
  | Promise<HandlerResponse<Returned>>;

export interface RouteHandlerContext<Returned> {
  sendResponse: SendResponseFunction<Returned>;
  logger: Logger;
}

export type RouteHandlerFunction<
  Returned,
  ReqBody = any,
  URLParams extends RequestParams = RequestParams,
  ReqQuery extends RequestQuery = RequestQuery,
> = (
  req: HttpRequest<ReqBody, URLParams, ReqQuery>,
  ctx: RouteHandlerContext<Returned>,
) => HandlerReturnValue<Returned>;

export interface ResponseConfig<Body = any> {
  status?: number;
  headers?: Record<string, string>;
  body: Body;
}

export type SendResponseFunction<Returned> = (response: ResponseConfig<Returned>) => HandlerResponse<Returned>;

export interface EndpointConfig<
  Returned,
  ReqBody = any,
  URLParams extends RequestParams = RequestParams,
  ReqQuery extends RequestQuery = RequestQuery,
> {
  path: string;
  method?: HttpMethod;
  middlewares?: ExpressMiddleware[];
  handler: RouteHandlerFunction<Returned, ReqBody, URLParams, ReqQuery>;
  tags?: string[];
  summary?: string;
  response?: string;
  paramsDescription?: Record<string, string>;
  validationSchema?: YupValidationSchema;
}
