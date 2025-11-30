import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { userService } from '../services/user.service';
import { NotFoundError } from '../errors/NotFoundError';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// GET /api/me
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
      roles: user.roles,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  })
);

export default router;

