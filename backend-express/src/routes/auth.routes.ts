import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validation.middleware';
import { authService } from '../services/auth.service';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.post(
  '/register',
  validate([
    body('email')
      .isEmail()
      .withMessage('Email must be valid')
      .isLength({ max: 150 })
      .withMessage('Email must not exceed 150 characters')
      .notEmpty()
      .withMessage('Email is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters')
      .notEmpty()
      .withMessage('Password is required'),
  ]),
  asyncHandler(async (req: Request, res: Response) => {
    const response = await authService.register(req.body);
    res.status(201).json(response);
  })
);

router.post(
  '/login',
  validate([
    body('email')
      .isEmail()
      .withMessage('Email must be valid')
      .notEmpty()
      .withMessage('Email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ]),
  asyncHandler(async (req: Request, res: Response) => {
    const response = await authService.login(req.body);
    res.json(response);
  })
);

router.post(
  '/refresh',
  validate([
    body('refreshToken').notEmpty().withMessage('Refresh token is required'),
  ]),
  asyncHandler(async (req: Request, res: Response) => {
    const response = await authService.refresh(req.body);
    res.json(response);
  })
);

export default router;

