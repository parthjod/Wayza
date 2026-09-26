import api from './client';
import type { MessagesResponse } from '../types';

export const chatApi = {
  getMessages: (groupId: string, cursor?: string, limit: number = 50) =>
    api
      .get<MessagesResponse>(`/chat/${groupId}/messages`, {
        params: { cursor, limit },
      })
      .then((r) => r.data),
};
