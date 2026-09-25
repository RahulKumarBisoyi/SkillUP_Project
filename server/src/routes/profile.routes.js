import { Router } from 'express';
import { getProfile, updateProfile } from '../controllers/profile.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

// All profile endpoints are protected
router.use(authenticateToken);

router.get('/', getProfile);
router.put('/', updateProfile);

export default router;
