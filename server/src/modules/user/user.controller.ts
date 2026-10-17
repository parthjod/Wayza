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

  async getAvatar(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = String(req.params.userId);
      const avatar = await userService.getAvatarStream(userId);
      if (!avatar) {
        res.status(404).json({ error: 'Avatar not found' });
        return;
      }
      res.setHeader('Content-Type', avatar.contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      if (avatar.buffer) {
        res.send(avatar.buffer);
      } else if (avatar.stream) {
        avatar.stream.pipe(res);
      } else if (avatar.redirectUrl) {
        res.redirect(avatar.redirectUrl);
      }
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
      if (req.file.size > 15 * 1024 * 1024) {
        res.status(400).json({ error: 'File too large. Max 15MB.' });
        return;
      }
      const result = await userService.uploadAvatar(req.user!.userId, req.file);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async deleteAvatar(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await userService.deleteAvatar(req.user!.userId);
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
