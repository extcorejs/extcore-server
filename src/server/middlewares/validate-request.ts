import { Response, NextFunction } from 'express';
import { YupValidationSchema } from '../../types/validation';
import { HttpRequest } from '../../routing';

export const validateRequest = (schema: YupValidationSchema | null) => {
  return async (req: HttpRequest, res: Response, next: NextFunction) => {
    if (!schema) {
      next();
      return;
    }

    const yupSchema = typeof schema === 'function' ? schema(req) : schema;

    try {
      await yupSchema.validate(req.body, {
        abortEarly: false,
      });
      next();
    } catch (e: any) {
      if (e && e.name && e.name === 'ValidationError') {
        res.status(422).json({
          validationErrors: e.errors,
        });
      } else {
        next(e);
      }
    }
  };
};
