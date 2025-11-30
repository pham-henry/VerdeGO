import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validation.middleware';
import { recommenderService } from '../services/recommender.service';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.post(
  '/recommend',
  validate([
    body('origin').notEmpty().withMessage('Origin is required'),
    body('destination').notEmpty().withMessage('Destination is required'),
    body('prefs').optional().isObject(),
  ]),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await recommenderService.recommend(req.body);
    res.json(result);
  })
);

export default router;

