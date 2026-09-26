import api from './client';

export const reportApi = {
  submit: (reportedUserId: string, description: string, groupId?: string) =>
    api.post('/report/submit', { reportedUserId, groupId, description }).then((r) => r.data),
};
