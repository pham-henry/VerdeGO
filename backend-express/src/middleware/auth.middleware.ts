import { Request, Response, NextFunction } from 'express';
import { jwtService } from '../services/jwt.service';
import { UnauthorizedError } from '../errors/UnauthorizedError';

export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    throw new UnauthorizedError('Authentication required');
  }

  if (!jwtService.validateToken(token)) {
    throw new UnauthorizedError('Invalid or expired token');
  }

  try {
    const email = jwtService.getEmailFromToken(token);
    req.user = { email };
    next();
  } catch (error) {
    throw new UnauthorizedError('Invalid token');
  }
};


