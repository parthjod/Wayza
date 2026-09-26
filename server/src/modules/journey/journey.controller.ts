import { Request, Response, NextFunction } from 'express';
import { journeyService } from './journey.service';

export class JourneyController {
  async start(req: Request, res: Response, next: NextFunction) {
    try {
      const groupId = req.params.groupId as string;
      const result = await journeyService.startJourney(groupId, req.user!.userId);
      const io = req.app.get('io');
      if (io) {
        io.to(`group:${groupId}`).emit('journey:progress', {
          groupId,
          userId: req.user!.userId,
          allStarted: result.allStarted,
        });
        if (result.allStarted) {
          io.to(`group:${groupId}`).emit('journey:all-started', {
            groupId,
            memberNames: result.memberNames,
          });
        }
      }
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async end(req: Request, res: Response, next: NextFunction) {
    try {
      const groupId = req.params.groupId as string;
      const result = await journeyService.endJourney(groupId, req.user!.userId);
      const io = req.app.get('io');
      if (io) {
        io.to(`group:${groupId}`).emit('journey:progress', {
          groupId,
          userId: req.user!.userId,
          allEnded: result.allEnded,
        });
        if (result.allEnded) {
          io.to(`group:${groupId}`).emit('journey:all-ended', {
            groupId,
          });
        }
      }
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const journeyController = new JourneyController();
