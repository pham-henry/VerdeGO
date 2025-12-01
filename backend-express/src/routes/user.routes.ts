// backend-express/src/routes/user.routes.ts
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { userService } from '../services/user.service';
import { NotFoundError } from '../errors/NotFoundError';
import { asyncHandler } from '../utils/asyncHandler';
import { body } from 'express-validator';
import { validate } from '../middleware/validation.middleware';

const router = Router();

// GET /api/users/me
router.get(
  '/me',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const email = req.user?.email;
    if (!email) {
      throw new NotFoundError('User not found');
    }

    const user = await userService.findByEmail(email);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name ?? '',
      roles: user.roles,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  })
);

// PATCH /api/users/me  – update profile (name)
router.patch(
  '/me',
  authenticateToken,
  validate([
    body('name')
      .optional()
      .isLength({ min: 1, max: 150 })
      .withMessage('Name must be between 1 and 150 characters'),
  ]),
  asyncHandler(async (req: Request, res: Response) => {
    const email = req.user?.email;
    if (!email) {
      throw new NotFoundError('User not found');
    }

    const user = await userService.updateProfileByEmail(email, {
      name: req.body.name,
    });

    res.json({
      id: user.id,
      email: user.email,
      name: user.name ?? '',
      roles: user.roles,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  })
);

// POST /api/users/me/password – change password
router.post(
  '/me/password',
  authenticateToken,
  validate([
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters'),
  ]),
  asyncHandler(async (req: Request, res: Response) => {
    const email = req.user?.email;
    if (!email) {
      throw new NotFoundError('User not found');
    }

    const { currentPassword, newPassword } = req.body;

    await userService.changePasswordByEmail(email, currentPassword, newPassword);

    // no body needed; the frontend just needs to know it succeeded
    res.status(204).send();
  })
);

export default router;
