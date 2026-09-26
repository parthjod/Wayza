import { z } from 'zod';

export const updateUserSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters')
    .regex(/^[a-zA-Z\s\-']+$/, 'Name may only contain letters, spaces, hyphens, and apostrophes'),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
