import { Router } from 'express';
import multer from 'multer';
import { userController } from './user.controller';
import { authMiddleware } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { updateUserSchema } from './user.schema';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// All user routes require authentication
router.use(authMiddleware);

router.get('/me', (req, res, next) => userController.getMe(req, res, next));

router.patch(
  '/me',
  validate({ body: updateUserSchema }),
  (req, res, next) => userController.updateMe(req, res, next)
);

router.post(
  '/me/avatar',
  upload.single('image'),
  (req, res, next) => userController.uploadAvatar(req, res, next)
);

router.delete('/me', (req, res, next) => userController.deleteAccount(req, res, next));
router.post('/delete-account', (req, res, next) => userController.deleteAccount(req, res, next));
router.delete('/delete-account', (req, res, next) => userController.deleteAccount(req, res, next));

export default router;
