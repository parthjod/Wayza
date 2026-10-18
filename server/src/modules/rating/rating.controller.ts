import { Request, Response, NextFunction } from 'express';
import { ratingService } from './rating.service';

export class RatingController {
  async submit(req: Request, res: Response, next: NextFunction) {
    try {
      const groupId = req.params.groupId as string;
      const { toUserId, stars, tags, comment } = req.body;
      const result = await ratingService.submitRating(
        groupId,
        req.user!.userId,
        toUserId,
        stars,
        tags ?? [],
        comment
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getPending(req: Request, res: Response, next: NextFunction) {
    try {
      const groupId = req.params.groupId as string;
      const result = await ratingService.getPendingRatings(groupId, req.user!.userId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getPendingRideIds(req: Request, res: Response, next: NextFunction) {
    try {
      const pendingGroupIds = await ratingService.getPendingRideIds(req.user!.userId);
      res.json({ pendingGroupIds });
    } catch (err) {
      next(err);
    }
  }
}

export const ratingController = new RatingController();
