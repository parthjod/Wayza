import { Router } from 'express';
import { groupController } from './group.controller';
import { authMiddleware } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { initiateGroupSchema, addMemberSchema, groupIdParamSchema } from './group.schema';

const router = Router();
router.use(authMiddleware);

router.post(
  '/initiate',
  validate({ body: initiateGroupSchema }),
  (req, res, next) => groupController.initiate(req, res, next)
);

router.get(
  '/active',
  (req, res, next) => groupController.getActive(req, res, next)
);

router.get(
  '/history',
  (req, res, next) => groupController.getHistory(req, res, next)
);

router.get(
  '/:groupId',
  validate({ params: groupIdParamSchema }),
  (req, res, next) => groupController.getGroup(req, res, next)
);

router.post(
  '/:groupId/confirm-go',
  validate({ params: groupIdParamSchema }),
  (req, res, next) => groupController.confirmGo(req, res, next)
);

router.post(
  '/:groupId/share-phone',
  validate({ params: groupIdParamSchema }),
  (req, res, next) => groupController.sharePhone(req, res, next)
);

router.post(
  '/:groupId/add-member',
  validate({ params: groupIdParamSchema, body: addMemberSchema }),
  (req, res, next) => groupController.addMember(req, res, next)
);

router.post(
  '/:groupId/accept-invite',
  validate({ params: groupIdParamSchema }),
  (req, res, next) => groupController.acceptInvite(req, res, next)
);

router.post(
  '/:groupId/leave',
  validate({ params: groupIdParamSchema }),
  (req, res, next) => groupController.leave(req, res, next)
);

export default router;
