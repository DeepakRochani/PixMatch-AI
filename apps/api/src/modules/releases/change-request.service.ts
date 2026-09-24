import { prisma } from '@pixmatch/database';
import {
  PlatformChangeRequestDTO,
  PlatformChangeApprovalDTO,
  ChangeRequestType,
  ChangeRequestStatus,
  ChangeRiskLevel,
  ChangeApprovalDecision,
  PlatformEnvironment,
} from '@pixmatch/types';
import { FeatureFlagService } from './feature-flag.service.js';
import { ConfigurationService } from './configuration.service.js';

export class ChangeRequestService {
  private static memoryRequests = new Map<string, PlatformChangeRequestDTO>();

  public static clearMockState(): void {
    this.memoryRequests.clear();
  }

  /**
   * Generates impact analysis for a resource change.
   */
  public static calculateImpactAnalysis(
    resourceKey: string,
    type: ChangeRequestType
  ): {
    affected_services: string[];
    affected_routes: string[];
    affected_flags: string[];
    affected_configurations: string[];
    estimated_blast_radius: 'LOW' | 'MEDIUM' | 'HIGH' | 'PLATFORM_WIDE';
  } {
    const services = ['api-gateway', 'web-app'];
    const routes = ['/api/v1/*'];
    let blastRadius: 'LOW' | 'MEDIUM' | 'HIGH' | 'PLATFORM_WIDE' = 'LOW';

    if (resourceKey.includes('auth') || resourceKey.includes('security') || resourceKey.includes('mfa')) {
      services.push('auth-service', 'admin-portal');
      routes.push('/api/auth/*', '/admin/login');
      blastRadius = 'HIGH';
    } else if (resourceKey.includes('payment') || resourceKey.includes('stripe') || resourceKey.includes('invoice') || resourceKey.includes('webhook')) {
      services.push('billing-service', 'invoicing-service', 'webhook-listener');
      routes.push('/api/invoices/*', '/api/payments/*');
      blastRadius = 'PLATFORM_WIDE';
    } else if (resourceKey.includes('ai') || resourceKey.includes('face') || resourceKey.includes('culling') || resourceKey.includes('queue')) {
      services.push('ai-worker-pool', 'vector-index', 'processing-service');
      routes.push('/api/photos/face-search', '/api/culling/*');
      blastRadius = 'MEDIUM';
    }

    return {
      affected_services: services,
      affected_routes: routes,
      affected_flags: type === ChangeRequestType.FEATURE_FLAG ? [resourceKey] : [],
      affected_configurations: type === ChangeRequestType.CONFIGURATION ? [resourceKey] : [],
      estimated_blast_radius: blastRadius,
    };
  }

