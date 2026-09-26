import prisma from '../../config/db';
import { createError } from '../../middleware/errorHandler';

export class ReportService {
  async submitReport(reporterId: string, reportedUserId: string, description: string, groupId?: string) {
    if (reporterId === reportedUserId) {
      throw createError('Cannot report yourself', 400);
    }

    // Check reported user exists
    const reportedUser = await prisma.user.findUnique({ where: { id: reportedUserId } });
    if (!reportedUser) {
      throw createError('User not found', 404);
    }

    // If groupId provided, verify both users were in the same group
    if (groupId) {
      const reporterMember = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId, userId: reporterId } },
      });
      const reportedMember = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId, userId: reportedUserId } },
      });
      if (!reporterMember || !reportedMember) {
        const journey = await prisma.journey.findUnique({
          where: { groupId },
          include: { participants: true },
        });
        const hasReporter = !!reporterMember || journey?.participants.some((p: any) => p.userId === reporterId);
        const hasReported = !!reportedMember || journey?.participants.some((p: any) => p.userId === reportedUserId);
        if (!hasReporter || !hasReported) {
          throw createError('Both users must be in the same group', 400);
        }
      }
    }

    const report = await prisma.report.create({
      data: {
        reporterId,
        reportedId: reportedUserId,
        groupId: groupId || null,
        description: description.trim(),
        status: 'PENDING',
      },
    });

    return { reportId: report.id };
  }

  async getReports(status?: string) {
    const where = status ? { status: status as any } : {};
    const reports = await prisma.report.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        reporter: { select: { id: true, fullName: true } },
        reported: { select: { id: true, fullName: true, warningCount: true, blacklisted: true } },
      },
    });
    return { reports };
  }

  async updateReport(reportId: string, status: string) {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report) throw createError('Report not found', 404);

    // Update report status
    await prisma.report.update({
      where: { id: reportId },
      data: { status: status as any },
    });

    // Handle warning/blacklist logic
    if (status === 'WARNING_ISSUED') {
      const user = await prisma.user.update({
        where: { id: report.reportedId },
        data: { warningCount: { increment: 1 } },
      });
      // Auto-blacklist at 3 warnings
      if (user.warningCount >= 3) {
        await prisma.user.update({
          where: { id: report.reportedId },
          data: { blacklisted: true },
        });
      }
    } else if (status === 'BLACKLISTED') {
      await prisma.user.update({
        where: { id: report.reportedId },
        data: { blacklisted: true },
      });
    }

    return { ok: true };
  }
}

export const reportService = new ReportService();
