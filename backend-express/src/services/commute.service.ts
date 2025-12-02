import { prisma } from '../config/database';
import { userService } from './user.service';
import { Prisma, Commute } from '@prisma/client';
import bcrypt from 'bcryptjs';

export interface CreateCommuteInput {
  user_email: string;
  date: string; // YYYY-MM-DD
  mode: string;
  distance_km: number;
  duration_min?: number;
  notes?: string;
}

export interface CommuteOutput {
  id: string;
  user_email: string;
  date: string;
  mode: string;
  distance_km: number;
  duration_min?: number;
  notes?: string;
}

export class CommuteService {
  async getOrCreateUser(email: string) {
    let user = await userService.findByEmail(email);
    if (!user) {
      //safety for demo
      const defaultPasswordHash = await bcrypt.hash('demo', 12);
      user = await prisma.user.create({
        data: {
          email,
          passwordHash: defaultPasswordHash,
        },
      });
    }
    return user;
  }

  async createCommute(input: CreateCommuteInput): Promise<CommuteOutput> {
    const user = await this.getOrCreateUser(input.user_email);
    const date = new Date(input.date);

    const commute = await prisma.commute.create({
      data: {
        userId: user.id,
        date,
        mode: input.mode,
        distanceKm: input.distance_km,
        durationMin: input.duration_min,
        notes: input.notes,
      },
    });

    return {
      id: commute.id,
      user_email: user.email,
      date: commute.date.toISOString().slice(0, 10),
      mode: commute.mode,
      distance_km: commute.distanceKm,
      duration_min: commute.durationMin ?? undefined,
      notes: commute.notes ?? undefined,
    };
  }

  async listCommutes(
    userEmail: string,
    from?: string,
    to?: string
  ): Promise<CommuteOutput[]> {
    const user = await this.getOrCreateUser(userEmail);

    const where: Prisma.CommuteWhereInput = {
      userId: user.id,
    };

    if (from || to) {
      where.date = {};
      if (from) {
        where.date.gte = new Date(from);
      }
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        where.date.lte = toDate;
      }
    }

    const commutes = await prisma.commute.findMany({
      where,
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
    });

    return commutes.map((c: Commute) => ({
      id: c.id,
      user_email: user.email,
      date: c.date.toISOString().slice(0, 10),
      mode: c.mode,
      distance_km: c.distanceKm,
      duration_min: c.durationMin ?? undefined,
      notes: c.notes ?? undefined,
    }));
  }

  async deleteCommute(commuteId: string, userEmail: string): Promise<boolean> {
    const user = await this.getOrCreateUser(userEmail);

    const commute = await prisma.commute.findUnique({
      where: { id: commuteId },
    });

    if (!commute || commute.userId !== user.id) {
      return false;
    }

    await prisma.commute.delete({
      where: { id: commuteId },
    });

    return true;
  }
}

export const commuteService = new CommuteService();