  /**
   * Submits a new change request.
   */
  public static async createChangeRequest(
    input: {
      type: ChangeRequestType;
      title: string;
      description: string;
      target_resource_id?: string;
      target_resource_key: string;
      target_version: number;
      environment?: PlatformEnvironment;
      risk_level?: ChangeRiskLevel;
      diff_payload: Record<string, any>;
      scheduled_at?: Date;
      expires_in_hours?: number;
    },
    requesterId: string,
    requesterEmail?: string
  ): Promise<PlatformChangeRequestDTO> {
    const env = input.environment || PlatformEnvironment.PRODUCTION;
    const risk = input.risk_level || ChangeRiskLevel.LOW;
    const requiresTwoPerson = risk === ChangeRiskLevel.CRITICAL;

    const expiresInHours = input.expires_in_hours || 24;
    const expiresAt = new Date(Date.now() + expiresInHours * 3600 * 1000);

    const impact = this.calculateImpactAnalysis(input.target_resource_key, input.type);

    const changeDTO: PlatformChangeRequestDTO = {
      id: `cr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: input.type,
      title: input.title,
      description: input.description,
      target_resource_id: input.target_resource_id || null,
      target_resource_key: input.target_resource_key,
      target_version: input.target_version,
      environment: env,
      risk_level: risk,
      status: ChangeRequestStatus.PENDING_APPROVAL,
      requested_by: requesterId,
      requested_by_email: requesterEmail,
      requested_at: new Date(),
      scheduled_at: input.scheduled_at || null,
      expires_at: expiresAt,
      diff_payload: input.diff_payload,
      impact_analysis: impact,
      approvals: [],
      requires_two_person_approval: requiresTwoPerson,
      created_at: new Date(),
      updated_at: new Date(),
    };

    this.memoryRequests.set(changeDTO.id, changeDTO);
    return changeDTO;
  }

  /**
   * Retrieves a change request by ID.
   */
  public static async getChangeRequest(id: string): Promise<PlatformChangeRequestDTO | null> {
    return this.memoryRequests.get(id) || null;
  }

  /**
   * Lists change requests with optional filtering.
   */
  public static async listChangeRequests(filters?: {
    status?: ChangeRequestStatus;
    type?: ChangeRequestType;
    environment?: PlatformEnvironment;
    risk_level?: ChangeRiskLevel;
  }): Promise<PlatformChangeRequestDTO[]> {
    let list = Array.from(this.memoryRequests.values());

    if (filters?.status) list = list.filter((r) => r.status === filters.status);
    if (filters?.type) list = list.filter((r) => r.type === filters.type);
    if (filters?.environment) list = list.filter((r) => r.environment === filters.environment);
    if (filters?.risk_level) list = list.filter((r) => r.risk_level === filters.risk_level);

    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  /**
   * Submits an approval or rejection for a change request.
   * Enforces Separation of Duties & Two-Person Approval rules.
   */
  public static async submitApproval(
    requestId: string,
    decision: ChangeApprovalDecision,
    reason: string,
    approverId: string,
    approverEmail?: string
  ): Promise<PlatformChangeRequestDTO> {
    const request = await this.getChangeRequest(requestId);
    if (!request) throw new Error(`Change request '${requestId}' not found`);

    if (
      request.status !== ChangeRequestStatus.PENDING_APPROVAL &&
      request.status !== ChangeRequestStatus.DRAFT
    ) {
      throw new Error(`Cannot approve change request with status '${request.status}'`);
    }

    // Check approval expiration
    if (request.expires_at && new Date() > new Date(request.expires_at)) {
      request.status = ChangeRequestStatus.FAILED;
      throw new Error(`Change request '${requestId}' has expired and cannot be approved`);
    }

    // Separation of duties enforcement: requester cannot approve their own change request
    if (request.requested_by === approverId) {
      throw new Error('Separation of duties violation: Requester cannot approve their own change request');
    }

    // Check duplicate approval from same approver
    if (request.approvals.some((a) => a.approver_id === approverId)) {
      throw new Error('Approver has already submitted a decision for this change request');
    }

    const approvalDTO: PlatformChangeApprovalDTO = {
      id: `appr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      request_id: requestId,
      target_version: request.target_version,
      approver_id: approverId,
      approver_email: approverEmail,
      decision,
      reason,
      decided_at: new Date(),
    };

    request.approvals.push(approvalDTO);
    request.updated_at = new Date();

    if (decision === ChangeApprovalDecision.REJECTED) {
      request.status = ChangeRequestStatus.FAILED;
    } else {
      // If critical, requires 2 distinct approvers
      if (request.requires_two_person_approval) {
        const approvedCount = request.approvals.filter((a) => a.decision === ChangeApprovalDecision.APPROVED).length;
        if (approvedCount >= 2) {
          request.status = request.scheduled_at ? ChangeRequestStatus.SCHEDULED : ChangeRequestStatus.APPROVED;
        }
      } else {
        request.status = request.scheduled_at ? ChangeRequestStatus.SCHEDULED : ChangeRequestStatus.APPROVED;
      }
    }

    this.memoryRequests.set(request.id, request);
    return request;
  }

