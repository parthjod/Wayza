import api from './client';
import type { NearbyResponse } from '../types';

export const discoveryApi = {
  publishLocation: (data: {
    lat: number;
    lng: number;
    dropLocationId: string | null;
    dropLocationCustom: string | null;
    dropLat: number | null;
    dropLng: number | null;
    searchRadiusMeters: number;
  }) => api.post('/discovery/publish-location', data).then((r) => r.data),

  getNearby: () => api.get<NearbyResponse>('/discovery/nearby').then((r) => r.data),

  unpublish: () => api.delete('/discovery/publish-location').then((r) => r.data),
};
