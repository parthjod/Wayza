import { Router } from 'express';
import { authController } from './auth.controller';
import { validate } from '../../middleware/validate';
import { authRateLimit } from '../../middleware/rateLimit';
import {
  checkEmailSchema,
  checkPhoneSchema,
  signupInitiateSchema,
  signupCompleteSchema,
  verifyOTPSchema,
  resendOTPSchema,
} from './auth.schema';

const router = Router();

router.post(
  '/check-email',
  authRateLimit,
  validate({ body: checkEmailSchema }),
  (req, res, next) => authController.checkEmail(req, res, next)
);

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
  '/signup/complete',
  authRateLimit,
  validate({ body: signupCompleteSchema }),
  (req, res, next) => authController.signupComplete(req, res, next)
);


router.post(
  '/verify-otp',
  authRateLimit,
  validate({ body: verifyOTPSchema }),
  (req, res, next) => authController.verifyOTP(req, res, next)
);

router.post(
  '/resend-otp',
  authRateLimit,
  validate({ body: resendOTPSchema }),
  (req, res, next) => authController.resendOTP(req, res, next)
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
