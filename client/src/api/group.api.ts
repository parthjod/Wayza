import api from './client';
import type { Group, PickupSequenceData } from '../types';

export const groupApi = {
  initiate: (targetUserId: string) =>
    api.post<{ groupId: string }>('/group/initiate', { targetUserId }).then((r) => r.data),

  getGroup: (groupId: string) =>
    api.get<Group>(`/group/${groupId}`).then((r) => r.data),

  confirmGo: (groupId: string) =>
    api.post<{ allConfirmed: boolean; members: any[]; pickupSequence?: PickupSequenceData }>(
      `/group/${groupId}/confirm-go`
    ).then((r) => r.data),

  getPickupSequence: (groupId: string) =>
    api.get<PickupSequenceData>(`/group/${groupId}/pickup-sequence`).then((r) => r.data),

  sharePhone: (groupId: string) =>
    api.post(`/group/${groupId}/share-phone`).then((r) => r.data),

  addMember: (groupId: string, inviteeUserId: string) =>
    api.post(`/group/${groupId}/add-member`, { inviteeUserId }).then((r) => r.data),

  acceptInvite: (groupId: string) =>
    api.post(`/group/${groupId}/accept-invite`).then((r) => r.data),

  leave: (groupId: string) =>
    api.post(`/group/${groupId}/leave`).then((r) => r.data),

  getActive: () =>
    api.get<{ activeGroup: any | null }>('/group/active').then((r) => r.data),

  getHistory: () =>
    api.get<{ rides: any[] }>('/group/history').then((r) => r.data),
};
