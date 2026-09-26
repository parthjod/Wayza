import { z } from 'zod';

export const initiateGroupSchema = z.object({
  targetUserId: z.string().uuid('Invalid user ID'),
});

export const addMemberSchema = z.object({
  inviteeUserId: z.string().uuid('Invalid user ID'),
});

export const groupIdParamSchema = z.object({
  groupId: z.string().uuid('Invalid group ID'),
});

export type InitiateGroupInput = z.infer<typeof initiateGroupSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
