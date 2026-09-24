/**
 * Public Portal Service — PixMatch AI Phase 21
 * Token-authenticated, zero-friction client portal for reviewing/accepting proposals, e-signing contracts, and checking bookings.
 */

import crypto from 'crypto';
import { prisma } from '@pixmatch/database';
import {
  StudioProposalStatus,
  StudioContractStatus,
  StudioProjectStatus,
  ProposalPublicViewDTO,
  ProposalAcceptRequestDTO,
  ProposalRejectRequestDTO,
  ContractPublicViewDTO,
  ContractSignRequestDTO,
  ContractRejectRequestDTO,
  PublicBookingViewDTO,
} from '@pixmatch/types';
import { ProposalService } from './proposal.service.js';
import { ContractService } from './contract.service.js';
import { EmailService } from '../../services/email/email.service.js';

export class PublicPortalService {
  /**
   * Helper: Hash raw token with SHA-256
   */
  private static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token.trim()).digest('hex');
  }

  /**
   * 1. Get Public Proposal
   */
  static async getProposalByToken(
    rawToken: string,
    clientIp?: string,
    userAgent?: string
  ): Promise<ProposalPublicViewDTO> {
    if (!rawToken?.trim()) {
      throw new Error('Valid proposal token is required');
    }

    const tokenHash = this.hashToken(rawToken);

    const proposal = await prisma.studioProposal.findFirst({
      where: {
        public_token_hash: tokenHash,
        deleted_at: null,
      },
      include: {
        studio: {
          select: { id: true, name: true, slug: true, email: true, phone: true, address: true, logo_url: true, website: true },
        },
        client: {
          select: { id: true, name: true, email: true, phone: true, company: true },
        },
        items: {
          orderBy: { sort_order: 'asc' },
        },
        contracts: {
          where: { deleted_at: null },
          take: 1,
        },
      },
    });

    if (!proposal) {
      throw new Error('Proposal not found or link has expired');
    }

    // Check expiration
    if (proposal.token_expires_at && new Date() > proposal.token_expires_at) {
      if (proposal.status === StudioProposalStatus.SENT || proposal.status === StudioProposalStatus.VIEWED) {
        await prisma.studioProposal.update({
          where: { id: proposal.id },
          data: { status: StudioProposalStatus.EXPIRED },
        });
      }
      throw new Error('This proposal link has expired. Please contact the studio for an updated proposal.');
    }

    // Record view tracking
    const updateData: any = {
      view_count: { increment: 1 },
    };
    if (!proposal.viewed_at) {
      updateData.viewed_at = new Date();
      proposal.viewed_at = updateData.viewed_at;
    }
    if (proposal.status === StudioProposalStatus.SENT) {
      updateData.status = StudioProposalStatus.VIEWED;
      proposal.status = StudioProposalStatus.VIEWED;
    }
    proposal.view_count = (proposal.view_count || 0) + 1;

    await prisma.studioProposal.update({
      where: { id: proposal.id },
      data: updateData,
    });

    // Log client activity if first view
    if (!proposal.viewed_at) {
      try {
        await prisma.clientActivity.create({
          data: {
            client_id: proposal.client_id,
            studio_id: proposal.studio_id,
            activity_type: 'PROPOSAL_VIEWED',
            description: `Client viewed proposal #${proposal.proposal_number}`,
            metadata: { proposal_id: proposal.id, ip: clientIp, user_agent: userAgent },
          },
        });
      } catch (err) {
        console.warn('Failed to log proposal viewed activity:', err);
      }
    }

    const linkedContract = proposal.contracts && proposal.contracts.length > 0 ? proposal.contracts[0] : null;

    return {
      proposal: ProposalService.mapToDTO(proposal),
      studio: {
        id: proposal.studio.id,
        name: proposal.studio.name,
        slug: proposal.studio.slug,
        website: proposal.studio.website,
        logo_url: proposal.studio.logo_url,
        email: proposal.studio.email,
        phone: proposal.studio.phone,
        address: proposal.studio.address,
      },
      client: {
        id: proposal.client.id,
        name: proposal.client.name,
        full_name: proposal.client.name,
        email: proposal.client.email,
        phone: proposal.client.phone,
        company_name: proposal.client.company,
      },
      has_contract: !!linkedContract,
      contract_token: linkedContract ? rawToken : null,
    };
  }

  /**
   * 2. Accept Public Proposal
   */
  static async acceptProposalByToken(
    rawToken: string,
    data: ProposalAcceptRequestDTO,
    clientIp?: string,
    userAgent?: string
  ): Promise<ProposalPublicViewDTO> {
    if (!data.client_name?.trim()) {
      throw new Error('Your name is required to accept the proposal');
    }

    const tokenHash = this.hashToken(rawToken);

    const proposal = await prisma.studioProposal.findFirst({
      where: { public_token_hash: tokenHash, deleted_at: null },
      include: {
        items: true,
        client: true,
        studio: true,
        lead: true,
        contracts: { where: { deleted_at: null }, take: 1 },
      },
    });

    if (!proposal) {
      throw new Error('Proposal not found');
    }

    if (proposal.status === StudioProposalStatus.ACCEPTED) {
      // Already accepted
      return this.getProposalByToken(rawToken, clientIp, userAgent);
    }

    if (proposal.status === StudioProposalStatus.VOID || proposal.status === StudioProposalStatus.EXPIRED) {
      throw new Error(`Cannot accept a proposal in status: ${proposal.status}`);
    }

    // Handle optional item selections if customized
    let subtotal = 0;
    const optionalItemIds = (data as any).selected_optional_item_ids !== undefined
      ? (data as any).selected_optional_item_ids
      : data.selected_item_ids;

    if (optionalItemIds !== undefined) {
      const selectedSet = new Set(optionalItemIds);
      for (const item of proposal.items) {
        const isSelected = item.is_optional ? selectedSet.has(item.id) : true;
        if (isSelected) {
          subtotal += item.total_price;
        }
        await prisma.studioProposalItem.update({
          where: { id: item.id },
          data: { is_selected: isSelected },
        });
      }
    } else {
      for (const item of proposal.items) {
        if (!item.is_optional || item.is_selected) {
          subtotal += item.total_price;
        }
      }
    }

    const totalAmount = Math.max(0, subtotal - proposal.discount_amount + proposal.tax_amount);

    const updatedMetadata = {
      ...((proposal.metadata as any) || {}),
      ...(data.notes ? { client_notes: data.notes } : {}),
    };

    // Update proposal status to ACCEPTED
    await prisma.studioProposal.update({
      where: { id: proposal.id },
      data: {
        status: StudioProposalStatus.ACCEPTED,
        subtotal,
        total_amount: totalAmount,
        accepted_at: new Date(),
        accepted_by_client_name: data.client_name.trim(),
        accepted_ip: clientIp || '127.0.0.1',
        notes: data.notes ? `${proposal.notes || ''}\nClient Acceptance Note: ${data.notes}`.trim() : proposal.notes,
        metadata: updatedMetadata,
      },
    });

    // Advance lead if linked
    if (proposal.lead_id) {
      try {
        await prisma.studioLead.update({
          where: { id: proposal.lead_id },
          data: { status: 'QUALIFIED' },
        });
      } catch (_) {}
    }

    // Log client activity
    try {
      await prisma.clientActivity.create({
        data: {
          client_id: proposal.client_id,
          studio_id: proposal.studio_id,
          activity_type: 'PROPOSAL_ACCEPTED',
          description: `Proposal #${proposal.proposal_number} accepted by ${data.client_name}`,
          metadata: { proposal_id: proposal.id, accepted_amount: totalAmount, ip: clientIp },
        },
      });
    } catch (_) {}

    // Notify photographer / studio
    if (proposal.studio.email) {
      try {
        await EmailService.sendEmail({
          to: proposal.studio.email,
          subject: `🎉 Proposal Accepted: #${proposal.proposal_number} by ${data.client_name}`,
          html: `<p>Great news! <strong>${data.client_name}</strong> has accepted proposal <strong>#${proposal.proposal_number}</strong> (${proposal.title}) for <strong>${proposal.currency} ${totalAmount.toLocaleString()}</strong>.</p>`,
          category: 'TRANSACTIONAL',
          studio_id: proposal.studio_id,
        });
      } catch (err) {
        console.warn('Failed to notify studio of accepted proposal:', err);
      }
    }

    return this.getProposalByToken(rawToken, clientIp, userAgent);
  }

  /**
   * 3. Reject Public Proposal
   */
  static async rejectProposalByToken(
    rawToken: string,
    data: ProposalRejectRequestDTO,
    clientIp?: string,
    userAgent?: string
  ): Promise<{ success: boolean; message: string }> {
    const tokenHash = this.hashToken(rawToken);

    const proposal = await prisma.studioProposal.findFirst({
      where: { public_token_hash: tokenHash, deleted_at: null },
    });

    if (!proposal) {
      throw new Error('Proposal not found');
    }

    await prisma.studioProposal.update({
      where: { id: proposal.id },
      data: {
        status: StudioProposalStatus.REJECTED,
        rejected_at: new Date(),
        rejection_reason: data.rejection_reason || 'Client declined proposal',
      },
    });

    try {
      await prisma.clientActivity.create({
        data: {
          client_id: proposal.client_id,
          studio_id: proposal.studio_id,
          activity_type: 'PROPOSAL_REJECTED',
          description: `Proposal #${proposal.proposal_number} was rejected by client`,
          metadata: { proposal_id: proposal.id, reason: data.rejection_reason },
        },
      });
    } catch (_) {}

    return { success: true, message: 'Proposal rejected successfully' };
  }

  /**
   * 4. Get Public Contract
   */
  static async getContractByToken(
    rawToken: string,
    clientIp?: string,
    userAgent?: string
  ): Promise<ContractPublicViewDTO> {
    if (!rawToken?.trim()) {
      throw new Error('Valid contract token is required');
    }

    const tokenHash = this.hashToken(rawToken);

    const contract: any = await prisma.studioContract.findFirst({
      where: {
        portal_token_hash: tokenHash,
      },
      include: {
        studio: {
          select: { id: true, name: true, slug: true, email: true, phone: true, address: true, logo_url: true, website: true },
        },
        client: {
          select: { id: true, name: true, email: true, phone: true, company: true },
        },
        project: {
          select: { id: true, name: true, status: true, start_date: true, location: true },
        },
        proposal: {
          select: { id: true, proposal_number: true, title: true, total_amount: true, status: true },
        },
      },
    });

    if (!contract) {
      throw new Error('Contract not found or link has expired');
    }

    // Update view tracking
    const updateData: any = {};
    if (!contract.viewed_at) {
      updateData.viewed_at = new Date();
    }
    if (contract.status === StudioContractStatus.SENT) {
      updateData.status = StudioContractStatus.VIEWED;
    }

    await prisma.studioContract.update({
      where: { id: contract.id },
      data: updateData,
    });

    // Log client activity if first view
    if (!contract.viewed_at) {
      try {
        await prisma.clientActivity.create({
          data: {
            client_id: contract.client_id,
            studio_id: contract.studio_id,
            activity_type: 'CONTRACT_VIEWED',
            description: `Client viewed contract #${contract.contract_number}`,
            metadata: { contract_id: contract.id, ip: clientIp, user_agent: userAgent },
          },
        });
      } catch (_) {}
    }

    return {
      contract: ContractService.mapToDTO(contract),
      studio: {
        id: contract.studio.id,
        name: contract.studio.name,
        slug: contract.studio.slug,
        website: contract.studio.website,
        logo_url: contract.studio.logo_url,
        email: contract.studio.email,
        phone: contract.studio.phone,
        address: contract.studio.address,
      },
      client: {
        id: contract.client.id,
        full_name: contract.client.name,
        email: contract.client.email,
        phone: contract.client.phone,
        company_name: contract.client.company,
      },
      proposal_token: contract.proposal_id ? rawToken : null,
      booking_token: contract.project_id ? rawToken : null,
    };
  }

  /**
   * 5. Sign Public Contract (Immutable E-Signature with SHA-256 integrity hash)
   */
  static async signContractByToken(
    rawToken: string,
    data: ContractSignRequestDTO,
    clientIp?: string,
    userAgent?: string
  ): Promise<ContractPublicViewDTO> {
    const signerName = (data.full_legal_name || (data as any).signer_legal_name)?.trim();
    const signerEmail = (data.email || (data as any).signer_email)?.trim();

    if (!signerName) {
      throw new Error('Full legal name is required to sign');
    }
    if (!signerEmail) {
      throw new Error('Email address is required to sign');
    }
    if (!data.agreed_to_terms) {
      throw new Error('You must agree to the contract terms to proceed');
    }

    const tokenHash = this.hashToken(rawToken);

    const contract: any = await prisma.studioContract.findFirst({
      where: { portal_token_hash: tokenHash },
      include: {
        client: true,
        studio: true,
        project: true,
        proposal: true,
      },
    });

    if (!contract) {
      throw new Error('Contract not found');
    }

    if (contract.status === StudioContractStatus.SIGNED) {
      // Already signed, return view
      return this.getContractByToken(rawToken, clientIp, userAgent);
    }

    if (contract.status === StudioContractStatus.REJECTED) {
      throw new Error(`Cannot sign contract in status: ${contract.status}`);
    }

    const ip = (data as any).signature_ip || clientIp || '127.0.0.1';
    const ua = (data as any).signature_user_agent || userAgent || 'Unknown Browser';

    // Construct cryptographic audit payload and SHA-256 hash
    const timestamp = new Date().toISOString();
    const payload = `${contract.version}:${contract.contract_number}:${(contract.content || contract.body_content || '').slice(0, 100)}:${signerName}:${signerEmail}:${timestamp}:${ip}`;
    const signatureHash = crypto.createHash('sha256').update(payload).digest('hex');

    // Run atomic update
    await prisma.$transaction(async (tx: any) => {
      await tx.studioContract.update({
        where: { id: contract.id },
        data: {
          status: StudioContractStatus.SIGNED,
          signed_at: new Date(),
          signed_by_name: signerName,
          signed_by_email: signerEmail,
          signature_ip: ip,
          signature_user_agent: ua,
          signature_hash: signatureHash,
        },
      });

      // If linked project is in DRAFT/INQUIRY, advance to BOOKED
      if (contract.project_id) {
        await tx.studioProject.update({
          where: { id: contract.project_id },
          data: { status: StudioProjectStatus.BOOKED },
        });
      }
    });

    // Log client activity
    try {
      await prisma.clientActivity.create({
        data: {
          client_id: contract.client_id,
          studio_id: contract.studio_id,
          activity_type: 'CONTRACT_SIGNED',
          description: `Contract #${contract.contract_number} signed by ${signerName}`,
          metadata: { contract_id: contract.id, signature_hash: signatureHash, ip },
        },
      });
    } catch (_) {}

    // Notify photographer / studio
    if (contract.studio?.email) {
      try {
        await EmailService.sendEmail({
          to: contract.studio.email,
          subject: `🖋️ Contract Signed: #${contract.contract_number} by ${signerName}`,
          html: `<p>Awesome! <strong>${signerName}</strong> has signed contract <strong>#${contract.contract_number}</strong> (${contract.title}).</p>
          <p>Signature Verification Hash: <code>${signatureHash}</code></p>`,
        });
      } catch (err) {
        console.warn('Failed to notify studio of signed contract:', err);
      }
    }

    return this.getContractByToken(rawToken, clientIp, userAgent);
  }

  /**
   * 6. Reject Public Contract
   */
  static async rejectContractByToken(
    rawToken: string,
    data: ContractRejectRequestDTO
  ): Promise<any> {
    const tokenHash = this.hashToken(rawToken);

    const contract = await prisma.studioContract.findFirst({
      where: {
        OR: [
          { portal_token_hash: tokenHash },
          { public_token_hash: tokenHash } as any,
        ],
      } as any,
    });

    if (!contract) {
      throw new Error('Contract not found');
    }

    const rejectionReason = data.rejection_reason || (data as any).reason || 'Client declined contract terms';

    const updated = await prisma.studioContract.update({
      where: { id: contract.id },
      data: {
        status: StudioContractStatus.REJECTED,
        rejected_at: new Date(),
        rejection_reason: rejectionReason,
        declined_at: new Date(),
        decline_reason: rejectionReason,
      },
    });

    try {
      await prisma.clientActivity.create({
        data: {
          client_id: contract.client_id,
          studio_id: contract.studio_id,
          activity_type: 'CONTRACT_REJECTED',
          description: `Contract #${contract.contract_number} was rejected by client`,
          metadata: { contract_id: contract.id, reason: rejectionReason },
        },
      });
    } catch (_) {}

    return {
      success: true,
      message: 'Contract rejected successfully',
      status: StudioContractStatus.REJECTED,
      rejection_reason: rejectionReason,
      ...(ContractService.mapToDTO(updated) as any),
    };
  }

  /**
   * 7. Get Public Booking Summary
   */
  static async getBookingByToken(rawToken: string): Promise<PublicBookingViewDTO> {
    if (!rawToken?.trim()) {
      throw new Error('Valid booking token is required');
    }

    const tokenHash = this.hashToken(rawToken);

    // 1. Try finding project directly via metadata.booking_public_token
    const candidateProjects = await prisma.studioProject.findMany({
      where: { deleted_at: null },
      include: {
        studio: true,
        client: true,
        payment_schedules: { orderBy: { due_date: 'asc' } },
        contracts: { orderBy: { created_at: 'desc' }, take: 1 },
        proposals: { orderBy: { created_at: 'desc' }, take: 1 },
      },
    });

    let foundProject: any = candidateProjects.find((p: any) => {
      const meta = p.metadata as any;
      return meta?.booking_public_token === rawToken || meta?.booking_public_token_hash === tokenHash;
    });

    let foundProposal: any = foundProject?.proposals?.[0] || null;
    let foundContract: any = foundProject?.contracts?.[0] || null;
    let foundStudio: any = foundProject?.studio || null;
    let foundClient: any = foundProject?.client || null;

    // 2. If not found via project metadata, try proposal token
    if (!foundProject) {
      const prop: any = await prisma.studioProposal.findFirst({
        where: { portal_token_hash: tokenHash },
        include: {
          studio: true,
          client: true,
          project: {
            include: {
              payment_schedules: { orderBy: { due_date: 'asc' } },
              contracts: { take: 1 },
            },
          },
          contracts: { take: 1 },
        },
      });

      if (prop && prop.project) {
        foundProject = prop.project;
        foundProposal = prop;
        foundContract = prop.project.contracts?.[0] || prop.contracts?.[0] || null;
        foundStudio = prop.studio;
        foundClient = prop.client;
      }
    }

    // 3. If still not found, try contract token
    if (!foundProject) {
      const cont: any = await prisma.studioContract.findFirst({
        where: { portal_token_hash: tokenHash },
        include: {
          studio: true,
          client: true,
          project: {
            include: {
              payment_schedules: { orderBy: { due_date: 'asc' } },
            },
          },
          proposal: true,
        },
      });

      if (cont && cont.project) {
        foundProject = cont.project;
        foundContract = cont;
        foundProposal = cont.proposal;
        foundStudio = cont.studio;
        foundClient = cont.client;
      }
    }

    if (!foundProject || !foundStudio || !foundClient) {
      throw new Error('Booking details not found or invalid link');
    }

    const schedules = (foundProject.payment_schedules || []).map((s: any) => ({
      installment_number: s.installment_number,
      title: s.title,
      due_date: s.due_date,
      amount: s.amount,
      currency: s.currency,
      status: s.status as any,
      paid_amount: s.paid_amount,
      paid_at: s.paid_at,
    }));

    const projectPayload = {
      id: foundProject.id,
      title: foundProject.title,
      project_type: foundProject.project_type as any,
      status: foundProject.status as any,
      start_date: foundProject.start_date,
      end_date: foundProject.end_date,
      location: foundProject.location,
    };

    const proposalPayload = foundProposal ? {
      id: foundProposal.id,
      proposal_number: foundProposal.proposal_number,
      total_amount: foundProposal.total_amount,
      currency: foundProposal.currency,
      status: foundProposal.status as any,
    } : null;

    const contractPayload = foundContract ? {
      id: foundContract.id,
      contract_number: foundContract.contract_number,
      status: foundContract.status as any,
      signed_at: foundContract.signed_at,
      signed_by_name: foundContract.signed_by_name,
      signature_hash: foundContract.signature_hash,
    } : null;

    return {
      project: projectPayload,
      proposal: proposalPayload,
      contract: contractPayload,
      schedules,
      payment_schedules: schedules,
      studio: {
        name: foundStudio.name,
        slug: foundStudio.slug,
        logo_url: foundStudio.logo_url,
        email: foundStudio.email,
        phone: foundStudio.phone,
      },
      client: {
        name: foundClient.name,
        full_name: foundClient.name,
        email: foundClient.email,
      },
      booking: {
        project: projectPayload,
        proposal: proposalPayload,
        contract: contractPayload,
        payment_schedules: schedules,
      },
    };
  }
}
