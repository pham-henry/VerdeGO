// backend-express/src/services/user.service.ts
import { prisma } from '../config/database';
import { Role } from '../types';
import { User } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { NotFoundError } from '../errors/NotFoundError';
import { UnauthorizedError } from '../errors/UnauthorizedError';

export class UserService {
  /**
   * Create a new user with a name, email, password, and optional roles.
   */
  async createUser(
    name: string,
    email: string,
    password: string,
    roles: Role[] = [Role.USER]
  ): Promise<User> {
    const passwordHash = await bcrypt.hash(password, 12);

    return prisma.user.create({
      data: {
        name,           // <-- NEW
        email,
        passwordHash,
        roles,
      },
    });
  }

  /** Find by email. */
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  async existsByEmail(email: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    return !!user;
  }

  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  async verifyPassword(password: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(password, passwordHash);
  }

  /** Update profile fields (currently just name) by email. */
  async updateProfileByEmail(
    email: string,
    data: { name?: string }
  ): Promise<User> {
    const user = await prisma.user.update({
      where: { email },
      data,
    });
    return user;
  }

  /** Change password, verifying current password first. */
  async changePasswordByEmail(
    email: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    const newHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });
  }
}

export const userService = new UserService();
