import { Router, Request, Response } from 'express';
import { query } from 'express-validator';
import { validate } from '../middleware/validation.middleware';
import { commuteService } from '../services/commute.service';
import { emissionsService } from '../services/emissions.service';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get(
  '/emissions/summary',
  validate([
    query('user_email').isEmail().withMessage('Valid email is required'),
    query('groupBy').optional().isIn(['day', 'week', 'mode']),
    query('from').optional().isISO8601(),
    query('to').optional().isISO8601(),
  ]),
  asyncHandler(async (req: Request, res: Response) => {
    const { user_email, groupBy = 'day', from, to } = req.query;

    // Get commutes for the user
    const commutes = await commuteService.listCommutes(
      user_email as string,
      from as string | undefined,
      to as string | undefined
    );

    // Convert to format expected by emissions service
    const items = commutes.map((c) => ({
      mode: c.mode,
      distance_km: c.distance_km,
      date: c.date,
    }));

    // Compute emissions
    const comp = emissionsService.compute(items);

    // Build chart data based on groupBy
    const series: Array<{ label: string; value: number }> = [];

    if (groupBy === 'mode') {
      for (const [mode, value] of Object.entries(comp.by_mode_kg)) {
        series.push({ label: mode, value });
      }
    } else {
      // Group by day or week
      const bucket: Record<string, number> = {};
      for (const item of items) {
        let key = item.date;
        if (groupBy === 'week') {
          const date = new Date(item.date);
          const year = date.getFullYear();
          const week = getWeekNumber(date);
          key = `${year}-W${week.toString().padStart(2, '0')}`;
        }
        const factor = comp.factors[item.mode] ?? 0.15;
        const co2 = factor * item.distance_km;
        bucket[key] = (bucket[key] ?? 0) + co2;
      }
      series.push(
        ...Object.entries(bucket)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([label, value]) => ({ label, value: Number(value.toFixed(3)) }))
      );
    }

    res.json({
      total_kg: comp.total_kg,
      by_mode_kg: comp.by_mode_kg,
      series,
    });
  })
);

// Helper function to get ISO week number
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export default router;

