import { Router } from 'express';
import { reportController } from './report.controller';
import { authMiddleware, isAdmin } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { submitReportSchema, updateReportSchema } from './report.schema';

const router = Router();
router.use(authMiddleware);

router.post(
  '/submit',
  validate({ body: submitReportSchema }),
  (req, res, next) => reportController.submit(req, res, next)
);

// Admin routes
router.get('/admin/reports', isAdmin, (req, res, next) => reportController.getReports(req, res, next));
router.patch(
  '/admin/reports/:id',
  isAdmin,
  validate({ body: updateReportSchema }),
  (req, res, next) => reportController.updateReport(req, res, next)
);

export default router;
