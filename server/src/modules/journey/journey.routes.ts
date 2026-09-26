import { Router } from 'express';
import { journeyController } from './journey.controller';
import { authMiddleware } from '../../middleware/auth';

const router = Router();
router.use(authMiddleware);

router.post('/:groupId/start', (req, res, next) => journeyController.start(req, res, next));
router.post('/:groupId/end', (req, res, next) => journeyController.end(req, res, next));

export default router;
