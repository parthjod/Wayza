import prisma from '../../config/db';
import { createError } from '../../middleware/errorHandler';

export class FeedbackService {
  async submit(userId: string, message: string) {
    // Fetch user details from DB so we store name/phone/email with feedback
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true, phone: true, collegeEmail: true },
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    const feedback = await prisma.feedback.create({
      data: {
        userId,
        name: user.fullName,
        phone: user.phone,
        email: user.collegeEmail,
        message: message.trim(),
      },
    });

    return { feedbackId: feedback.id };
  }
}

export const feedbackService = new FeedbackService();
