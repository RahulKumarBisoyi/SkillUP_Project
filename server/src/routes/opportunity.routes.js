import { Router } from 'express';
import {
  getOpportunities,
  getOpportunityById,
} from '../controllers/opportunity.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

// Protect all opportunity discovery endpoints with JWT authentication
router.use(authenticateToken);

router.get('/', getOpportunities);
router.get('/:id', getOpportunityById);

export default router;
