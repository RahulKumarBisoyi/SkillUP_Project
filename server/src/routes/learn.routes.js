import { Router } from 'express';
import { getRecommendations } from '../controllers/learn.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

// Protect all learning recommendation routes with JWT authentication
router.use(authenticateToken);

router.post('/recommend', getRecommendations);

export default router;
