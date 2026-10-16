import { z } from 'zod';

export const submitFareSchema = z.object({
  totalFare: z.number().positive('Total fare must be positive').max(100000),
  splitBetween: z
    .array(z.string().uuid())
    .min(2, 'Must split between at least 2 people'),
  splits: z
    .array(
      z.object({
        userId: z.string().uuid(),
        amount: z.number().nonnegative(),
      })
    )
    .optional(),
});

export type SubmitFareInput = z.infer<typeof submitFareSchema>;

