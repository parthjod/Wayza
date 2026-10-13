import api from './client';
import type { CheckPhoneResponse, CheckEmailResponse, AuthResponse } from '../types';

export const authApi = {
  checkEmail: (email: string) =>
    api.post<CheckEmailResponse>('/auth/check-email', { email }).then((r) => r.data),

  checkPhone: (phone: string) =>
    api.post<CheckPhoneResponse>('/auth/check-phone', { phone }).then((r) => r.data),

  signupInitiate: (collegeEmail: string, fullName: string, phone?: string) =>
    api.post('/auth/signup/initiate', { collegeEmail, fullName, phone }).then((r) => r.data),

  verifyOTP: (identifier: { email?: string; phone?: string }, otp: string, flow: 'login' | 'signup') =>
    api.post<AuthResponse>('/auth/verify-otp', { ...identifier, otp, flow }).then((r) => r.data),

  resendOTP: (email: string) =>
    api.post('/auth/resend-otp', { email }).then((r) => r.data),

  refresh: () => api.post('/auth/refresh').then((r) => r.data),

  logout: () => api.post('/auth/logout').then((r) => r.data),

  verifyEmail: (token: string) =>
    api.get('/auth/verify-email', { params: { token } }).then((r) => r.data),
};
