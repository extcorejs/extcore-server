import { HttpClientError } from './ClientError';

export class NotFoundError extends HttpClientError {
  readonly statusCode = 404;

  constructor(message: string | Record<string, unknown> = 'Not Found') {
    super(message);
  }
}
