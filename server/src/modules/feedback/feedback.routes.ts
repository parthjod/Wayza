import { Router } from 'express';
import { feedbackController } from './feedback.controller';
import { authMiddleware } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { submitFeedbackSchema } from './feedback.schema';

const router = Router();
router.use(authMiddleware);

router.post(
  '/submit',
  validate({ body: submitFeedbackSchema }),
  (req, res, next) => feedbackController.submit(req, res, next)
);

export default router;
