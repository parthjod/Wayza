import { z } from 'zod';

export const submitReportSchema = z.object({
  reportedUserId: z.string().uuid('Invalid user ID'),
  groupId: z.string().uuid('Invalid group ID').optional(),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(2000, 'Description must be at most 2000 characters'),
});

export const updateReportSchema = z.object({
  status: z.enum(['UNDER_REVIEW', 'WARNING_ISSUED', 'BLACKLISTED', 'DISMISSED']),
});

export type SubmitReportInput = z.infer<typeof submitReportSchema>;
