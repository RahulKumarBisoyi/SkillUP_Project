import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { getDashboard } from '../controllers/dashboard.controller.js';

const router = Router();

// All dashboard endpoints require JWT authentication
router.use(authenticateToken);

// GET /api/dashboard
router.get('/', getDashboard);

export default router;
