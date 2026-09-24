import { DataGovernanceService } from './data-governance.service.js';
import { PrivacyRetentionService } from './privacy-retention.service.js';
import { PrivacyLegalHoldService } from './privacy-legal-hold.service.js';
import { PrivacyRequestsService } from './privacy-requests.service.js';
import { PrivacyDeletionService } from './privacy-deletion.service.js';

export class PolicyViolationError extends Error {
  constructor(message: string) {
    super(`POLICY_VIOLATION: ${message}`);
    this.name = 'PolicyViolationError';
  }
}

export class PrivacyCopilotTools {
  // ==========================================
  // READ-ONLY DIAGNOSTIC TOOLS (13 TOOLS)
  // ==========================================

  static async getPrivacyOverviewMetrics() {
    return await DataGovernanceService.getOverviewMetrics();
  }

  static async listDataAssets(filter?: any) {
    return await DataGovernanceService.listDataAssets(filter);
  }

  static async getDataAssetDetail(assetIdOrKey: string) {
    const asset = await DataGovernanceService.getDataAssetById(assetIdOrKey);
    if (!asset) throw new Error(`Data asset [${assetIdOrKey}] not found.`);
    return asset;
  }

  static async getDataLineageGraph() {
    return await DataGovernanceService.getLineageGraph();
  }

  static async listRetentionPolicies() {
    return await PrivacyRetentionService.listPolicies();
  }

  static async evaluateRetentionRules() {
    return await PrivacyRetentionService.evaluateRetention();
  }

  static async listPrivacyRequests(filter?: any) {
    return await PrivacyRequestsService.listRequests(filter);
  }

  static async getPrivacyRequestDetail(requestId: string) {
    const req = await PrivacyRequestsService.getRequestById(requestId);
    if (!req) throw new Error(`Privacy request [${requestId}] not found.`);
    return req;
  }

  static async listLegalHolds(status?: any) {
    return await PrivacyLegalHoldService.listLegalHolds(status);
  }

  static async getLegalHoldDetail(holdId: string) {
    const hold = await PrivacyLegalHoldService.getLegalHoldById(holdId);
    if (!hold) throw new Error(`Legal hold [${holdId}] not found.`);
    return hold;
  }

  static async listAccessReviews() {
    return await DataGovernanceService.listAccessReviews();
  }

  static async getThirdPartyProviders() {
    return DataGovernanceService.listThirdPartyProviders();
  }

  static async getBiometricsGovernanceStatus() {
    return await DataGovernanceService.getBiometricsGovernanceMetrics();
  }

  // ==========================================
  // DRAFTING & RECOMMENDATION TOOLS (5 TOOLS)
  // ==========================================

  static async draftRetentionPolicyProposal(input: {
    name: string;
    classification: string;
    proposedDurationDays: number;
    businessNeed: string;
  }) {
    return {
      title: `Draft Retention Policy: ${input.name}`,
      classification: input.classification,
      proposedDurationDays: input.proposedDurationDays,
      recommendedAction: 'ANONYMIZE_OR_PURGE',
      suggestedLegalBasis: 'CONTRACT_PERFORMANCE_OR_STATUTORY',
      statutoryConflictCheck: input.classification === 'FINANCIAL' && input.proposedDurationDays < 2555
        ? 'WARNING: Financial records must be retained for at least 7 years (2555 days).'
        : 'PASS: Proposed duration meets minimum compliance baselines.',
      draftNotice: `Proposed policy '${input.name}' with ${input.proposedDurationDays}-day duration created for administrative review.`,
    };
  }

  static async draftPrivacyRequestResponse(input: {
    requestId: string;
    actionTaken: string;
    notes?: string;
  }) {
    const req = await PrivacyRequestsService.getRequestById(input.requestId);
    if (!req) throw new Error(`Privacy request [${input.requestId}] not found.`);

    return {
      requestId: req.id,
      recipientEmail: req.subjectEmail,
      subject: `Response to your Data Privacy ${req.requestType} Request - PixMatch AI`,
      body: `Dear ${req.subjectName || 'User'},\n\nWe have received and processed your privacy ${req.requestType.toLowerCase()} request.\n\nSummary of Actions:\n${input.actionTaken}\n\n${input.notes || ''}\n\nRegards,\nPixMatch AI Data Privacy & Governance Team`,
      readyForAdminReview: true,
    };
  }

  static async draftLegalHoldNotice(input: {
    caseNumber: string;
    custodian: string;
    reason: string;
    subjectEmail?: string;
  }) {
    return {
      caseNumber: input.caseNumber,
      custodian: input.custodian,
      subjectEmail: input.subjectEmail,
      noticeText: `CONFIDENTIAL LEGAL HOLD NOTICE\nCase: ${input.caseNumber}\nCustodian: ${input.custodian}\n\nNotice of Data Preservation Obligation: Effective immediately, all data assets, communications, and audit logs associated with this matter must be preserved in place. Automated deletion and retention purge routines are suspended for this entity.\n\nReason: ${input.reason}`,
      status: 'DRAFT_PENDING_COUNSEL_APPROVAL',
    };
  }

  static async draftDataAccessReviewChecklist(input: {
    assetCategory: string;
    scopeDescription: string;
  }) {
    return {
      category: input.assetCategory,
      scope: input.scopeDescription,
      checklistItems: [
        'Verify only active studio members possess read/write permissions.',
        'Ensure off-boarded contractor and assistant tokens are revoked.',
        'Confirm TLS 1.3 / AES-256 encryption configurations are active.',
        'Review cross-border data transfer logs and third-party vendor DPAs.',
        'Validate zero direct access to raw biometric face embedding tables.',
      ],
      generatedAt: new Date(),
    };
  }

  static async previewDataDeletionImpact(input: {
    subjectEmail: string;
    userId?: string;
    studioId?: string;
  }) {
    return await PrivacyDeletionService.previewDeletion(input);
  }

  // ==========================================
  // STRICTLY BLOCKED MUTATION TOOLS
  // ==========================================

  static async executeDataDeletionDirect() {
    throw new PolicyViolationError(
      'Autonomous deletion is strictly blocked by AI Safety & Governance policy. Deletions require explicit human administrator review, dependency graph verification, and authenticated approval.'
    );
  }

  static async releaseLegalHoldDirect() {
    throw new PolicyViolationError(
      'Autonomous release of legal holds is strictly prohibited. Legal holds must be reviewed and released through the authorized administrative console by legal counsel.'
    );
  }

  static async overrideRetentionPolicyDirect() {
    throw new PolicyViolationError(
      'Autonomous retention policy overrides are blocked. Modifications to statutory data retention rules require multi-factor administrative change approval.'
    );
  }
}
