import { Router } from 'express';
import { authController } from './auth.controller';
import { validate } from '../../middleware/validate';
import { authRateLimit } from '../../middleware/rateLimit';
import { checkPhoneSchema, signupInitiateSchema, verifyOTPSchema } from './auth.schema';

const router = Router();

router.post(
  '/check-phone',
  authRateLimit,
  validate({ body: checkPhoneSchema }),
  (req, res, next) => authController.checkPhone(req, res, next)
);

router.post(
  '/signup/initiate',
  authRateLimit,
  validate({ body: signupInitiateSchema }),
  (req, res, next) => authController.signupInitiate(req, res, next)
);

router.post(
  '/verify-otp',
  authRateLimit,
  validate({ body: verifyOTPSchema }),
  (req, res, next) => authController.verifyOTP(req, res, next)
);

router.post(
  '/refresh',
  authRateLimit,
  (req, res, next) => authController.refresh(req, res, next)
);

router.post(
  '/logout',
  (req, res, next) => authController.logout(req, res, next)
);

router.get(
  '/verify-email',
  (req, res, next) => authController.verifyEmail(req, res, next)
);

export default router;
