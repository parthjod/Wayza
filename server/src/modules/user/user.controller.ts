import { Request, Response, NextFunction } from 'express';
import { userService } from './user.service';

export class UserController {
  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await userService.getMe(req.user!.userId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async updateMe(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await userService.updateMe(req.user!.userId, req.body.fullName);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async uploadAvatar(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No image file provided' });
        return;
      }
      if (req.file.size > 5 * 1024 * 1024) {
        res.status(400).json({ error: 'File too large. Max 5MB.' });
        return;
      }
      const result = await userService.uploadAvatar(req.user!.userId, req.file);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async deleteAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await userService.deleteAccount(req.user!.userId);
      res.clearCookie('accessToken', { path: '/' });
      res.clearCookie('refreshToken', { path: '/' });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const userController = new UserController();
