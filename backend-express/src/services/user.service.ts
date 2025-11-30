import { prisma } from '../config/database';
import { Role } from '../types';
import { User } from '@prisma/client';
import bcrypt from 'bcryptjs';

export class UserService {
  async createUser(email: string, password: string, roles: Role[] = [Role.USER]): Promise<User> {
    const passwordHash = await bcrypt.hash(password, 12);
    
    return prisma.user.create({
      data: {
        email,
        passwordHash,
        roles,
      },
    });
  }

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
}

export const userService = new UserService();


