import api from './client';

export const feedbackApi = {
  submit: (message: string) =>
    api.post('/feedback/submit', { message }).then((r) => r.data),
};
