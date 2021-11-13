import { HttpClientError } from './ClientError';

export class UnauthorizedError extends HttpClientError {
  readonly statusCode = 401;

  constructor(message: string | Record<string, unknown> = 'Unauthorized') {
    super(message);
  }
}
