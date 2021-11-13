import { HttpClientError } from './ClientError';

export class ForbiddenError extends HttpClientError {
  readonly statusCode = 403;

  constructor(message: string | Record<string, unknown> = 'Forbidden') {
    super(message);
  }
}
