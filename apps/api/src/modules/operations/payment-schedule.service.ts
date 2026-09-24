/**
 * Payment Schedule Service — PixMatch AI Phase 21
 * Installment schedules, payment milestones, due-date tracking, and revenue reconciliation with Phase 18 StudioBusinessTransaction.
 */

import { prisma } from '@pixmatch/database';
import { EmailService } from '../../services/email/email.service.js';
import {
  ProjectPaymentScheduleStatus,
  ProjectPaymentScheduleDTO,
  CreatePaymentScheduleDTO,
  UpdatePaymentScheduleDTO,
  RecordPaymentSchedulePaymentDTO,
} from '@pixmatch/types';

export class PaymentScheduleService {
  /**
   * Helper: Sanitize text
   */
  private static sanitizeText(str?: string | null): string | null {
    if (!str) return str || null;
    return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').trim();
  }

  /**
   * List payment schedules for a project
   */
  static async listSchedules(
    studioId: string,
    projectId: string
  ): Promise<ProjectPaymentScheduleDTO[]> {
    const schedules = await prisma.projectPaymentSchedule.findMany({
      where: {
        studio_id: studioId,
        project_id: projectId,
      },
      orderBy: { installment_number: 'asc' },
      include: {
        project: { select: { id: true, title: true, client_id: true } },
        transaction: true,
      },
    });

    return schedules.map((s: any) => this.mapToDTO(s));
  }

  /**
   * Get single payment schedule by ID
   */
  static async getSchedule(
    studioId: string,
    id: string
  ): Promise<ProjectPaymentScheduleDTO> {
    const s = await prisma.projectPaymentSchedule.findFirst({
      where: { id, studio_id: studioId },
      include: {
        project: { select: { id: true, title: true, client_id: true } },
        transaction: true,
      },
    });

    if (!s) {
      throw new Error('Payment schedule not found');
    }

    return this.mapToDTO(s);
  }

