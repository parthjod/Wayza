import { z } from 'zod';

export const submitFeedbackSchema = z.object({
  message: z
    .string()
    .min(10, 'Message must be at least 10 characters')
    .max(2000, 'Message must be at most 2000 characters'),
});

export type SubmitFeedbackInput = z.infer<typeof submitFeedbackSchema>;
