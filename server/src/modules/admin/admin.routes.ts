import { Router } from 'express';
import { reportController } from '../report/report.controller';
import { authMiddleware, isAdmin } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { updateReportSchema } from '../report/report.schema';

const router = Router();
router.use(authMiddleware);
router.use(isAdmin);

router.get('/reports', (req, res, next) => reportController.getReports(req, res, next));
router.patch(
  '/reports/:id',
  validate({ body: updateReportSchema }),
  (req, res, next) => reportController.updateReport(req, res, next)
);

export default router;
