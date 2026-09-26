import api from './client';
import type { User } from '../types';

export const userApi = {
  getMe: () => api.get<User & { phone: string; collegeEmail: string; emailVerified: boolean }>('/user/me').then((r) => r.data),

  updateMe: (fullName: string) => api.patch('/user/me', { fullName }).then((r) => r.data),

  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    return api
      .post<{ profilePicUrl: string }>('/user/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  deleteAccount: () => api.delete('/user/me').then((r) => r.data),
};
