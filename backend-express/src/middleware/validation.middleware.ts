import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { ValidationError } from '../errors/ValidationError';

export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMap: Record<string, string> = {};
      errors.array().forEach((error) => {
        if ('path' in error) {
          errorMap[error.path] = error.msg;
        }
      });
      throw new ValidationError('Invalid input data', errorMap);
    }

    next();
  };
};


