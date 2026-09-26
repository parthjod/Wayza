import { Router } from 'express';
import { discoveryController } from './discovery.controller';
import { authMiddleware } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { z } from 'zod';

const router = Router();
router.use(authMiddleware);

const publishLocationSchema = z.object({
  lat: z.number().min(6).max(37), // India bounding box lat
  lng: z.number().min(68).max(98), // India bounding box lng
  dropLocationId: z.string().uuid().nullable(),
  dropLocationCustom: z.string().max(500).nullable(),
  dropLat: z.number().nullable(),
  dropLng: z.number().nullable(),
  searchRadiusMeters: z.number().refine(
    (v) => [100, 200, 500, 1000, 2000, 3000].includes(v),
    'Radius must be one of: 100, 200, 500, 1000, 2000, 3000'
  ),
});

router.post(
  '/publish-location',
  validate({ body: publishLocationSchema }),
  (req, res, next) => discoveryController.publishLocation(req, res, next)
);

router.get('/nearby', (req, res, next) => discoveryController.getNearby(req, res, next));

router.delete('/publish-location', (req, res, next) => discoveryController.unpublish(req, res, next));

export default router;
