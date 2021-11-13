export abstract class HttpClientError extends Error {
  readonly statusCode!: number;
  readonly name!: string;

  constructor(message: Record<string, unknown> | string) {
    if (message instanceof Object) {
      super(JSON.stringify(message));
    } else {
      super(message);
    }

    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}
