import { Router } from 'express';
import { ratingController } from './rating.controller';
import { authMiddleware } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { submitRatingSchema } from './rating.schema';

const router = Router();
router.use(authMiddleware);

// Get all ride IDs with pending ratings (for badge display in history)
router.get('/pending', (req, res, next) => ratingController.getPendingRideIds(req, res, next));

// Get pending co-riders to rate for a specific ride
router.get('/:groupId/pending', (req, res, next) => ratingController.getPending(req, res, next));

// Submit a rating for a co-rider
router.post(
  '/:groupId/submit',
  validate({ body: submitRatingSchema }),
  (req, res, next) => ratingController.submit(req, res, next)
);

export default router;
