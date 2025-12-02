import { Router, Request, Response } from 'express';
import { query, body } from 'express-validator';
import { validate } from '../middleware/validation.middleware';
import { commuteService } from '../services/commute.service';
import { asyncHandler } from '../utils/asyncHandler';
import { NotFoundError } from '../errors/NotFoundError';

const router = Router();

// POST /api/commutes
router.post(
  '/commutes',
  validate([
    body('date').isISO8601().withMessage('Valid date (YYYY-MM-DD) is required'),
    body('mode').notEmpty().withMessage('Mode is required'),
    body('distance_km').isFloat({ min: 0 }).withMessage('Distance must be a positive number'),
    body('duration_min').optional().isFloat({ min: 0 }),
    body('notes').optional().isString(),
  ]),
  asyncHandler(async (req: Request, res: Response) => {
    const email = req.user?.email;
    if (!email) {
      throw new Error('User email not found in token');
    }
    const result = await commuteService.createCommute({
      ...req.body,
      user_email: email
    });
    res.status(201).json({ id: result.id });
  })
);

// GET /api/commutes
router.get(
  '/commutes',
  validate([
    query('from').optional().isISO8601(),
    query('to').optional().isISO8601(),
  ]),
  asyncHandler(async (req: Request, res: Response) => {
    const email = req.user?.email;
    if (!email) {
      throw new Error('User email not found in token');
    }
    const { from, to } = req.query;
    const commutes = await commuteService.listCommutes(
      email,
      from as string | undefined,
      to as string | undefined
    );
    res.json(commutes);
  })
);

// DELETE /api/commutes/:id
router.delete(
  '/commutes/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const email = req.user?.email;
    if (!email) {
      throw new Error('User email not found in token');
    }
    const { id } = req.params;
    const deleted = await commuteService.deleteCommute(id, email);
    if (!deleted) {
      throw new NotFoundError('Commute not found');
    }
    res.status(204).send();
  })
);

export default router;

