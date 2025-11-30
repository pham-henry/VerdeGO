import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt';

export interface TokenPayload {
  email: string;
}

export class JwtService {
  private secret: string;
  private accessExpirationMinutes: number;
  private refreshExpirationDays: number;

  constructor() {
    this.secret = jwtConfig.secret;
    this.accessExpirationMinutes = jwtConfig.accessExpirationMinutes;
    this.refreshExpirationDays = jwtConfig.refreshExpirationDays;
  }

  generateAccessToken(email: string): string {
    const payload: TokenPayload = { email };
    const expiresIn = `${this.accessExpirationMinutes}m`;

    return jwt.sign(payload, this.secret, {
      expiresIn,
      issuer: 'verdego-api',
    });
  }

  generateRefreshToken(email: string): string {
    const payload: TokenPayload = { email };
    const expiresIn = `${this.refreshExpirationDays}d`;

    return jwt.sign(payload, this.secret, {
      expiresIn,
      issuer: 'verdego-api',
    });
  }

  getEmailFromToken(token: string): string {
    try {
      const decoded = jwt.verify(token, this.secret) as TokenPayload;
      return decoded.email;
    } catch (error) {
      console.error('Error decoding token:', error);
      throw new Error('Invalid token');
    }
  }

  validateToken(token: string): boolean {
    try {
      jwt.verify(token, this.secret);
      return true;
    } catch (error) {
      return false;
    }
  }

  getExpirationDateFromToken(token: string): Date | null {
    try {
      const decoded = jwt.decode(token) as jwt.JwtPayload;
      if (decoded && decoded.exp) {
        return new Date(decoded.exp * 1000);
      }
      return null;
    } catch (error) {
      return null;
    }
  }
}

export const jwtService = new JwtService();


