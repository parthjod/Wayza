import { Router } from 'express';
import { chatController } from './chat.controller';
import { authMiddleware } from '../../middleware/auth';

const router = Router();
router.use(authMiddleware);

router.get('/:groupId/messages', (req, res, next) => chatController.getMessages(req, res, next));

export default router;
