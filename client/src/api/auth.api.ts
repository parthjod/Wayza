import api from './client';
import type { CheckPhoneResponse, AuthResponse } from '../types';

export const authApi = {
  checkPhone: (phone: string) =>
    api.post<CheckPhoneResponse>('/auth/check-phone', { phone }).then((r) => r.data),

  signupInitiate: (phone: string, fullName: string, collegeEmail: string) =>
    api.post('/auth/signup/initiate', { phone, fullName, collegeEmail }).then((r) => r.data),

  verifyOTP: (phone: string, otp: string, flow: 'login' | 'signup') =>
    api.post<AuthResponse>('/auth/verify-otp', { phone, otp, flow }).then((r) => r.data),

  refresh: () => api.post('/auth/refresh').then((r) => r.data),

  logout: () => api.post('/auth/logout').then((r) => r.data),

  verifyEmail: (token: string) =>
    api.get('/auth/verify-email', { params: { token } }).then((r) => r.data),
};
