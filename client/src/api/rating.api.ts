import api from './client';

export interface CoRider {
  userId: string;
  fullName: string;
  profilePicUrl: string | null;
  rated: boolean;
}

export interface PendingRatingsResponse {
  coRiders: CoRider[];
  rideDate: string | null;
  dropLocation: string | null;
}

export const ratingApi = {
  getPending: (groupId: string): Promise<PendingRatingsResponse> =>
    api.get<PendingRatingsResponse>(`/rating/${groupId}/pending`).then((r) => r.data),

  getPendingRideIds: (): Promise<{ pendingGroupIds: string[] }> =>
    api.get<{ pendingGroupIds: string[] }>('/rating/pending').then((r) => r.data),

  submit: (
    groupId: string,
    toUserId: string,
    stars: number,
    tags: string[],
    comment?: string
  ): Promise<{ ratingId: string }> =>
    api
      .post<{ ratingId: string }>(`/rating/${groupId}/submit`, { toUserId, stars, tags, comment })
      .then((r) => r.data),
};
