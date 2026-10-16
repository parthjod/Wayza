import api from './client';
import type { FareSplitResponse } from '../types';

export const fareApi = {
  submit: (
    groupId: string,
    totalFare: number,
    splitBetween: string[],
    splits?: Array<{ userId: string; amount: number }>
  ) =>
    api.post<FareSplitResponse>(`/fare/${groupId}/submit`, { totalFare, splitBetween, splits }).then((r) => r.data),

  acknowledge: (groupId: string) =>
    api.post(`/fare/${groupId}/acknowledge`).then((r) => r.data),
};

