import { Router } from 'express';
import multer from 'multer';
import { chatController } from './chat.controller';
import { authMiddleware } from '../../middleware/auth';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

router.use(authMiddleware);

router.get('/:groupId/messages', (req, res, next) => chatController.getMessages(req, res, next));
router.post(
  '/:groupId/upload-image',
  upload.single('image'),
  (req, res, next) => chatController.uploadImage(req, res, next)
);

export default router;
