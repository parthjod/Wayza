import { Request, Response, NextFunction } from 'express';
import { locationService } from './location.service';

export class LocationController {
  async getCampusPOIs(_req: Request, res: Response, next: NextFunction) {
    try {
      const result = await locationService.getCampusPOIs();
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async autocomplete(req: Request, res: Response, next: NextFunction) {
    try {
      const q = (req.query.q as string) || '';
      const result = await locationService.autocomplete(q);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const locationController = new LocationController();