  /**
   * Create a payment schedule installment
   */
  static async createSchedule(
    studioId: string,
    projectIdOrData: string | (CreatePaymentScheduleDTO & { project_id?: string }),
    dataArg?: CreatePaymentScheduleDTO
  ): Promise<ProjectPaymentScheduleDTO> {
    const projectId = typeof projectIdOrData === 'string' ? projectIdOrData : (projectIdOrData as any).project_id;
    const data = typeof projectIdOrData === 'string' ? dataArg! : projectIdOrData;

    if (!projectId) {
      throw new Error('Project ID is required to create a payment schedule');
    }

    const project = await prisma.studioProject.findFirst({
      where: { id: projectId, studio_id: studioId, deleted_at: null },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    const count = await prisma.projectPaymentSchedule.count({
      where: { project_id: projectId },
    });

    const installmentNum = data.installment_number || count + 1;
    const amount = Math.max(0, Number(data.amount) || 0);

    const created = await prisma.projectPaymentSchedule.create({
      data: {
        studio_id: studioId,
        project_id: projectId,
        installment_number: installmentNum,
        title: this.sanitizeText(data.title) || `Installment #${installmentNum}`,
        description: this.sanitizeText(data.description),
        due_date: new Date(data.due_date),
        amount,
        currency: data.currency || 'USD',
        status: ProjectPaymentScheduleStatus.PENDING,
        metadata: data.metadata || {},
      },
      include: {
        project: { select: { id: true, title: true, client_id: true } },
      },
    });

    return this.mapToDTO(created);
  }

  /**
   * Update payment schedule installment
   */
  static async updateSchedule(
    studioId: string,
    id: string,
    data: UpdatePaymentScheduleDTO
  ): Promise<ProjectPaymentScheduleDTO> {
    const existing = await prisma.projectPaymentSchedule.findFirst({
      where: { id, studio_id: studioId },
    });

    if (!existing) {
      throw new Error('Payment schedule not found');
    }

    const updated = await prisma.projectPaymentSchedule.update({
      where: { id },
      data: {
        title: data.title ? this.sanitizeText(data.title)! : existing.title,
        description: data.description !== undefined ? this.sanitizeText(data.description) : existing.description,
        installment_number: data.installment_number !== undefined ? data.installment_number : existing.installment_number,
        due_date: data.due_date ? new Date(data.due_date) : existing.due_date,
        amount: data.amount !== undefined ? Math.max(0, Number(data.amount)) : existing.amount,
        currency: data.currency || existing.currency,
        status: (data.status as ProjectPaymentScheduleStatus) || existing.status,
        metadata: data.metadata || existing.metadata,
      },
      include: {
        project: { select: { id: true, title: true, client_id: true } },
        transaction: true,
      },
    });

    return this.mapToDTO(updated);
  }

  /**
   * Record payment for an installment (and optionally create Business Transaction in Phase 18)
   */
  static async recordPayment(
    studioId: string,
    id: string,
    data: RecordPaymentSchedulePaymentDTO
  ): Promise<ProjectPaymentScheduleDTO> {
    const schedule = await prisma.projectPaymentSchedule.findFirst({
      where: { id, studio_id: studioId },
      include: { project: true },
    });

    if (!schedule) {
      throw new Error('Payment schedule not found');
    }

    const additionalPaid = Math.max(0, Number(data.paid_amount) || 0);
    const newTotalPaid = schedule.paid_amount + additionalPaid;
    let newStatus: ProjectPaymentScheduleStatus = schedule.status as ProjectPaymentScheduleStatus;

    if (newTotalPaid >= schedule.amount) {
      newStatus = ProjectPaymentScheduleStatus.PAID;
    } else if (newTotalPaid > 0) {
      newStatus = ProjectPaymentScheduleStatus.PARTIAL;
    }

    let transactionId = schedule.transaction_id;

    // Run transaction
    const result = await prisma.$transaction(async (tx: any) => {
      if (data.create_business_transaction !== false && additionalPaid > 0) {
        // Create Phase 18 StudioBusinessTransaction
        const txnClient = tx.studioBusinessTransaction || (prisma as any).studioBusinessTransaction;
        if (txnClient && typeof txnClient.create === 'function') {
          const txn = await txnClient.create({
            data: {
              studio_id: studioId,
              client_id: schedule.project?.client_id,
              project_id: schedule.project_id,
              payment_schedule_id: schedule.id,
              type: 'INCOME',
              category: 'SHOOT_FEE',
              amount: additionalPaid,
              currency: schedule.currency,
              description: `${schedule.title} payment for ${schedule.project?.title || 'Project'}`,
              transaction_date: data.transaction_date ? new Date(data.transaction_date) : new Date(),
              payment_method: data.payment_method || 'BANK_TRANSFER',
              reference_number: `SCHED-${schedule.installment_number}-${Date.now().toString().slice(-4)}`,
              notes: data.notes || '',
            },
          });
          transactionId = txn.id;
        }
      }

      const updatedSchedule = await tx.projectPaymentSchedule.update({
        where: { id },
        data: {
          paid_amount: newTotalPaid,
          status: newStatus,
          paid_at: newTotalPaid >= schedule.amount ? new Date() : schedule.paid_at,
          transaction_id: transactionId,
        },
        include: {
          project: { select: { id: true, title: true, client_id: true } },
          transaction: true,
        },
      });

      // Update project total paid_amount
      try {
        const allSchedules = await tx.projectPaymentSchedule.findMany({
          where: { project_id: schedule.project_id },
        });
        const totalPaidOnProject = allSchedules.reduce((acc: number, item: any) => {
          const amt = item.id === id ? newTotalPaid : (Number(item.paid_amount) || 0);
          return acc + amt;
        }, 0);
        await tx.studioProject.update({
          where: { id: schedule.project_id },
          data: { paid_amount: totalPaidOnProject },
        });
      } catch (_) {}

      return updatedSchedule;
    });

    return this.mapToDTO(result);
  }

  /**
   * Delete payment schedule
   */
  /**
   * Delete payment schedule
   */
  static async deleteSchedule(studioId: string, id: string): Promise<{ success: boolean }> {
    const existing = await prisma.projectPaymentSchedule.findFirst({
      where: { id, studio_id: studioId },
    });
    if (!existing) {
      throw new Error('Payment schedule not found');
    }
    await prisma.projectPaymentSchedule.delete({ where: { id } });
    return { success: true };
  }

  /**
   * Send payment reminder email for an installment
   */
  static async sendReminder(
    studioId: string,
    id: string
  ): Promise<{ success: boolean; messageId?: string; sent_at: Date }> {
    const schedule = await prisma.projectPaymentSchedule.findFirst({
      where: { id, studio_id: studioId },
      include: {
        project: {
          include: {
            client: true,
            studio: true,
          },
        },
      },
    });

    if (!schedule) {
      throw new Error('Payment schedule not found');
    }

    const clientEmail = schedule.project?.client?.email;
    const clientName = schedule.project?.client?.name || 'Valued Client';
    const studioName = schedule.project?.studio?.name || 'PixMatch Studio';
    const dueFormatted = new Date(schedule.due_date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const amountFormatted = `${schedule.currency || 'USD'} $${Number(schedule.amount).toLocaleString()}`;

    let messageId: string | undefined;
    if (clientEmail) {
      try {
        const emailResult = await EmailService.sendTransactional({
          to: clientEmail,
          subject: `Payment Reminder: ${schedule.title} (${amountFormatted}) is due on ${dueFormatted}`,
          html: `
            <div style="font-family: sans-serif; padding: 20px;">
              <h2>Payment Reminder from ${studioName}</h2>
              <p>Dear ${clientName},</p>
              <p>This is a friendly reminder that an upcoming installment for <strong>${schedule.project?.title || 'your project'}</strong> is scheduled:</p>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Installment:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${schedule.title}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Amount Due:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${amountFormatted}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Due Date:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${dueFormatted}</td></tr>
              </table>
              <p>Please contact ${studioName} to finalize payment or review your client booking portal.</p>
            </div>
          `,
          studioId,
          recipientType: 'CLIENT',
        });
        messageId = emailResult?.messageId;
      } catch (e: any) {
        console.warn(`[PaymentScheduleService] Failed to send reminder email: ${e.message}`);
      }
    }

    const now = new Date();
    await prisma.projectPaymentSchedule.update({
      where: { id },
      data: {
        reminder_sent_at: now,
      },
    });

    return {
      success: true,
      messageId,
      sent_at: now,
    };
  }

  /**
   * Helper: Map to DTO
   */
  public static mapToDTO(s: any): ProjectPaymentScheduleDTO {
    return {
      id: s.id,
      studio_id: s.studio_id,
      project_id: s.project_id,
      installment_number: s.installment_number,
      title: s.title,
      description: s.description,
      due_date: s.due_date,
      amount: s.amount,
      currency: s.currency,
      status: s.status as ProjectPaymentScheduleStatus,
      paid_amount: s.paid_amount || 0,
      paid_at: s.paid_at,
      transaction_id: s.transaction_id,
      reminder_sent_at: s.reminder_sent_at,
      metadata: s.metadata,
      created_at: s.created_at,
      updated_at: s.updated_at,
      project: s.project ? {
        id: s.project.id,
        title: s.project.title,
      } : undefined,
      transaction: s.transaction ? {
        id: s.transaction.id,
        amount: s.transaction.amount,
        currency: s.transaction.currency,
        transaction_date: s.transaction.transaction_date,
        payment_method: s.transaction.payment_method,
      } : null,
    };
  }
}
