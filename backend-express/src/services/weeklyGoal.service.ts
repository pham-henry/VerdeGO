import { WeeklyGoal } from '@prisma/client';
import { prisma } from '../config/database';
import { NotFoundError } from '../errors/NotFoundError';

export type WeeklyGoalPayload = {
  weeklyZeroKm: number;
  weeklyEmissionCapKg: number;
  weeklyCommuteCount: number;
};

export const WEEKLY_GOAL_DEFAULTS: WeeklyGoalPayload = {
  weeklyZeroKm: 15,
  weeklyEmissionCapKg: 25,
  weeklyCommuteCount: 10,
};

class WeeklyGoalService {
  private async getUserByEmail(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user;
  }

  async getGoalsByEmail(email: string): Promise<WeeklyGoal> {
    const user = await this.getUserByEmail(email);
    const existing = await prisma.weeklyGoal.findUnique({ where: { userId: user.id } });
    if (existing) {
      return existing;
    }

    return prisma.weeklyGoal.create({
      data: {
        userId: user.id,
        ...WEEKLY_GOAL_DEFAULTS,
      },
    });
  }

  async upsertGoalsByEmail(email: string, payload: WeeklyGoalPayload): Promise<WeeklyGoal> {
    const user = await this.getUserByEmail(email);

    return prisma.weeklyGoal.upsert({
      where: { userId: user.id },
      update: {
        weeklyZeroKm: payload.weeklyZeroKm,
        weeklyEmissionCapKg: payload.weeklyEmissionCapKg,
        weeklyCommuteCount: payload.weeklyCommuteCount,
      },
      create: {
        userId: user.id,
        ...payload,
      },
    });
  }
}

export const weeklyGoalService = new WeeklyGoalService();