  /**
   * Helper alias for approveChangeRequest.
   */
  public static async approveChangeRequest(
    requestId: string,
    approverId: string,
    approverEmail?: string,
    decision: ChangeApprovalDecision = ChangeApprovalDecision.APPROVED,
    reason?: string
  ): Promise<PlatformChangeRequestDTO> {
    return await this.submitApproval(
      requestId,
      decision,
      reason || 'Change request approved',
      approverId,
      approverEmail
    );
  }

  /**
   * Executes an approved change request.
   */
  public static async executeChangeRequest(
    requestId: string,
    executorAdminId: string
  ): Promise<PlatformChangeRequestDTO> {
    const request = await this.getChangeRequest(requestId);
    if (!request) throw new Error(`Change request '${requestId}' not found`);

    if (
      request.status !== ChangeRequestStatus.APPROVED &&
      request.status !== ChangeRequestStatus.SCHEDULED
    ) {
      throw new Error(`Cannot execute change request: Status must be APPROVED (currently ${request.status})`);
    }

    // Check expiry
    if (request.expires_at && new Date() > new Date(request.expires_at)) {
      request.status = ChangeRequestStatus.FAILED;
      throw new Error(`Approval for change request '${requestId}' has expired`);
    }

    // Check Two-Person Approval for CRITICAL
    if (request.requires_two_person_approval) {
      const validApprovals = request.approvals.filter((a) => a.decision === ChangeApprovalDecision.APPROVED);
      if (validApprovals.length < 2) {
        throw new Error(`Critical change request requires 2 independent approvals, only has ${validApprovals.length}`);
      }
    }

    request.status = ChangeRequestStatus.EXECUTING;

    try {
      if (request.type === ChangeRequestType.FEATURE_FLAG || (request.type as any) === 'FEATURE_FLAG_UPDATE') {
        await FeatureFlagService.updateFeatureFlag(
          request.target_resource_key,
          request.diff_payload,
          `Executed Change Request: ${request.title}`,
          executorAdminId
        );
      } else if (request.type === ChangeRequestType.CONFIGURATION || (request.type as any) === 'CONFIGURATION_UPDATE') {
        await ConfigurationService.updateConfiguration(
          request.target_resource_key,
          request.diff_payload.new_value !== undefined ? request.diff_payload.new_value : request.diff_payload.new,
          request.environment,
          `Executed Change Request: ${request.title}`,
          executorAdminId
        );
      }

      request.status = ChangeRequestStatus.COMPLETED;
      request.executed_at = new Date();
      request.executed_by = executorAdminId;
      request.updated_at = new Date();
    } catch (err: any) {
      request.status = ChangeRequestStatus.FAILED;
      request.updated_at = new Date();
      throw new Error(`Failed to execute change request: ${err.message}`);
    }

    this.memoryRequests.set(request.id, request);
    return request;
  }

  /**
   * Cancels a pending or scheduled change request.
   */
  public static async cancelChangeRequest(
    requestId: string,
    reason: string,
    actorAdminId: string
  ): Promise<PlatformChangeRequestDTO> {
    const request = await this.getChangeRequest(requestId);
    if (!request) throw new Error(`Change request '${requestId}' not found`);

    if (
      request.status !== ChangeRequestStatus.DRAFT &&
      request.status !== ChangeRequestStatus.PENDING_APPROVAL &&
      request.status !== ChangeRequestStatus.APPROVED &&
      request.status !== ChangeRequestStatus.SCHEDULED
    ) {
      throw new Error(`Cannot cancel change request in state '${request.status}'`);
    }

    request.status = ChangeRequestStatus.CANCELLED;
    request.cancelled_at = new Date();
    request.cancellation_reason = reason;
    request.updated_at = new Date();

    this.memoryRequests.set(request.id, request);
    return request;
  }
}
