import { EndpointConfig, Route } from './types';
import { HttpEndpoint } from './HttpEndpoint';

export const createEndpoint = <RouteConf extends Route<any>>(
  config: EndpointConfig<
    RouteConf['returned'],
    RouteConf['requestBody'],
    RouteConf['urlParams'],
    RouteConf['queryParams']
  >,
) => {
  return new HttpEndpoint(config, {
    tags: config.tags,
    summary: config.summary,
    response: config.response,
    paramsDescription: config.paramsDescription,
  });
};

// Provide an alias to shorten syntax
export const route = createEndpoint;
