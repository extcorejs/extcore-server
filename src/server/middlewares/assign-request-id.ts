import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

const assignRequestId = (req: Request, res: Response, next: NextFunction): void => {
  req.requestId = uuidv4();
  next();
};

export default assignRequestId;
