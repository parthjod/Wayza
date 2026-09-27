import { Request, Response, NextFunction } from 'express';
import { feedbackService } from './feedback.service';

export class FeedbackController {
  async submit(req: Request, res: Response, next: NextFunction) {
    try {
      const { message } = req.body;
      const result = await feedbackService.submit(req.user!.userId, message);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const feedbackController = new FeedbackController();
