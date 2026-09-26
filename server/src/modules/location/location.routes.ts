import { Router } from 'express';
import { locationController } from './location.controller';

const router = Router();

router.get('/campus-pois', (req, res, next) => locationController.getCampusPOIs(req, res, next));
router.get('/autocomplete', (req, res, next) => locationController.autocomplete(req, res, next));

export default router;
