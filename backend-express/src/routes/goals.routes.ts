import { Router, Request, Response } from 'express';
import { body, query } from 'express-validator';
import { weeklyGoalService, WEEKLY_GOAL_DEFAULTS } from '../services/weeklyGoal.service';
import { validate } from '../middleware/validation.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

function toResponse(goal: {
  weeklyZeroKm: number;
  weeklyEmissionCapKg: number;
  weeklyCommuteCount: number;
  updatedAt?: Date;
}) {
  return {
    weeklyZeroKm: goal.weeklyZeroKm,
    weeklyEmissionCapKg: goal.weeklyEmissionCapKg,
    weeklyCommuteCount: goal.weeklyCommuteCount,
    updatedAt: goal.updatedAt,
  };
}

router.get(
  '/goals',
  validate([query('user_email').isEmail().withMessage('Valid email is required')]),
  asyncHandler(async (req: Request, res: Response) => {
    const email = req.query.user_email as string;
    const goal = await weeklyGoalService.getGoalsByEmail(email);
    res.json({
      user_email: email,
      ...toResponse(goal),
    });
  })
);

router.put(
  '/goals',
  validate([
    body('user_email').isEmail().withMessage('Valid email is required'),
    body('weeklyZeroKm')
      .isInt({ min: 0, max: 1000 })
      .withMessage('weeklyZeroKm must be between 0 and 1000'),
    body('weeklyEmissionCapKg')
      .isInt({ min: 0, max: 1000 })
      .withMessage('weeklyEmissionCapKg must be between 0 and 1000'),
    body('weeklyCommuteCount')
      .isInt({ min: 0, max: 200 })
      .withMessage('weeklyCommuteCount must be between 0 and 200'),
  ]),
  asyncHandler(async (req: Request, res: Response) => {
    const { user_email, weeklyZeroKm, weeklyEmissionCapKg, weeklyCommuteCount } = req.body;
    const goal = await weeklyGoalService.upsertGoalsByEmail(user_email, {
      weeklyZeroKm,
      weeklyEmissionCapKg,
      weeklyCommuteCount,
    });
    res.json({
      user_email,
      ...toResponse(goal),
    });
  })
);

router.post(
  '/goals/reset',
  validate([body('user_email').isEmail().withMessage('Valid email is required')]),
  asyncHandler(async (req: Request, res: Response) => {
    const { user_email } = req.body;
    const goal = await weeklyGoalService.upsertGoalsByEmail(user_email, WEEKLY_GOAL_DEFAULTS);
    res.json({
      user_email,
      ...toResponse(goal),
    });
  })
);

export default router;


