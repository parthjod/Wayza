import api from './client';
import type { User } from '../types';

export const userApi = {
  getMe: () =>
    api
      .get<User & { phone: string; collegeEmail: string; emailVerified: boolean; avgRating: number; reviewsCount: number }>(
        '/user/me'
      )
      .then((r) => r.data),

  updateMe: (fullName: string) => api.patch('/user/me', { fullName }).then((r) => r.data),

  uploadAvatar: async (image: string | File) => {
    let payload = '';
    if (typeof image === 'string') {
      payload = image;
    } else {
      payload = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(image);
      });
    }
    return api
      .post<{ profilePicUrl: string }>('/user/me/avatar', { image: payload })
      .then((r) => r.data);
  },

  deleteAvatar: () => api.delete<{ ok: boolean; profilePicUrl: null }>('/user/me/avatar').then((r) => r.data),

  deleteAccount: () => api.delete('/user/me').then((r) => r.data),
};
