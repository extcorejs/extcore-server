import {
  EndpointConfig,
  HttpMethod,
  HttpRequest,
  RequestParams,
  RequestQuery,
  ResponseConfig,
  RouteHandlerFunction,
} from './types';
import { ExpressResponse } from '../server';
import { HandlerResponse } from './HandlerResponse';
import { isPromise } from '../utils';
import { ExpressHandlerFunction, ExpressMiddleware } from './router';
import { logger } from '../services';

interface DocProperties {
  tags?: string[];
  summary?: string;
  response?: string;
  paramsDescription?: Record<string, string>;
}

export class HttpEndpoint<
  Returned,
  ReqBody = any,
  URLParams extends RequestParams = RequestParams,
  QueryParams extends RequestQuery = RequestQuery,
> {
  private readonly path: string;
  private readonly method: HttpMethod;
  private readonly middlewares: ExpressMiddleware[];
  private readonly handler: RouteHandlerFunction<Returned, ReqBody, URLParams, QueryParams>;
  private readonly doc: DocProperties = {
    tags: [],
    summary: '',
    response: '',
    paramsDescription: {},
  };

  constructor(config: EndpointConfig<Returned, ReqBody, URLParams, QueryParams>, doc?: DocProperties) {
    this.path = config.path;
    this.method = config.method || 'get';
    this.middlewares = config.middlewares || [];
    this.handler = config.handler;
    this.doc = {
      ...this.doc,
      ...doc,
    };
  }

  public getPath(): string {
    return this.path;
  }

  public getMethod(): HttpMethod {
    return this.method;
  }

  public getMiddlewares(): ExpressMiddleware[] {
    return this.middlewares;
  }

  public getDoc(): DocProperties {
    return this.doc;
  }

  public getExpressHandler(): ExpressHandlerFunction<Returned> {
    const sendResponse = (response: ResponseConfig<Returned>) => new HandlerResponse<Returned>(response);

    const returnResponse = (res: ExpressResponse, returnedData: unknown) => {
      if (returnedData instanceof HandlerResponse) {
        res.status(returnedData.status);

        for (const headerName in returnedData.headers) {
          res.setHeader(headerName, returnedData.headers[headerName]);
        }

        res.json(returnedData.body);
      } else {
        res.status(200).json(returnedData);
      }
    };

    return (async (req: HttpRequest<ReqBody, URLParams, QueryParams>, res: ExpressResponse): Promise<void> => {
      const returned = this.handler(req, {
        sendResponse,
        logger,
      });

      if (isPromise(returned)) {
        const resolved = await returned;
        returnResponse(res, resolved);
      } else {
        returnResponse(res, returned);
      }
    }) as ExpressHandlerFunction;
  }
}
