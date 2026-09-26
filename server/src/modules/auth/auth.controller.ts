import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { setAuthCookies, clearAuthCookies } from '../../utils/jwt';

export class AuthController {
  async checkPhone(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.checkPhone(req.body.phone);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async signupInitiate(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, fullName, collegeEmail } = req.body;
      const result = await authService.signupInitiate(phone, fullName, collegeEmail);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async verifyOTP(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, otp, flow } = req.body;
      const result = await authService.verifyOTP(phone, otp, flow);

      // Set auth cookies
      setAuthCookies(res, result.accessToken, result.refreshToken);

      res.json({ user: result.user });
    } catch (err) {
      next(err);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const currentRefreshToken = req.cookies?.refreshToken;
      if (!currentRefreshToken) {
        clearAuthCookies(res);
        res.status(401).json({ error: 'No refresh token' });
        return;
      }

      const result = await authService.refresh(currentRefreshToken);
      setAuthCookies(res, result.accessToken, result.refreshToken);
      res.json({ ok: true });
    } catch (err: any) {
      clearAuthCookies(res);
      next(err);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies?.refreshToken;
      await authService.logout(refreshToken);
      clearAuthCookies(res);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  }

  async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.query as { token: string };
      const result = await authService.verifyEmail(token);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
