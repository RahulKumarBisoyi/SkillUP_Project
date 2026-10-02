import { Router } from 'express';
import {
  generateTrackPreview,
  createTrack,
  getUserTracks,
  getTrackById,
  updateTaskCompletion,
} from '../controllers/track.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

// Protect all learning track endpoints with JWT authentication
router.use(authenticateToken);

router.post('/generate', generateTrackPreview);
router.post('/', createTrack);
router.get('/', getUserTracks);
router.get('/:id', getTrackById);
router.patch('/:id/tasks/:taskId', updateTaskCompletion);

export default router;
