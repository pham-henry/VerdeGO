import { Request, Response, NextFunction } from 'express';
import { ErrorResponse } from '../types';
import { ValidationError } from '../errors/ValidationError';
import { DuplicateEmailError } from '../errors/DuplicateEmailError';
import { UnauthorizedError } from '../errors/UnauthorizedError';
import { NotFoundError } from '../errors/NotFoundError';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): Response | void => {
  console.error('Error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  let statusCode = 500;
  let errorMessage = 'An unexpected error occurred';
  let errors: Record<string, string> | undefined;

  if (err instanceof ValidationError) {
    statusCode = 400;
    errorMessage = 'Validation Failed';
    errors = err.errors;
  } else if (err instanceof DuplicateEmailError) {
    statusCode = 409;
    errorMessage = err.message;
  } else if (err instanceof UnauthorizedError) {
    statusCode = 401;
    errorMessage = err.message || 'Unauthorized';
  } else if (err instanceof NotFoundError) {
    statusCode = 404;
    errorMessage = err.message || 'Not found';
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorMessage = 'Invalid token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorMessage = 'Token expired';
  }

  const errorResponse: ErrorResponse = {
    timestamp: new Date().toISOString(),
    status: statusCode,
    error: getErrorType(statusCode),
    message: errorMessage,
    errors,
    path: req.path,
  };

  res.status(statusCode).json(errorResponse);
};

function getErrorType(statusCode: number): string {
  switch (statusCode) {
    case 400:
      return 'Bad Request';
    case 401:
      return 'Unauthorized';
    case 403:
      return 'Forbidden';
    case 404:
      return 'Not Found';
    case 409:
      return 'Conflict';
    case 500:
      return 'Internal Server Error';
    default:
      return 'Error';
  }
}

