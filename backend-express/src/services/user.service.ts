import { prisma } from '../config/database';
import { Role } from '../types';
import { User } from '@prisma/client';
import bcrypt from 'bcryptjs';

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
        name,          // <-- NEW
        email,
        passwordHash,
        roles,
      },
    });
  }

  /**
   * Find user by email.
   */
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Check if user exists by email.
   */
  async existsByEmail(email: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    return !!user;
  }

  /**
   * Find user by ID.
   */
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * Check password validity.
   */
  async verifyPassword(password: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(password, passwordHash);
  }
}

export const userService = new UserService();
