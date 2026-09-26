import { Request, Response, NextFunction } from 'express';
import { discoveryService } from './discovery.service';

export class DiscoveryController {
  async publishLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await discoveryService.publishLocation(req.user!.userId, req.body);
      const io = req.app.get('io');
      if (io) {
        io.emit('discovery:user-joined', {
          userId: req.user!.userId,
        });
      }
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getNearby(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await discoveryService.getNearby(req.user!.userId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async unpublish(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await discoveryService.unpublish(req.user!.userId);
      const io = req.app.get('io');
      if (io) {
        io.emit('discovery:user-left', {
          userId: req.user!.userId,
        });
      }
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const discoveryController = new DiscoveryController();
