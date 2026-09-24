/**
 * Booking Service — PixMatch AI Phase 21
 * Booking transition pipeline: Lead -> Proposal -> Contract -> Confirmed Booking -> Payment Schedules & Active Project.
 */

import crypto from 'crypto';
import { prisma } from '@pixmatch/database';
import {
  StudioProjectStatus,
  StudioProjectType,
  StudioProposalStatus,
  StudioContractStatus,
  StudioLeadStatus,
  ProjectPaymentScheduleStatus,
  ConfirmBookingRequestDTO,
  BookingConfirmationDTO,
  BookingPipelineSummaryDTO,
} from '@pixmatch/types';
import { ProposalService } from './proposal.service.js';
import { ContractService } from './contract.service.js';
import { PaymentScheduleService } from './payment-schedule.service.js';

export class BookingService {
  /**
   * Helper: Sanitize text
   */
  private static sanitizeText(str?: string | null): string | null {
    if (!str) return str || null;
    return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').trim();
  }

  /**
   * Confirm booking and establish active project, schedules, and cross-phase linkages
   */
  static async confirmBooking(
    studioId: string,
    userId: string | null,
    data: ConfirmBookingRequestDTO
  ): Promise<BookingConfirmationDTO> {
    let clientId = data.client_id;
    if (!clientId && data.proposal_id) {
      const prop = await prisma.studioProposal.findFirst({ where: { id: data.proposal_id, studio_id: studioId } });
      if (prop) clientId = prop.client_id;
    }
    if (!clientId && data.contract_id) {
      const cont = await prisma.studioContract.findFirst({ where: { id: data.contract_id, studio_id: studioId } });
      if (cont) clientId = cont.client_id;
    }
    if (!clientId && data.lead_id) {
      const lead = await prisma.studioLead.findFirst({ where: { id: data.lead_id, studio_id: studioId } });
      if (lead) clientId = lead.client_id;
    }

    if (!clientId) {
      throw new Error('Client ID is required to confirm booking');
    }
    if (!data.project_title?.trim()) {
      throw new Error('Project title is required');
    }

    const client = await prisma.client.findFirst({
      where: { id: clientId, studio_id: studioId },
    });
    if (!client) {
      throw new Error('Client not found');
    }

    const bookingPublicToken = crypto.randomBytes(32).toString('hex');

    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Create or link project
      let projectId: string;
      const totalAmount = Math.max(0, Number(data.total_amount) || 0);

      const createdProject = await tx.studioProject.create({
        data: {
          studio_id: studioId,
          client_id: clientId,
          lead_id: data.lead_id || null,
          title: this.sanitizeText(data.project_title)!,
          project_type: data.project_type || StudioProjectType.OTHER,
          status: StudioProjectStatus.BOOKED,
          start_date: data.start_date ? new Date(data.start_date) : null,
          end_date: data.end_date ? new Date(data.end_date) : null,
          location: this.sanitizeText(data.location),
          total_amount: totalAmount,
          currency: data.currency || 'USD',
          notes: this.sanitizeText(data.notes),
          metadata: {
            booking_public_token: bookingPublicToken,
            booked_at: new Date().toISOString(),
            confirmed_by_user_id: userId,
          },
        },
      });
      projectId = createdProject.id;

      // 2. Link proposal if provided
      if (data.proposal_id) {
        await tx.studioProposal.update({
          where: { id: data.proposal_id },
          data: {
            project_id: projectId,
            status: StudioProposalStatus.ACCEPTED,
            accepted_at: new Date(),
            accepted_by_client_name: client.name,
          },
        });
      }

      // 3. Link contract if provided
      if (data.contract_id) {
        await tx.studioContract.update({
          where: { id: data.contract_id },
          data: {
            project_id: projectId,
            proposal_id: data.proposal_id || null,
          },
        });
      }

      // 4. Update Lead to BOOKED if linked
      if (data.lead_id) {
        await tx.studioLead.update({
          where: { id: data.lead_id },
          data: {
            status: StudioLeadStatus.BOOKED,
            converted_client_id: clientId,
            converted_project_id: projectId,
            converted_at: new Date(),
          },
        });
      }

      // 5. Create Payment Schedules
      if (data.payment_schedules && data.payment_schedules.length > 0) {
        await tx.projectPaymentSchedule.createMany({
          data: data.payment_schedules.map((s, idx) => ({
            studio_id: studioId,
            project_id: projectId,
            installment_number: s.installment_number || idx + 1,
            title: s.title || `Installment #${idx + 1}`,
            description: s.description || null,
            due_date: new Date(s.due_date),
            amount: Math.max(0, Number(s.amount) || 0),
            currency: s.currency || data.currency || 'USD',
            status: ProjectPaymentScheduleStatus.PENDING,
            metadata: s.metadata || {},
          })),
        });
      } else if (totalAmount > 0) {
        const depositAmt = (data.deposit_amount !== undefined && data.deposit_amount !== null)
          ? Math.max(0, Number(data.deposit_amount))
          : Math.round((totalAmount / 2) * 100) / 100;
        const remainder = Math.max(0, Math.round((totalAmount - depositAmt) * 100) / 100);
        const depositDate = data.deposit_due_date ? new Date(data.deposit_due_date) : new Date();
        const balanceDate = data.final_balance_due_date
          ? new Date(data.final_balance_due_date)
          : (data.start_date ? new Date(data.start_date) : new Date(Date.now() + 30 * 86400000));

        await tx.projectPaymentSchedule.createMany({
          data: [
            {
              studio_id: studioId,
              project_id: projectId,
              installment_number: 1,
              title: 'Booking Deposit (Initial Payment)',
              description: 'Non-refundable retainer due upon booking',
              due_date: depositDate,
              amount: depositAmt,
              currency: data.currency || 'USD',
              status: ProjectPaymentScheduleStatus.PENDING,
            },
            {
              studio_id: studioId,
              project_id: projectId,
              installment_number: 2,
              title: 'Final Balance Remaining',
              description: 'Remaining balance due on event date',
              due_date: balanceDate,
              amount: remainder,
              currency: data.currency || 'USD',
              status: ProjectPaymentScheduleStatus.PENDING,
            },
          ],
        });
      }

      // 6. Scaffold Default Milestones (4 stages)
      const defaultMilestones = [
        { title: 'Booking Confirmed & Retainer Due', description: 'Client confirmed booking through portal', status: 'COMPLETED', order_index: 1, completed_at: new Date() },
        { title: 'Pre-Shoot Consultation & Shot List', description: 'Align on creative vision, moodboard, and timing', status: 'PENDING', order_index: 2, completed_at: null },
        { title: 'Photography Shoot Execution', description: 'On-site photoshoot coverage', status: 'PENDING', order_index: 3, completed_at: null },
        { title: 'Post-Processing & Full Gallery Delivery', description: 'Color grading, retouching, and delivery to client gallery', status: 'PENDING', order_index: 4, completed_at: null },
      ];

      for (const ms of defaultMilestones) {
        try {
          const milestoneClient = tx.projectMilestone || prisma.projectMilestone;
          if (milestoneClient && typeof milestoneClient.create === 'function') {
            await milestoneClient.create({
              data: {
                studio_id: studioId,
                project_id: projectId,
                title: ms.title,
                description: ms.description,
                status: ms.status as any,
                order_index: ms.order_index,
                completed_at: ms.completed_at,
              },
            });
          }
        } catch (_) {}
      }

      // 7. Auto-create StudioCalendarEvent for Shoot (Phase 22)
      if (data.start_date) {
        try {
          const shootStart = new Date(data.start_date);
          const shootEnd = data.end_date ? new Date(data.end_date) : new Date(shootStart.getTime() + 4 * 3600000);
          const calendarClient = tx.studioCalendarEvent || prisma.studioCalendarEvent;
          if (calendarClient && typeof calendarClient.create === 'function') {
            await calendarClient.create({
              data: {
                studio_id: studioId,
                client_id: clientId,
                project_id: projectId,
                lead_id: data.lead_id || null,
                title: `📸 Shoot: ${createdProject.title || data.project_title}`,
                event_type: 'SHOOT',
                status: 'CONFIRMED',
                start_at: shootStart,
                end_at: shootEnd,
                location: this.sanitizeText(data.location),
                notes: this.sanitizeText(data.notes),
              },
            });
          }
        } catch (_) {}
      }

      return createdProject;
    });

    // Fetch full confirmed payload
    const [project, proposal, contract, paymentSchedules] = await Promise.all([
      prisma.studioProject.findUnique({
        where: { id: result.id },
        include: {
          client: { select: { id: true, name: true, email: true, phone: true, company: true } },
          lead: { select: { id: true, name: true, status: true } },
        },
      }),
      data.proposal_id ? ProposalService.getProposal(studioId, data.proposal_id) : null,
      data.contract_id ? ContractService.getContract(studioId, data.contract_id) : null,
      PaymentScheduleService.listSchedules(studioId, result.id),
    ]);

    // Log client activity
    try {
      await prisma.clientActivity.create({
        data: {
          client_id: clientId,
          studio_id: studioId,
          activity_type: 'BOOKING_CONFIRMED',
          description: `Booking confirmed for project "${project?.title}"`,
          metadata: { project_id: result.id, total_amount: project?.total_amount },
        },
      });
    } catch (_) {}

    const depositAmt = (data.deposit_amount !== undefined && data.deposit_amount !== null)
      ? Number(data.deposit_amount)
      : Math.round(((project?.total_amount || 0) / 2) * 100) / 100;

    return {
      booking_id: result.id,
      project_id: result.id,
      lead_id: data.lead_id || null,
      proposal_id: data.proposal_id || null,
      contract_id: data.contract_id || null,
      client_id: clientId,
      total_amount: project?.total_amount || 0,
      deposit_amount: depositAmt,
      booking_public_token: bookingPublicToken,
      public_token: bookingPublicToken,
      public_url: `/portal/booking/${bookingPublicToken}`,
      project: project as any,
      proposal: proposal as any,
      contract: contract as any,
      payment_schedules: paymentSchedules as any,
    };
  }

  /**
   * Get public portal booking presentation details using token
   */
  static async getPublicBooking(token: string): Promise<PublicBookingViewDTO> {
    const project = await prisma.studioProject.findFirst({
      where: {
        metadata: {
          path: ['booking_public_token'],
          equals: token,
        },
        deleted_at: null,
      },
      include: {
        studio: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo_url: true,
            email: true,
            phone: true,
          },
        },
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            company: true,
          },
        },
        payment_schedules: {
          where: { deleted_at: null },
          orderBy: { installment_number: 'asc' },
        },
      },
    });

    if (!project) {
      throw new Error('Booking link invalid or expired');
    }

    const [proposal, contract] = await Promise.all([
      prisma.studioProposal.findFirst({
        where: { project_id: project.id, deleted_at: null },
      }),
      prisma.studioContract.findFirst({
        where: { project_id: project.id, deleted_at: null },
      }),
    ]);

    const mappedSchedules = (project.payment_schedules || []).map((s: any) => ({
      installment_number: s.installment_number,
      title: s.title,
      due_date: s.due_date,
      amount: s.amount,
      currency: s.currency,
      status: s.status as ProjectPaymentScheduleStatus,
      paid_amount: s.paid_amount || 0,
      paid_at: s.paid_at,
    }));

    return {
      booking: {
        project: {
          id: project.id,
          title: project.title,
          project_type: project.project_type as StudioProjectType,
          status: project.status as StudioProjectStatus,
          start_date: project.start_date,
          end_date: project.end_date,
          location: project.location,
        },
        proposal: proposal
          ? {
              id: proposal.id,
              proposal_number: proposal.proposal_number,
              total_amount: proposal.total_amount,
              currency: proposal.currency,
              status: proposal.status as StudioProposalStatus,
            }
          : null,
        contract: contract
          ? {
              id: contract.id,
              contract_number: contract.contract_number,
              status: contract.status as StudioContractStatus,
              signed_at: contract.signed_at,
              signed_by_name: contract.signed_by_name,
              signature_hash: contract.signature_hash,
            }
          : null,
        payment_schedules: mappedSchedules,
      },
      project: {
        id: project.id,
        title: project.title,
        project_type: project.project_type as StudioProjectType,
        status: project.status as StudioProjectStatus,
        start_date: project.start_date,
        end_date: project.end_date,
        location: project.location,
      },
      proposal: proposal
        ? {
            id: proposal.id,
            proposal_number: proposal.proposal_number,
            total_amount: proposal.total_amount,
            currency: proposal.currency,
            status: proposal.status as StudioProposalStatus,
          }
        : null,
      contract: contract
        ? {
            id: contract.id,
            contract_number: contract.contract_number,
            status: contract.status as StudioContractStatus,
            signed_at: contract.signed_at,
            signed_by_name: contract.signed_by_name,
            signature_hash: contract.signature_hash,
          }
        : null,
      payment_schedules: mappedSchedules,
      schedules: mappedSchedules,
      studio: {
        name: project.studio?.name || 'PixMatch Studio',
        slug: project.studio?.slug || 'studio',
        logo_url: project.studio?.logo_url,
        email: project.studio?.email,
        phone: project.studio?.phone,
      },
      client: {
        name: project.client?.name || 'Valued Client',
        full_name: project.client?.name || 'Valued Client',
        email: project.client?.email || '',
      },
    };
  }

  /**
   * Get aggregated booking pipeline statistics
   */
  static async getBookingPipelineSummary(studioId: string): Promise<BookingPipelineSummaryDTO> {
    const [leadsCount, proposals, contracts, bookedProjects] = await Promise.all([
      prisma.studioLead.count({
        where: { studio_id: studioId, deleted_at: null },
      }),
      prisma.studioProposal.findMany({
        where: { studio_id: studioId, deleted_at: null },
        select: { status: true, total_amount: true },
      }),
      prisma.studioContract.findMany({
        where: { studio_id: studioId, deleted_at: null },
        select: { status: true },
      }),
      prisma.studioProject.findMany({
        where: {
          studio_id: studioId,
          status: { in: [StudioProjectStatus.BOOKED, StudioProjectStatus.IN_PROGRESS, StudioProjectStatus.COMPLETED] },
          deleted_at: null,
        },
        select: { total_amount: true },
      }),
    ]);

    const proposalsByStatus: Record<StudioProposalStatus, number> = {
      [StudioProposalStatus.DRAFT]: 0,
      [StudioProposalStatus.SENT]: 0,
      [StudioProposalStatus.VIEWED]: 0,
      [StudioProposalStatus.ACCEPTED]: 0,
      [StudioProposalStatus.REJECTED]: 0,
      [StudioProposalStatus.EXPIRED]: 0,
      [StudioProposalStatus.SUPERSEDED]: 0,
      [StudioProposalStatus.VOID]: 0,
    };

    let totalProposalValue = 0;
    let activeProposals = 0;

    proposals.forEach((p: any) => {
      const st = p.status as StudioProposalStatus;
      if (proposalsByStatus[st] !== undefined) {
        proposalsByStatus[st]++;
      }
      if (st === StudioProposalStatus.SENT || st === StudioProposalStatus.VIEWED || st === StudioProposalStatus.ACCEPTED) {
        totalProposalValue += p.total_amount || 0;
      }
      if (st === StudioProposalStatus.SENT || st === StudioProposalStatus.VIEWED) {
        activeProposals++;
      }
    });

    const contractsByStatus: Record<StudioContractStatus, number> = {
      [StudioContractStatus.DRAFT]: 0,
      [StudioContractStatus.SENT]: 0,
      [StudioContractStatus.VIEWED]: 0,
      [StudioContractStatus.SIGNED]: 0,
      [StudioContractStatus.REJECTED]: 0,
      [StudioContractStatus.EXPIRED]: 0,
      [StudioContractStatus.VOID]: 0,
    };

    let pendingContracts = 0;

    contracts.forEach((c: any) => {
      const st = c.status as StudioContractStatus;
      if (contractsByStatus[st] !== undefined) {
        contractsByStatus[st]++;
      }
      if (st === StudioContractStatus.SENT || st === StudioContractStatus.VIEWED) {
        pendingContracts++;
      }
    });

    const bookedCount = bookedProjects.length;
    const totalBookedRevenue = bookedProjects.reduce((sum, p) => sum + (Number(p.total_amount) || 0), 0);
    const conversionRatePct = leadsCount > 0 ? Math.round((bookedCount / leadsCount) * 100) : 0;

    return {
      total_leads: leadsCount,
      total_proposals: proposals.length,
      total_contracts: contracts.length,
      total_booked_projects: bookedCount,
      booked_projects: bookedCount,
      total_booked_revenue: totalBookedRevenue,
      total_revenue: totalBookedRevenue,
      active_proposals: activeProposals,
      pending_contracts: pendingContracts,
      confirmed_bookings: bookedCount,
      total_proposal_value: totalProposalValue,
      total_contract_value: totalBookedRevenue,
      conversion_rate_pct: conversionRatePct,
      proposals_by_status: proposalsByStatus,
      contracts_by_status: contractsByStatus,
    };
  }
}
