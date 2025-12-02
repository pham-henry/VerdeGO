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
  // Prevent crash if response already sent
  if (res.headersSent) {
    return next(err);
  }

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
  } else if (err.name === 'PrismaClientKnownRequestError' || (err as any).code?.startsWith('P')) {
    // Handle Prisma database errors
    const prismaError = err as any;
    console.error('Prisma Error:', {
      code: prismaError.code,
      meta: prismaError.meta,
      message: prismaError.message,
    });
    
    if (prismaError.code === 'P2002') {
      statusCode = 409;
      errorMessage = 'A record with this value already exists';
    } else if (prismaError.code === 'P2025') {
      statusCode = 404;
      errorMessage = 'Record not found';
    } else if (prismaError.code === 'P1001' || prismaError.code === 'P1017') {
      statusCode = 503;
      errorMessage = 'Database connection error. Please try again later.';
    } else {
      statusCode = 500;
      errorMessage = 'Database error occurred';
      console.error('Full Prisma error:', prismaError);
    }
  } else if (err.name === 'PrismaClientInitializationError') {
    statusCode = 503;
    errorMessage = 'Database connection failed. Please check your database configuration.';
    console.error('Prisma initialization error:', err);
  } else {
    // Log unexpected errors with full details
    console.error('Unexpected error details:', {
      name: err.name,
      message: err.message,
      stack: err.stack,
    });
  }

  const errorResponse: ErrorResponse = {
    timestamp: new Date().toISOString(),
    status: statusCode,
    error: getErrorType(statusCode),
    message: errorMessage,
    errors,
    path: req.path,
  };

  try {
    res.status(statusCode).json(errorResponse);
  } catch (responseError) {
    // If we can't send response, log and don't crash
    console.error('Failed to send error response:', responseError);
  }
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

