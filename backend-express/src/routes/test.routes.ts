import { Router, Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// GET /api/test/hello
router.get(
  '/hello',
  asyncHandler(async (req: Request, res: Response) => {
    res.json({ message: 'Hello, World!' });
  })
);

export default router;

