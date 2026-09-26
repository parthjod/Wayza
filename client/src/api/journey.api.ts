import api from './client';

export const journeyApi = {
  start: (groupId: string) =>
    api.post(`/journey/${groupId}/start`).then((r) => r.data),

  end: (groupId: string) =>
    api.post(`/journey/${groupId}/end`).then((r) => r.data),
};
