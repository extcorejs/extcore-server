import { ResponseConfig } from './types';

export class HandlerResponse<Returned> implements ResponseConfig {
  status: number;
  headers: Record<string, string>;
  body: Returned;

  constructor(response: ResponseConfig) {
    this.status = response.status || 200;
    this.headers = response.headers || {};
    this.body = response.body || null;
  }
}
