import { Router } from 'express';
import { fareController } from './fare.controller';
import { authMiddleware } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { submitFareSchema } from './fare.schema';

const router = Router();
router.use(authMiddleware);

router.post(
  '/:groupId/submit',
  validate({ body: submitFareSchema }),
  (req, res, next) => fareController.submit(req, res, next)
);

router.post('/:groupId/acknowledge', (req, res, next) => fareController.acknowledge(req, res, next));

export default router;
