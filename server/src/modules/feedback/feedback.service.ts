import prisma from '../../config/db';
import { createError } from '../../middleware/errorHandler';
import { sendEmail } from '../../config/ses';

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

    const trimmedMessage = message.trim();

    // 1. Save to RDS PostgreSQL database
    const feedback = await prisma.feedback.create({
      data: {
        userId,
        name: user.fullName,
        phone: user.phone,
        email: user.collegeEmail,
        message: trimmedMessage,
      },
    });

    // 2. Dispatch email notification to support@wayza.co.in via Resend (non-blocking)
    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
        <div style="border-bottom: 2px solid #6366f1; padding-bottom: 12px; margin-bottom: 20px;">
          <h2 style="color: #1f2937; margin: 0; font-size: 20px;">💬 New Thought via "Tell us something"</h2>
          <span style="font-size: 13px; color: #6b7280;">Submitted by a student on Wayza</span>
        </div>

        <div style="background-color: #f8fafc; border-left: 4px solid #6366f1; padding: 16px; border-radius: 6px; margin-bottom: 24px;">
          <p style="margin: 0; font-size: 15px; color: #1e293b; line-height: 1.6; white-space: pre-wrap;">${trimmedMessage}</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #374151;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; width: 100px;"><strong>Student:</strong></td>
            <td style="padding: 8px 0; font-weight: 500;">${user.fullName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;"><strong>Email:</strong></td>
            <td style="padding: 8px 0;"><a href="mailto:${user.collegeEmail}" style="color: #6366f1; text-decoration: none;">${user.collegeEmail}</a></td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;"><strong>Phone:</strong></td>
            <td style="padding: 8px 0;">${user.phone}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;"><strong>User ID:</strong></td>
            <td style="padding: 8px 0; font-family: monospace; font-size: 12px; color: #9ca3af;">${userId}</td>
          </tr>
        </table>

        <div style="margin-top: 24px; pt: 16px; border-top: 1px solid #f3f4f6; font-size: 12px; color: #9ca3af; text-align: center;">
          Wayza Feedback System • Stored in RDS with ID: ${feedback.id}
        </div>
      </div>
    `;

    sendEmail(
      'support@wayza.co.in',
      `[Wayza Feedback] From ${user.fullName}`,
      emailHtml
    ).catch((err: any) => {
      console.error('[Feedback] Resend notification failed:', err?.message || err);
    });

    return { feedbackId: feedback.id };
  }
}

export const feedbackService = new FeedbackService();
