import { HttpClientError } from './ClientError';

export class BadRequestError extends HttpClientError {
  readonly statusCode = 400;

  constructor(message: string | Record<string, unknown> = 'Bad Request') {
    super(message);
  }
}
