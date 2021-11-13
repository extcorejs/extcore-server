import { Request, Response, NextFunction } from 'express';
import { HttpClientError } from '../../errors/http/ClientError';

export const handleClientError = (err: HttpClientError, req: Request, res: Response, next: NextFunction): void => {
  if (err instanceof HttpClientError) {
    res.status(err.statusCode).json(err.message);
  } else {
    next(err);
  }
};

export const handleServerError = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json('Internal Server Error');
  } else {
    res.status(500).send({
      error: err.message,
    });
  }

  next(err);
};
