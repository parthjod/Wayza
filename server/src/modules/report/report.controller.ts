import { Request, Response, NextFunction } from 'express';
import { reportService } from './report.service';

export class ReportController {
  async submit(req: Request, res: Response, next: NextFunction) {
    try {
      const { reportedUserId, groupId, description } = req.body;
      const result = await reportService.submitReport(
        req.user!.userId,
        reportedUserId,
        description,
        groupId
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getReports(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as string | undefined;
      const result = await reportService.getReports(status);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async updateReport(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await reportService.updateReport(req.params.id as string, req.body.status);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const reportController = new ReportController();
