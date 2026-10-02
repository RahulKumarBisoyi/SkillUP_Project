import { Router } from 'express';
import {
  getOpportunities,
  getOpportunityById,
  analyzeOpportunity,
} from '../controllers/opportunity.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

// Protect all opportunity discovery & skill analysis endpoints with JWT authentication
router.use(authenticateToken);

router.get('/', getOpportunities);
router.get('/:id', getOpportunityById);
router.post('/:id/analyze', analyzeOpportunity);

export default router;

