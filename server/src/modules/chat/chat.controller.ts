import { Request, Response, NextFunction } from 'express';
import { chatService } from './chat.service';

export class ChatController {
  async getMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const groupId = req.params.groupId as string;
      const cursor = req.query.cursor as string | undefined;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const result = await chatService.getMessages(groupId, req.user!.userId, cursor, limit);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async uploadImage(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'Image file required' });
        return;
      }
      const groupId = req.params.groupId as string;
      const io = req.app.get('io');
      const result = await chatService.uploadImage(groupId, req.user!.userId, req.file, io);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const chatController = new ChatController();
