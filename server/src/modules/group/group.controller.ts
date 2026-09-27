import { Request, Response, NextFunction } from 'express';
import { groupService } from './group.service';

export class GroupController {
  async initiate(req: Request, res: Response, next: NextFunction) {
    try {
      const io = req.app.get('io');
      const result = await groupService.initiateGroup(req.user!.userId, req.body.targetUserId, io);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getGroup(req: Request, res: Response, next: NextFunction) {
    try {
      const io = req.app.get('io');
      const result = await groupService.getGroup(req.params.groupId as string, req.user!.userId, io);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async confirmGo(req: Request, res: Response, next: NextFunction) {
    try {
      const groupId = req.params.groupId as string;
      const result = await groupService.confirmGo(groupId, req.user!.userId);
      const io = req.app.get('io');
      if (io) {
        io.to(`group:${groupId}`).emit('group:confirmed', {
          groupId,
          members: result.members,
          allConfirmed: result.allConfirmed,
        });
      }
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async sharePhone(req: Request, res: Response, next: NextFunction) {
    try {
      const groupId = req.params.groupId as string;
      const result = await groupService.sharePhone(groupId, req.user!.userId);
      const io = req.app.get('io');
      if (io) {
        io.to(`group:${groupId}`).emit('group:phone-shared', {
          groupId,
          sharerId: req.user!.userId,
        });
      }
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async addMember(req: Request, res: Response, next: NextFunction) {
    try {
      const groupId = req.params.groupId as string;
      const result = await groupService.addMember(
        groupId,
        req.user!.userId,
        req.body.inviteeUserId
      );
      const io = req.app.get('io');
      if (io) {
        io.to(`user:${req.body.inviteeUserId}`).emit('group:invite-received', {
          groupId,
          inviterId: req.user!.userId,
        });
      }
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async acceptInvite(req: Request, res: Response, next: NextFunction) {
    try {
      const groupId = req.params.groupId as string;
      const io = req.app.get('io');
      const result = await groupService.acceptInvite(groupId, req.user!.userId, io);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async leave(req: Request, res: Response, next: NextFunction) {
    try {
      const groupId = req.params.groupId as string;
      const io = req.app.get('io');
      const result = await groupService.leaveGroup(groupId, req.user!.userId, io);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const groupController = new GroupController();
