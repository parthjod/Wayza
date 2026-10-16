import { Request, Response, NextFunction } from 'express';
import { fareService } from './fare.service';

export class FareController {
  async submit(req: Request, res: Response, next: NextFunction) {
    try {
      const { totalFare, splitBetween, splits } = req.body;
      const groupId = req.params.groupId as string;
      const result = await fareService.submitFare(
        groupId,
        req.user!.userId,
        totalFare,
        splitBetween,
        splits
      );
      const io = req.app.get('io');
      if (io) {
        io.to(`group:${groupId}`).emit('fare:split-submitted', {
          groupId,
          splits: result.splits,
          totalFare,
          rideEnded: true,
        });
        io.to(`group:${groupId}`).emit('journey:all-ended', {
          groupId,
        });
      }
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async acknowledge(req: Request, res: Response, next: NextFunction) {
    try {
      const groupId = req.params.groupId as string;
      const result = await fareService.acknowledge(groupId, req.user!.userId);
      const io = req.app.get('io');
      if (io && result.allAcknowledged) {
        io.to(`group:${groupId}`).emit('fare:all-acknowledged', {
          groupId,
        });
      }
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const fareController = new FareController();
