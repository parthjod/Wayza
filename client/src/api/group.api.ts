import api from './client';
import type { Group } from '../types';

export const groupApi = {
  initiate: (targetUserId: string) =>
    api.post<{ groupId: string }>('/group/initiate', { targetUserId }).then((r) => r.data),

  getGroup: (groupId: string) =>
    api.get<Group>(`/group/${groupId}`).then((r) => r.data),

  confirmGo: (groupId: string) =>
    api.post(`/group/${groupId}/confirm-go`).then((r) => r.data),

  sharePhone: (groupId: string) =>
    api.post(`/group/${groupId}/share-phone`).then((r) => r.data),

  addMember: (groupId: string, inviteeUserId: string) =>
    api.post(`/group/${groupId}/add-member`, { inviteeUserId }).then((r) => r.data),

  acceptInvite: (groupId: string) =>
    api.post(`/group/${groupId}/accept-invite`).then((r) => r.data),

  leave: (groupId: string) =>
    api.post(`/group/${groupId}/leave`).then((r) => r.data),
};
