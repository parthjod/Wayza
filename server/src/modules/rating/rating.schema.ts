import { z } from 'zod';

export const submitRatingSchema = z.object({
  toUserId: z.string().uuid('Invalid user ID'),
  stars: z.number().int().min(1).max(5),
  tags: z.array(z.string().max(50)).max(10).default([]),
  comment: z.string().max(500).optional(),
});

export type SubmitRatingInput = z.infer<typeof submitRatingSchema>;
