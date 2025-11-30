import { AuthResponse } from '../types';
import { RegisterRequest, LoginRequest, RefreshRequest } from '../types';
import { userService } from './user.service';
import { jwtService } from './jwt.service';
import { DuplicateEmailError } from '../errors/DuplicateEmailError';
import { UnauthorizedError } from '../errors/UnauthorizedError';
import { NotFoundError } from '../errors/NotFoundError';

export class AuthService {
  async register(request: RegisterRequest): Promise<AuthResponse> {
    if (await userService.existsByEmail(request.email)) {
      throw new DuplicateEmailError('Email already exists');
    }

    const user = await userService.createUser(request.email, request.password);
    const accessToken = jwtService.generateAccessToken(user.email);
    const refreshToken = jwtService.generateRefreshToken(user.email);

    return {
      accessToken,
      refreshToken,
      email: user.email,
    };
  }

  async login(request: LoginRequest): Promise<AuthResponse> {
    const user = await userService.findByEmail(request.email);
    
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isPasswordValid = await userService.verifyPassword(
      request.password,
      user.passwordHash
    );

    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const accessToken = jwtService.generateAccessToken(user.email);
    const refreshToken = jwtService.generateRefreshToken(user.email);

    return {
      accessToken,
      refreshToken,
      email: user.email,
    };
  }

  async refresh(request: RefreshRequest): Promise<AuthResponse> {
    if (!jwtService.validateToken(request.refreshToken)) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const email = jwtService.getEmailFromToken(request.refreshToken);
    const user = await userService.findByEmail(email);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const newAccessToken = jwtService.generateAccessToken(user.email);
    const newRefreshToken = jwtService.generateRefreshToken(user.email);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      email: user.email,
    };
  }
}

export const authService = new AuthService();


