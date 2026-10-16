import api from './client';
import type { MessagesResponse } from '../types';

export const chatApi = {
  getMessages: (groupId: string, cursor?: string, limit: number = 50) =>
    api
      .get<MessagesResponse>(`/chat/${groupId}/messages`, {
        params: { cursor, limit },
      })
      .then((r) => r.data),

  uploadImage: (groupId: string, file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    return api
      .post<{ message: any; imageUrl: string }>(`/chat/${groupId}/upload-image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },
};
