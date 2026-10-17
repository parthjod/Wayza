import { Router } from 'express';
import multer from 'multer';
import { chatController } from './chat.controller';
import { authMiddleware } from '../../middleware/auth';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
});

// Public route for rendering chat images in <img /> tags (before authMiddleware)
router.get('/images/:groupId/:filename', (req, res, next) => chatController.getImage(req, res, next));

router.use(authMiddleware);

router.get('/:groupId/messages', (req, res, next) => chatController.getMessages(req, res, next));
router.post(
  '/:groupId/upload-image',
  upload.single('image'),
  (req, res, next) => chatController.uploadImage(req, res, next)
);

export default router;
