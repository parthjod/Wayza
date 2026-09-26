import api from './client';
import type { CampusPOI, AutocompleteResult } from '../types';

export const locationApi = {
  getCampusPOIs: () =>
    api.get<{ pois: CampusPOI[] }>('/location/campus-pois').then((r) => r.data),

  autocomplete: (q: string) =>
    api.get<{ results: AutocompleteResult[] }>('/location/autocomplete', { params: { q } }).then((r) => r.data),
};
