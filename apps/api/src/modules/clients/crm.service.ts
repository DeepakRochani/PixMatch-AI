/**
 * CRM 2.0 Service — PIXMatch AI Phase 29
 * Studio CRM & Client Relationship Intelligence 2.0
 * 
 * Provides unified client intelligence, lead-to-client conversion,
 * candidate duplicate detection, safe transactional client merges,
 * multi-category chronological timeline, follow-up center, custom fields,
 * operational health indicators, and CSV formula injection-safe export.
 */

import {
  prisma,
  ClientStatus,
  ClientRelationshipStatus,
  ClientLifecycleStage,
  ClientCustomFieldType,
  ClientImportantDateType,
  StudioLeadStatus,
  StudioProjectType,
  StudioProjectStatus,
  Prisma,
} from '@pixmatch/database';
import {
  IClient360ComprehensiveDTO,
  IClientTimelineItemDTO,
  IClientTimelineFilterDTO,
  IDuplicateCandidateMatch,
  IDuplicateDetectionResult,
  IClientMergePreviewDTO,
  IClientMergeExecuteDTO,
  IClientCustomFieldDefinitionDTO,
  IClientCustomFieldValueDTO,
  IClientImportantDateDTO,
  IClientNoteDTO,
  IFollowUpCenterItemDTO,
  IFollowUpCenterSummaryDTO,
  IPendingActionItemDTO,
  IClientFinancialIntelligenceDTO,
  IClientHealthIndicatorsDTO,
  ILeadToClientConversionDTO,
  IClientBulkActionDTO,
  TimelineCategory,
} from '@pixmatch/types';

// Helper for string sanitization (preventing XSS & code injection)
function sanitizeText(input: any): string {
  if (input === null || input === undefined) return '';
  if (typeof input !== 'string') return String(input);
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/[<>]/g, '')
    .trim();
}

// Helper for CSV formula injection mitigation
function escapeCsvValue(val: any): string {
  if (val === null || val === undefined) return '""';
  let str = String(val);
  // Neutralize CSV formula execution triggers: =, +, -, @, \t, \r
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

// Phone normalization helper
function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length > 10 && (digits.startsWith('1') || digits.startsWith('91'))) {
    return digits.slice(-10);
  }
  return digits;
}

// Name similarity score helper (Levenshtein distance based)
function calculateStringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;

  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  const longerLength = longer.length;
  if (longerLength === 0) return 1.0;

  const costs: number[] = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  const editDistance = costs[s2.length];
  return (longerLength - editDistance) / longerLength;
}

export class CRMService {
  private db: typeof prisma;
  private activeLocks = new Set<string>();

  constructor(dbClient: typeof prisma = prisma) {
    this.db = dbClient;
  }

  private async withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    while (this.activeLocks.has(key)) {
      await new Promise((r) => setTimeout(r, 10));
    }
    this.activeLocks.add(key);
    try {
      return await fn();
    } finally {
      this.activeLocks.delete(key);
    }
  }

  // =========================================================================
  // 1. LEAD -> CLIENT CONVERSION (IDEMPOTENT & DEDUPLICATED)
  // =========================================================================
  async convertLeadToClient(
    studioId: string,
    dto: ILeadToClientConversionDTO,
    userId?: string
  ): Promise<{ client: any; project?: any; is_new_client: boolean }> {
    return await this.withLock(`lead_convert:${studioId}:${dto.lead_id}`, async () => {
      const lead = await this.db.studioLead.findFirst({
        where: { id: dto.lead_id, studio_id: studioId, deleted_at: null },
      });

      if (!lead) {
        throw new Error(`Lead with ID ${dto.lead_id} not found in this studio`);
      }

      // Check if lead was already converted
      if (lead.client_id) {
        const existingClient = await this.db.client.findFirst({
          where: { id: lead.client_id, studio_id: studioId },
        });
        if (existingClient) {
          return { client: existingClient, is_new_client: false };
        }
      }

    const emailToUse = (dto.email || lead.email || '').toLowerCase().trim();
    const phoneToUse = dto.phone || lead.phone || null;
    const nameToUse = dto.name || lead.name;

    // Deduplication check
    let client: any = null;
    if (emailToUse) {
      client = await this.db.client.findFirst({
        where: {
          studio_id: studioId,
          email: { equals: emailToUse, mode: 'insensitive' },
          deleted_at: null,
          status: { not: ClientStatus.MERGED },
        },
      });
    }

    if (!client && phoneToUse) {
      client = await this.db.client.findFirst({
        where: {
          studio_id: studioId,
          phone: phoneToUse,
          deleted_at: null,
          status: { not: ClientStatus.MERGED },
        },
      });
    }

    let isNewClient = false;
    if (!client) {
      const tags = Array.from(new Set(['LEAD_CONVERTED', ...(dto.tags || [])]));
      client = await this.db.client.create({
        data: {
          studio_id: studioId,
          name: nameToUse,
          email: emailToUse || `${nameToUse.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now()}@placeholder.client`,
          phone: phoneToUse,
          company: dto.company || null,
          notes: dto.notes ? sanitizeText(dto.notes) : lead.notes ? sanitizeText(lead.notes) : null,
          tags,
          status: ClientStatus.ACTIVE,
          relationship_status: ClientRelationshipStatus.ACTIVE,
          lifecycle_stage: dto.lifecycle_stage || ClientLifecycleStage.PROSPECT,
          source: lead.source || 'LEAD_CONVERSION',
          assigned_user_id: dto.assigned_user_id || lead.assigned_member_id || null,
          last_interaction_at: new Date(),
        },
      });
      isNewClient = true;

      // Create initial activity
      await this.db.clientActivity.create({
        data: {
          studio_id: studioId,
          client_id: client.id,
          activity_type: 'CLIENT_CREATED',
          description: `Client created from Lead: ${lead.name}`,
          metadata: { lead_id: lead.id, lead_source: lead.source },
        },
      });
    } else {
      // Update existing client relationship status and tags
      const currentTags = client.tags || [];
      const updatedTags = Array.from(new Set([...currentTags, 'LEAD_CONVERTED', ...(dto.tags || [])]));
      client = await this.db.client.update({
        where: { id: client.id },
        data: {
          tags: updatedTags,
          relationship_status:
            client.relationship_status === ClientRelationshipStatus.DORMANT
              ? ClientRelationshipStatus.RETURNING
              : client.relationship_status,
          lifecycle_stage:
            client.lifecycle_stage === ClientLifecycleStage.PROJECT_COMPLETED ||
            client.lifecycle_stage === ClientLifecycleStage.DORMANT_CLIENT
              ? ClientLifecycleStage.RETURNING_CLIENT
              : client.lifecycle_stage,
          last_interaction_at: new Date(),
        },
      });
    }

    // Mark Lead as WON and link client
    await this.db.studioLead.update({
      where: { id: lead.id },
      data: {
        status: StudioLeadStatus.WON,
        client_id: client.id,
      },
    });

    // Optional Project Creation
    let project: any = null;
    if (dto.create_project !== false) {
      const projectName =
        dto.project_name || `${lead.name} — ${dto.project_type || lead.service_type || 'Photography Project'}`;
      const projectType = (dto.project_type || StudioProjectType.OTHER) as StudioProjectType;

      project = await this.db.studioProject.create({
        data: {
          studio_id: studioId,
          client_id: client.id,
          lead_id: lead.id,
          name: projectName,
          project_type: projectType,
          status: StudioProjectStatus.BOOKED,
          estimated_value: lead.estimated_value || null,
          currency: lead.currency || 'INR',
        },
      });

      // Update client status to PROJECT_IN_PROGRESS while preserving PROSPECT or custom stage
      client = await this.db.client.update({
        where: { id: client.id },
        data: {
          relationship_status: ClientRelationshipStatus.PROJECT_IN_PROGRESS,
          lifecycle_stage: dto.lifecycle_stage || (isNewClient ? ClientLifecycleStage.PROSPECT : client.lifecycle_stage),
        },
      });
    }

      return { client, project, is_new_client: isNewClient };
    });
  }

  // =========================================================================
  // 2. DUPLICATE CLIENT DETECTION
  // =========================================================================
  async findDuplicateCandidates(
    studioId: string,
    query: { client_id?: string; email?: string; phone?: string; name?: string }
  ): Promise<IDuplicateDetectionResult> {
    const clients = await this.db.client.findMany({
      where: {
        studio_id: studioId,
        deleted_at: null,
        status: { not: ClientStatus.MERGED },
        ...(query.client_id ? { id: { not: query.client_id } } : {}),
      },
      include: {
        projects: { select: { id: true } },
        galleries: { select: { id: true } },
        fulfillment_orders: { select: { id: true } },
      },
    });

    const targetEmail = query.email ? query.email.toLowerCase().trim() : '';
    const targetPhone = normalizePhone(query.phone);
    const targetName = query.name ? query.name.toLowerCase().trim() : '';

    const matches: IDuplicateCandidateMatch[] = [];

    for (const c of clients) {
      const cEmail = c.email ? c.email.toLowerCase().trim() : '';
      const cPhone = normalizePhone(c.phone);
      const cName = c.name ? c.name.toLowerCase().trim() : '';

      const reasons: string[] = [];
      let isEmailMatch = false;
      let isPhoneMatch = false;
      let isNameMatch = false;
      let score = 0;

      // Exact email match (strong signal)
      if (targetEmail && cEmail === targetEmail) {
        isEmailMatch = true;
        score += 1.0;
        reasons.push('EXACT_EMAIL_MATCH');
        reasons.push(`Exact email match: ${c.email}`);
      }

      // Exact phone match (strong signal)
      if (targetPhone && cPhone && targetPhone === cPhone) {
        isPhoneMatch = true;
        score += 0.9;
        reasons.push('EXACT_PHONE_MATCH');
        reasons.push(`Exact phone match: ${c.phone}`);
      }

      // Name similarity match (medium signal)
      if (targetName && cName) {
        const similarity = calculateStringSimilarity(targetName, cName);
        if (similarity >= 0.8) {
          isNameMatch = true;
          score += similarity * 0.9;
          reasons.push('NAME_SIMILARITY');
          reasons.push(`High name similarity (${Math.round(similarity * 100)}%): "${c.name}"`);
        }
      }

      if (reasons.length > 0) {
        const finalScore = Math.min(1.0, Number(score.toFixed(2)));
        const matchScore = Math.min(100, Math.round(finalScore * 100));
        matches.push({
          client_id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          company: c.company,
          relationship_status: c.relationship_status,
          match_reasons: reasons,
          match_type: isEmailMatch ? 'EXACT_EMAIL' : isPhoneMatch ? 'EXACT_PHONE' : isNameMatch ? 'NAME_SIMILARITY' : 'OTHER',
          confidence_score: finalScore,
          match_score: matchScore,
          is_exact_email_match: isEmailMatch,
          is_exact_phone_match: isPhoneMatch,
          is_name_similarity_match: isNameMatch,
          projects_count: c.projects?.length || 0,
          galleries_count: c.galleries?.length || 0,
          orders_count: c.fulfillment_orders?.length || 0,
        });
      }
    }

    // Sort descending by confidence score
    matches.sort((a, b) => b.confidence_score - a.confidence_score);

    return {
      client_id: query.client_id,
      is_duplicate: matches.length > 0,
      has_duplicates: matches.length > 0,
      potential_duplicates: matches,
      candidates: matches,
      total_candidates: matches.length,
    };
  }

  // =========================================================================
  // 3. CLIENT MERGE (PREVIEW & TRANSACTIONAL EXECUTE)
  // =========================================================================
  async previewMerge(
    studioId: string,
    sourceClientId: string,
    targetClientId: string
  ): Promise<IClientMergePreviewDTO> {
    const validationErrors: string[] = [];

    if (sourceClientId === targetClientId) {
      validationErrors.push('Cannot merge client into itself');
    }

    const [sourceClient, targetClient] = await Promise.all([
      this.db.client.findFirst({
        where: { id: sourceClientId, studio_id: studioId },
      }),
      this.db.client.findFirst({
        where: { id: targetClientId, studio_id: studioId },
      }),
    ]);

    if (!sourceClient) {
      validationErrors.push(`Source client not found (${sourceClientId})`);
    } else if (sourceClient.status === ClientStatus.MERGED) {
      validationErrors.push(`Source client ${sourceClientId} has already been merged`);
    }

    if (!targetClient) {
      validationErrors.push(`Target client not found (${targetClientId})`);
    } else if (targetClient.status === ClientStatus.MERGED) {
      validationErrors.push(`Target client ${targetClientId} has already been merged`);
    }

    if (validationErrors.length > 0 || !sourceClient || !targetClient) {
      return {
        source_client: sourceClient
          ? {
              id: sourceClient.id,
              name: sourceClient.name,
              email: sourceClient.email,
              phone: sourceClient.phone,
              status: sourceClient.status,
              relationship_status: sourceClient.relationship_status,
            }
          : ({} as any),
        target_client: targetClient
          ? {
              id: targetClient.id,
              name: targetClient.name,
              email: targetClient.email,
              phone: targetClient.phone,
              status: targetClient.status,
              relationship_status: targetClient.relationship_status,
            }
          : ({} as any),
        affected_records: {
          projects: 0,
          galleries: 0,
          proofing_sessions: 0,
          fulfillment_orders: 0,
          conversations: 0,
          client_activities: 0,
          custom_field_values: 0,
          important_dates: 0,
          notes: 0,
          follow_ups: 0,
          proposals: 0,
          contracts: 0,
          booking_requests: 0,
          calendar_events: 0,
        },
        impact: {
          projects_to_relink: 0,
          galleries_to_relink: 0,
          proofing_sessions_to_relink: 0,
          orders_to_relink: 0,
          conversations_to_relink: 0,
          activities_to_relink: 0,
          notes_to_relink: 0,
          custom_fields_to_relink: 0,
          important_dates_to_relink: 0,
        },
        can_merge: false,
        validation_errors: validationErrors,
      };
    }

    // Count affected child dependencies for source client
    const [
      projectsCount,
      clientGalleriesCount,
      primaryGalleriesCount,
      proofingCount,
      ordersCount,
      conversationsCount,
      activitiesCount,
      customFieldsCount,
      importantDatesCount,
      notesCount,
      followUpsCount,
      proposalsCount,
      contractsCount,
      bookingRequestsCount,
      calendarEventsCount,
    ] = await Promise.all([
      this.db.studioProject.count({ where: { client_id: sourceClientId, studio_id: studioId } }),
      this.db.clientGallery.count({ where: { client_id: sourceClientId, studio_id: studioId } }),
      this.db.gallery.count({ where: { client_id: sourceClientId, studio_id: studioId } }),
      this.db.photoProofingSession.count({ where: { client_id: sourceClientId, studio_id: studioId } }),
      this.db.fulfillmentOrder.count({ where: { client_id: sourceClientId, studio_id: studioId } }),
      this.db.clientConversation.count({ where: { client_id: sourceClientId, studio_id: studioId } }),
      this.db.clientActivity.count({ where: { client_id: sourceClientId, studio_id: studioId } }),
      this.db.clientCustomFieldValue.count({ where: { client_id: sourceClientId, studio_id: studioId } }),
      this.db.clientImportantDate.count({ where: { client_id: sourceClientId, studio_id: studioId } }),
      this.db.clientNote.count({ where: { client_id: sourceClientId, studio_id: studioId } }),
      this.db.clientFollowUpRecommendation.count({ where: { client_id: sourceClientId, studio_id: studioId } }),
      this.db.studioProposal.count({ where: { client_id: sourceClientId, studio_id: studioId } }),
      this.db.studioContract.count({ where: { client_id: sourceClientId, studio_id: studioId } }),
      this.db.studioBookingRequest.count({ where: { client_id: sourceClientId, studio_id: studioId } }),
      this.db.studioCalendarEvent.count({ where: { client_id: sourceClientId, studio_id: studioId } }),
    ]);

    const galleriesCount = clientGalleriesCount + primaryGalleriesCount;

    return {
      source_client: {
        id: sourceClient.id,
        name: sourceClient.name,
        email: sourceClient.email,
        phone: sourceClient.phone,
        status: sourceClient.status,
        relationship_status: sourceClient.relationship_status,
      },
      target_client: {
        id: targetClient.id,
        name: targetClient.name,
        email: targetClient.email,
        phone: targetClient.phone,
        status: targetClient.status,
        relationship_status: targetClient.relationship_status,
      },
      affected_records: {
        projects: projectsCount,
        galleries: galleriesCount,
        proofing_sessions: proofingCount,
        fulfillment_orders: ordersCount,
        conversations: conversationsCount,
        client_activities: activitiesCount,
        custom_field_values: customFieldsCount,
        important_dates: importantDatesCount,
        notes: notesCount,
        follow_ups: followUpsCount,
        proposals: proposalsCount,
        contracts: contractsCount,
        booking_requests: bookingRequestsCount,
        calendar_events: calendarEventsCount,
      },
      impact: {
        projects_to_relink: projectsCount,
        galleries_to_relink: galleriesCount,
        proofing_sessions_to_relink: proofingCount,
        orders_to_relink: ordersCount,
        conversations_to_relink: conversationsCount,
        activities_to_relink: activitiesCount,
        notes_to_relink: notesCount,
        custom_fields_to_relink: customFieldsCount,
        important_dates_to_relink: importantDatesCount,
      },
      can_merge: true,
    };
  }

  async executeMerge(
    studioId: string,
    dto: IClientMergeExecuteDTO,
    userId?: string
  ): Promise<{ success: boolean; target_client: any; audit_log_id: string; affected_counts: any; merged_counts?: any }> {
    if (!dto.confirmed && (dto as any).confirmed !== undefined && !(dto as any).confirmed) {
      throw new Error('Explicit confirmation is required to execute a client merge');
    }

    if (dto.source_client_id === dto.target_client_id) {
      throw new Error('Cannot merge client into itself');
    }

    return await this.withLock(`merge:${studioId}:${dto.source_client_id}`, async () => {
      // Atomic transaction for safe merging
      return await this.db.$transaction(async (tx) => {
      // 1. Fetch & lock/validate source and target
      const sourceClient = await tx.client.findFirst({
        where: { id: dto.source_client_id, studio_id: studioId },
      });
      const targetClient = await tx.client.findFirst({
        where: { id: dto.target_client_id, studio_id: studioId },
      });

      if (!sourceClient) {
        throw new Error(`Source client not found (${dto.source_client_id})`);
      }
      if (!targetClient) {
        throw new Error(`Target client not found (${dto.target_client_id})`);
      }

      if (sourceClient.status === ClientStatus.MERGED) {
        throw new Error(`Source client ${dto.source_client_id} is already merged`);
      }
      if (targetClient.status === ClientStatus.MERGED) {
        throw new Error(`Target client ${dto.target_client_id} is already merged and cannot be target`);
      }

      // 2. Re-link StudioProjects
      const pUpdate = await tx.studioProject.updateMany({
        where: { client_id: sourceClient.id, studio_id: studioId },
        data: { client_id: targetClient.id },
      });

      // 3. Re-link ClientGalleries (handle unique constraint safely)
      const sourceGalleries = await tx.clientGallery.findMany({
        where: { client_id: sourceClient.id, studio_id: studioId },
      });
      let galleriesReassigned = 0;
      for (const cg of sourceGalleries) {
        const targetExisting = await tx.clientGallery.findUnique({
          where: { client_id_gallery_id: { client_id: targetClient.id, gallery_id: cg.gallery_id } },
        });
        if (!targetExisting) {
          await tx.clientGallery.update({
            where: { id: cg.id },
            data: { client_id: targetClient.id },
          });
          galleriesReassigned++;
        } else {
          // Redundant link; delete safely
          await tx.clientGallery.delete({ where: { id: cg.id } });
        }
      }

      // 4. Re-link Galleries if primary client
      const gUpdate = await tx.gallery.updateMany({
        where: { client_id: sourceClient.id, studio_id: studioId },
        data: { client_id: targetClient.id },
      });
      const totalGalleriesMerged = galleriesReassigned + gUpdate.count;

      // 5. Re-link Proofing Sessions
      const prUpdate = await tx.photoProofingSession.updateMany({
        where: { client_id: sourceClient.id, studio_id: studioId },
        data: { client_id: targetClient.id },
      });

      // 6. Re-link Fulfillment Orders
      const ordUpdate = await tx.fulfillmentOrder.updateMany({
        where: { client_id: sourceClient.id, studio_id: studioId },
        data: { client_id: targetClient.id },
      });

      // 7. Re-link Client Conversations
      const convUpdate = await tx.clientConversation.updateMany({
        where: { client_id: sourceClient.id, studio_id: studioId },
        data: { client_id: targetClient.id },
      });

      // Re-link Conversation Participants
      await tx.clientConversationParticipant.updateMany({
        where: { client_id: sourceClient.id, studio_id: studioId },
        data: { client_id: targetClient.id },
      });

      // 8. Re-link Client Activities
      const actUpdate = await tx.clientActivity.updateMany({
        where: { client_id: sourceClient.id, studio_id: studioId },
        data: { client_id: targetClient.id },
      });

      // 9. Re-link Proposals, Contracts, Booking Requests, Calendar Events
      const propUpdate = await tx.studioProposal.updateMany({
        where: { client_id: sourceClient.id, studio_id: studioId },
        data: { client_id: targetClient.id },
      });
      const contUpdate = await tx.studioContract.updateMany({
        where: { client_id: sourceClient.id, studio_id: studioId },
        data: { client_id: targetClient.id },
      });
      const bookUpdate = await tx.studioBookingRequest.updateMany({
        where: { client_id: sourceClient.id, studio_id: studioId },
        data: { client_id: targetClient.id },
      });
      const calUpdate = await tx.studioCalendarEvent.updateMany({
        where: { client_id: sourceClient.id, studio_id: studioId },
        data: { client_id: targetClient.id },
      });

      // 10. Re-link Follow-up Recommendations & Communication Drafts
      const folUpdate = await tx.clientFollowUpRecommendation.updateMany({
        where: { client_id: sourceClient.id, studio_id: studioId },
        data: { client_id: targetClient.id },
      });
      await tx.clientCommunicationDraft.updateMany({
        where: { client_id: sourceClient.id, studio_id: studioId },
        data: { client_id: targetClient.id },
      });

      // 11. Re-link Business Transactions
      await tx.studioBusinessTransaction.updateMany({
        where: { client_id: sourceClient.id, studio_id: studioId },
        data: { client_id: targetClient.id },
      });

      // 12. Re-link Custom Field Values (handle unique constraint)
      const sourceCustomFields = await tx.clientCustomFieldValue.findMany({
        where: { client_id: sourceClient.id, studio_id: studioId },
      });
      let customFieldsReassigned = 0;
      for (const cf of sourceCustomFields) {
        const targetExistingCf = await tx.clientCustomFieldValue.findUnique({
          where: { client_id_field_id: { client_id: targetClient.id, field_id: cf.field_id } },
        });
        if (!targetExistingCf) {
          await tx.clientCustomFieldValue.update({
            where: { id: cf.id },
            data: { client_id: targetClient.id },
          });
          customFieldsReassigned++;
        } else {
          await tx.clientCustomFieldValue.delete({ where: { id: cf.id } });
        }
      }

      // 13. Re-link Important Dates & Notes
      const dtUpdate = await tx.clientImportantDate.updateMany({
        where: { client_id: sourceClient.id, studio_id: studioId },
        data: { client_id: targetClient.id },
      });
      const ntUpdate = await tx.clientNote.updateMany({
        where: { client_id: sourceClient.id, studio_id: studioId },
        data: { client_id: targetClient.id },
      });

      // 14. Merge Tags uniquely & fill missing details on target
      const mergedTags = Array.from(new Set([...(targetClient.tags || []), ...(sourceClient.tags || []), 'MERGED_CLIENT']));
      const updatedTargetData: any = {
        tags: mergedTags,
        phone: targetClient.phone || sourceClient.phone,
        company: targetClient.company || sourceClient.company,
        preferred_channel: targetClient.preferred_channel || sourceClient.preferred_channel,
        preferred_language: targetClient.preferred_language || sourceClient.preferred_language,
        timezone: targetClient.timezone || sourceClient.timezone,
        source: targetClient.source || sourceClient.source,
      };

      const updatedTarget = await tx.client.update({
        where: { id: targetClient.id },
        data: updatedTargetData,
      });

      // 15. Soft delete source client and mark as MERGED
      await tx.client.update({
        where: { id: sourceClient.id },
        data: {
          status: ClientStatus.MERGED,
          relationship_status: ClientRelationshipStatus.MERGED,
          merged_into_client_id: targetClient.id,
          merged_at: new Date(),
          deleted_at: new Date(),
        },
      });

      const affectedCounts = {
        projects: pUpdate.count,
        galleries: totalGalleriesMerged,
        proofing_sessions: prUpdate.count,
        fulfillment_orders: ordUpdate.count,
        conversations: convUpdate.count,
        client_activities: actUpdate.count,
        proposals: propUpdate.count,
        contracts: contUpdate.count,
        booking_requests: bookUpdate.count,
        calendar_events: calUpdate.count,
        follow_ups: folUpdate.count,
        custom_field_values: customFieldsReassigned,
        important_dates: dtUpdate.count,
        notes: ntUpdate.count,
        orders: ordUpdate.count,
      };

      // 16. Record Merge Audit Log
      const auditLog = await tx.clientMergeAuditLog.create({
        data: {
          studio_id: studioId,
          source_client_id: sourceClient.id,
          target_client_id: targetClient.id,
          performed_by_user_id: (dto as any).performed_by_user_id || userId || null,
          summary: `Merged client ${sourceClient.name} (${sourceClient.email}) into ${targetClient.name} (${targetClient.email})`,
          reason: (dto as any).reason || 'Client merge execution',
          affected_counts: affectedCounts as any,
        },
      });

        return {
          success: true,
          target_client: updatedTarget,
          audit_log_id: auditLog.id,
          affected_counts: affectedCounts,
          merged_counts: affectedCounts,
        };
      });
    });
  }

  // =========================================================================
  // 4. UNIFIED CLIENT 360 AGGREGATOR
  // =========================================================================
  async getClient360(studioId: string, clientId: string): Promise<IClient360ComprehensiveDTO> {
    const client = await this.db.client.findFirst({
      where: { id: clientId, studio_id: studioId, deleted_at: null },
      include: {
        assigned_user: { select: { id: true, name: true, email: true } },
        referred_by_client: { select: { id: true, name: true, email: true } },
        projects: {
          orderBy: { created_at: 'desc' },
          take: 10,
        },
        galleries: {
          include: {
            gallery: {
              include: { photos: { select: { id: true } } },
            },
          },
        },
        proofing_sessions: {
          orderBy: { created_at: 'desc' },
          take: 5,
        },
        fulfillment_orders: {
          orderBy: { created_at: 'desc' },
          take: 10,
        },
        conversations: {
          orderBy: { updated_at: 'desc' },
          take: 5,
          include: {
            messages: {
              take: 1,
              orderBy: { created_at: 'desc' },
            },
          },
        },
        follow_up_recommendations: {
          orderBy: { created_at: 'desc' },
          take: 10,
        },
        structured_notes: {
          orderBy: [{ is_pinned: 'desc' }, { created_at: 'desc' }],
          include: { author: { select: { id: true, name: true } } },
        },
        custom_field_values: {
          include: { definition: true },
        },
        important_dates: {
          orderBy: { date_value: 'asc' },
        },
      },
    });

    if (!client) {
      throw new Error(`Client ${clientId} not found for studio ${studioId}`);
    }

    // Calculate Real Financial Records
    const [ordersAggregate, businessTransactions] = await Promise.all([
      this.db.fulfillmentOrder.aggregate({
        where: { client_id: clientId, studio_id: studioId },
        _sum: { total_amount: true },
        _count: { id: true },
      }),
      this.db.studioBusinessTransaction.findMany({
        where: { client_id: clientId, studio_id: studioId },
      }),
    ]);

    let totalPaid = 0;
    let outstandingBalance = 0;
    let refundedAmount = 0;
    let cancelledAmount = 0;

    for (const tx of businessTransactions) {
      const amt = (tx.amount !== undefined ? tx.amount : tx.amount_cents) || 0;
      if (tx.status === 'COMPLETED') {
        totalPaid += amt;
      } else if (tx.status === 'PENDING') {
        outstandingBalance += amt;
      } else if (tx.status === 'REFUNDED') {
        refundedAmount += amt;
      } else if (tx.status === 'CANCELLED') {
        cancelledAmount += amt;
      }
    }

    // Also check completed/pending orders
    for (const ord of client.fulfillment_orders) {
      if (ord.payment_status === 'PAID' && totalPaid === 0) {
        totalPaid += ord.total_amount;
      } else if (ord.payment_status === 'UNPAID' || ord.payment_status === 'PENDING') {
        outstandingBalance += ord.total_amount;
      }
    }

    const totalOrders = ordersAggregate._count.id || client.fulfillment_orders.length;
    const completedProjects = client.projects.filter((p) => p.status === StudioProjectStatus.COMPLETED).length;
    const avgOrderValue = totalOrders > 0 ? Number((totalPaid / totalOrders).toFixed(2)) : 0;

    const financial: IClientFinancialIntelligenceDTO = {
      total_paid: totalPaid,
      total_orders: totalOrders,
      completed_projects: completedProjects,
      average_order_value: avgOrderValue,
      outstanding_balance: outstandingBalance,
      refunded_amount: refundedAmount,
      cancelled_amount: cancelledAmount,
      currency: 'INR',
    };

    // Calculate Operational Health Indicators
    let unreadMessagesCount = 0;
    let lastMessageDate: Date | null = null;
    let waitingParty: 'CLIENT' | 'STUDIO' | 'NONE' = 'NONE';

    for (const conv of client.conversations) {
      if (conv.unread_studio_count > 0) {
        unreadMessagesCount += conv.unread_studio_count;
        waitingParty = 'STUDIO';
      }
      if (conv.last_message_at) {
        const msgDate = new Date(conv.last_message_at);
        if (!lastMessageDate || msgDate > lastMessageDate) {
          lastMessageDate = msgDate;
        }
      }
    }

    const activeProjectsCount = client.projects.filter(
      (p) => p.status !== StudioProjectStatus.COMPLETED && p.status !== StudioProjectStatus.CANCELLED
    ).length;

    // Follow-ups breakdown
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    let hasDueToday = false;
    let hasOverdue = false;
    let nextFollowUp: Date | null = null;

    const followUpsDTO: IFollowUpCenterItemDTO[] = client.follow_up_recommendations.map((f) => {
      const dueDate = f.created_at; // Or derived next follow-up date
      const isOver = dueDate < todayStart && f.status === 'OPEN';
      const isToday = dueDate >= todayStart && dueDate <= todayEnd && f.status === 'OPEN';
      if (isToday) hasDueToday = true;
      if (isOver) hasOverdue = true;
      if (!nextFollowUp || dueDate > nextFollowUp) nextFollowUp = dueDate;

      return {
        id: f.id,
        client_id: client.id,
        client_name: client.name,
        client_email: client.email,
        title: f.title,
        reason: f.reason,
        priority: f.priority,
        status: f.status,
        due_date: dueDate,
        is_overdue: isOver,
        is_due_today: isToday,
        is_upcoming: dueDate > todayEnd,
        waiting_for: 'STUDIO',
        linked_gallery_id: f.gallery_id,
        created_at: f.created_at,
        updated_at: f.updated_at,
      };
    });

    // Determine Returning & Dormant state
    const isReturning = completedProjects >= 1 && (client.projects.length > 1 || client.galleries.length > 1);
    const dormantThresholdMs = (client.dormant_threshold_days || 90) * 24 * 60 * 60 * 1000;
    const lastInteraction = client.last_interaction_at || client.updated_at || client.created_at;
    const isDormant = Date.now() - new Date(lastInteraction).getTime() > dormantThresholdMs && activeProjectsCount === 0;

    // Surface Pending Actions
    const pendingClientActions: IPendingActionItemDTO[] = [];
    const pendingStudioActions: IPendingActionItemDTO[] = [];

    // Check proofing sessions
    for (const proof of client.proofing_sessions) {
      if (proof.status === 'IN_PROGRESS' || proof.status === 'OPEN') {
        pendingClientActions.push({
          id: `proof-${proof.id}`,
          action_type: 'PROOFING_AWAITING_SELECTION',
          party: 'CLIENT',
          title: `Selection needed on "${proof.title}"`,
          description: `Client has selected ${proof.selected_count || 0} of ${proof.target_count || 0} required photos`,
          entity_id: proof.id,
          entity_type: 'PROOFING_SESSION',
          is_urgent: false,
        });
      }
    }

    // Check unpaid orders
    for (const ord of client.fulfillment_orders) {
      if (ord.payment_status === 'UNPAID' || ord.payment_status === 'PENDING') {
        pendingClientActions.push({
          id: `order-pay-${ord.id}`,
          action_type: 'INVOICE_AWAITING_PAYMENT',
          party: 'CLIENT',
          title: `Pending payment for Order #${ord.order_number}`,
          description: `Amount due: ₹${ord.total_amount}`,
          entity_id: ord.id,
          entity_type: 'ORDER',
          is_urgent: true,
        });
      }
    }

    // Check unanswered messages
    if (unreadMessagesCount > 0) {
      pendingStudioActions.push({
        id: `conv-unread-${client.id}`,
        action_type: 'UNANSWERED_MESSAGE',
        party: 'STUDIO',
        title: `${unreadMessagesCount} unread message(s) from ${client.name}`,
        description: 'Client is waiting for a studio response',
        entity_id: client.conversations[0]?.id || client.id,
        entity_type: 'CONVERSATION',
        is_urgent: true,
      });
    }

    // Check overdue follow-ups
    if (hasOverdue) {
      pendingStudioActions.push({
        id: `followup-overdue-${client.id}`,
        action_type: 'FOLLOW_UP_DUE',
        party: 'STUDIO',
        title: `Overdue follow-up for ${client.name}`,
        description: 'Scheduled follow-up date has passed',
        entity_id: client.id,
        entity_type: 'FOLLOW_UP',
        is_urgent: true,
      });
    }

    const healthIndicators: IClientHealthIndicatorsDTO = {
      communication_status: {
        unread_messages: unreadMessagesCount,
        last_message_at: lastMessageDate,
        waiting_party: waitingParty,
      },
      project_status: {
        active_projects: activeProjectsCount,
        completed_projects: completedProjects,
        has_active_project: activeProjectsCount > 0,
      },
      financial_status: {
        outstanding_balance: outstandingBalance,
        is_settled: outstandingBalance === 0,
      },
      workflow_status: {
        pending_client_actions: pendingClientActions.length,
        pending_studio_actions: pendingStudioActions.length,
      },
      engagement_status: {
        last_gallery_interaction: client.last_interaction_at,
        total_views: 0,
        total_favorites: 0,
        total_downloads: 0,
      },
      followup_status: {
        has_due_today: hasDueToday,
        has_overdue: hasOverdue,
        next_follow_up_at: nextFollowUp,
      },
      is_returning: isReturning,
      is_dormant: isDormant,
      dormant_reason: isDormant
        ? `No qualifying studio interaction for over ${client.dormant_threshold_days || 90} days.`
        : undefined,
    };

    return {
      client: {
        id: client.id,
        studio_id: client.studio_id,
        name: client.name,
        first_name: client.first_name,
        last_name: client.last_name,
        email: client.email,
        phone: client.phone,
        company: client.company,
        relationship_status: client.relationship_status,
        lifecycle_stage: client.lifecycle_stage,
        preferred_channel: client.preferred_channel || 'EMAIL',
        preferred_language: client.preferred_language || 'en',
        timezone: client.timezone || 'UTC',
        source: client.source,
        referral_source: client.referral_source,
        referred_by_client: client.referred_by_client,
        assigned_user: client.assigned_user,
        last_interaction_at: client.last_interaction_at,
        next_follow_up_at: client.next_follow_up_at,
        is_dormant: isDormant,
        tags: client.tags || [],
        created_at: client.created_at,
        updated_at: client.updated_at,
      },
      financial,
      health_indicators: healthIndicators,
      projects: client.projects.map((p) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        project_type: p.project_type,
        shoot_date: p.shoot_date,
        estimated_value: p.estimated_value,
      })),
      galleries: client.galleries.map((cg) => ({
        id: cg.gallery.id,
        name: cg.gallery.title,
        status: cg.gallery.status,
        created_at: cg.gallery.created_at,
        photo_count: cg.gallery.photos?.length || 0,
      })),
      proofing_sessions: client.proofing_sessions.map((pr) => ({
        id: pr.id,
        title: pr.title,
        status: pr.status,
        target_count: pr.target_count,
        selected_count: pr.selected_count,
      })),
      orders: client.fulfillment_orders.map((o) => ({
        id: o.id,
        order_number: o.order_number,
        status: o.status,
        payment_status: o.payment_status,
        total_amount: o.total_amount,
        created_at: o.created_at,
      })),
      conversations: client.conversations.map((c) => ({
        id: c.id,
        subject: c.subject,
        status: c.status,
        last_message_at: c.last_message_at,
        unread_count: c.unread_studio_count,
      })),
      pending_actions: {
        client_actions: pendingClientActions,
        studio_actions: pendingStudioActions,
      },
      follow_ups: followUpsDTO,
      notes: client.structured_notes.map((n) => ({
        id: n.id,
        studio_id: n.studio_id,
        client_id: n.client_id,
        author_id: n.author_id,
        author_name: n.author?.name || null,
        content: n.content,
        is_pinned: n.is_pinned,
        created_at: n.created_at,
        updated_at: n.updated_at,
      })),
      custom_fields: client.custom_field_values.map((cf) => ({
        id: cf.id,
        studio_id: cf.studio_id,
        client_id: cf.client_id,
        field_id: cf.field_id,
        value: cf.value,
        field_definition: cf.definition
          ? {
              id: cf.definition.id,
              studio_id: cf.definition.studio_id,
              name: cf.definition.name,
              key: cf.definition.key,
              field_type: cf.definition.field_type,
              options: cf.definition.options as any,
              required: cf.definition.required,
              created_at: cf.definition.created_at,
              updated_at: cf.definition.updated_at,
            }
          : undefined,
        created_at: cf.created_at,
        updated_at: cf.updated_at,
      })),
      important_dates: client.important_dates.map((d) => ({
        id: d.id,
        studio_id: d.studio_id,
        client_id: d.client_id,
        title: d.title,
        date_type: d.date_type,
        date_value: d.date_value,
        is_recurring: d.is_recurring,
        notes: d.notes,
        created_at: d.created_at,
        updated_at: d.updated_at,
      })),
    };
  }

  // =========================================================================
  // 5. RELATIONSHIP TIMELINE (MULTI-SYSTEM AGGREGATOR)
  // =========================================================================
  async getClientTimeline(
    studioId: string,
    clientId: string,
    filter: IClientTimelineFilterDTO = {}
  ): Promise<{ items: IClientTimelineItemDTO[]; total: number; page: number; limit: number }> {
    const page = filter.page || 1;
    const limit = filter.limit || 50;

    const [
      client,
      activities,
      projects,
      galleries,
      orders,
      proofing,
      conversations,
      followUps,
    ] = await Promise.all([
      this.db.client.findFirst({
        where: { id: clientId, studio_id: studioId, deleted_at: null },
      }),
      this.db.clientActivity.findMany({
        where: { client_id: clientId, studio_id: studioId },
        orderBy: { created_at: 'desc' },
      }),
      this.db.studioProject.findMany({
        where: { client_id: clientId, studio_id: studioId },
        orderBy: { created_at: 'desc' },
      }),
      this.db.clientGallery.findMany({
        where: { client_id: clientId, studio_id: studioId },
        include: { gallery: true },
        orderBy: { created_at: 'desc' },
      }),
      this.db.fulfillmentOrder.findMany({
        where: { client_id: clientId, studio_id: studioId },
        orderBy: { created_at: 'desc' },
      }),
      this.db.photoProofingSession.findMany({
        where: { client_id: clientId, studio_id: studioId },
        orderBy: { created_at: 'desc' },
      }),
      this.db.clientConversation.findMany({
        where: { client_id: clientId, studio_id: studioId },
        orderBy: { created_at: 'desc' },
      }),
      this.db.clientFollowUpRecommendation.findMany({
        where: { client_id: clientId, studio_id: studioId },
        orderBy: { created_at: 'desc' },
      }),
    ]);

    if (!client) {
      throw new Error(`Client ${clientId} not found`);
    }

    const items: IClientTimelineItemDTO[] = [];

    // Projects
    for (const p of projects) {
      items.push({
        id: `project-${p.id}`,
        category: 'PROJECTS',
        event_type: 'PROJECT_CREATED',
        title: `Project Created: ${p.name}`,
        description: `Project type: ${p.project_type}, Status: ${p.status}`,
        timestamp: p.created_at,
        source_entity_id: p.id,
        source_entity_type: 'PROJECT',
      });
      if (p.shoot_date) {
        items.push({
          id: `shoot-${p.id}`,
          category: 'PRODUCTION',
          event_type: 'SHOOT_SCHEDULED',
          title: `Shoot Scheduled for ${p.name}`,
          description: `Location: ${p.location || 'Studio'}`,
          timestamp: p.shoot_date,
          source_entity_id: p.id,
          source_entity_type: 'PROJECT',
        });
      }
    }

    // Galleries
    for (const cg of galleries) {
      items.push({
        id: `gallery-${cg.id}`,
        category: 'GALLERY',
        event_type: 'GALLERY_CONNECTED',
        title: `Gallery Linked: ${cg.gallery.title}`,
        description: `Status: ${cg.gallery.status}`,
        timestamp: cg.created_at,
        source_entity_id: cg.gallery.id,
        source_entity_type: 'GALLERY',
      });
    }

    // Proofing
    for (const pr of proofing) {
      items.push({
        id: `proofing-${pr.id}`,
        category: 'PROOFING',
        event_type: 'PROOFING_STARTED',
        title: `Proofing Session: ${pr.title}`,
        description: `Status: ${pr.status}, Selected: ${pr.selected_count}/${pr.target_count}`,
        timestamp: pr.created_at,
        source_entity_id: pr.id,
        source_entity_type: 'PROOFING_SESSION',
      });
    }

    // Orders & Payments
    for (const ord of orders) {
      items.push({
        id: `order-${ord.id}`,
        category: 'ORDERS',
        event_type: 'ORDER_CREATED',
        title: `Order Placed: #${ord.order_number}`,
        description: `Total Amount: ₹${ord.total_amount}, Payment: ${ord.payment_status}`,
        timestamp: ord.created_at,
        source_entity_id: ord.id,
        source_entity_type: 'ORDER',
      });
      if (ord.payment_status === 'PAID') {
        items.push({
          id: `payment-${ord.id}`,
          category: 'PAYMENTS',
          event_type: 'PAYMENT_RECEIVED',
          title: `Payment Received for #${ord.order_number}`,
          description: `Paid: ₹${ord.total_amount}`,
          timestamp: ord.updated_at,
          source_entity_id: ord.id,
          source_entity_type: 'ORDER',
        });
      }
    }

    // Conversations
    for (const conv of conversations) {
      items.push({
        id: `conv-${conv.id}`,
        category: 'COMMUNICATION',
        event_type: 'CONVERSATION_OPENED',
        title: conv.subject ? `Conversation: ${conv.subject}` : 'Client Conversation',
        description: `Status: ${conv.status}`,
        timestamp: conv.created_at,
        source_entity_id: conv.id,
        source_entity_type: 'CONVERSATION',
      });
    }

    // Follow-ups
    for (const fol of followUps) {
      items.push({
        id: `fol-${fol.id}`,
        category: 'FOLLOW_UP',
        event_type: 'FOLLOW_UP_SCHEDULED',
        title: `Follow-up: ${fol.title}`,
        description: fol.reason,
        timestamp: fol.created_at,
        source_entity_id: fol.id,
        source_entity_type: 'FOLLOW_UP',
      });
    }

    // Activities
    for (const act of activities) {
      let cat: TimelineCategory = 'CUSTOM';
      if (act.activity_type.startsWith('GALLERY') || act.activity_type.includes('PHOTO')) {
        cat = 'GALLERY';
      } else if (act.activity_type.startsWith('PROJECT')) {
        cat = 'PROJECTS';
      } else if (act.activity_type.startsWith('PROOF')) {
        cat = 'PROOFING';
      } else if (act.activity_type.startsWith('ORDER') || act.activity_type.startsWith('PAYMENT')) {
        cat = 'ORDERS';
      } else if (act.activity_type.startsWith('COMMUNICATION') || act.activity_type.startsWith('MESSAGE')) {
        cat = 'COMMUNICATION';
      } else if (act.activity_type.startsWith('FOLLOW_UP')) {
        cat = 'FOLLOW_UP';
      }
      items.push({
        id: `act-${act.id}`,
        category: cat,
        event_type: act.activity_type,
        title: (act as any).title || act.activity_type.replace(/_/g, ' '),
        description: act.description,
        timestamp: act.created_at,
        source_entity_id: act.id,
        source_entity_type: 'ACTIVITY',
      });
    }

    // Sort chronologically descending
    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Filter by category if requested
    let filtered = items;
    if (filter.category && filter.category !== 'ALL') {
      filtered = filtered.filter((i) => i.category === filter.category);
    }

    // Paginate
    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + limit);

    return {
      items: paginated,
      total: filtered.length,
      page,
      limit,
    };
  }

  // =========================================================================
  // 5.1 GLOBAL CRM LIST & SEARCH ENGINE
  // =========================================================================
  async listClients(
    studioId: string,
    filter: {
      search?: string;
      relationship_status?: ClientRelationshipStatus | string;
      lifecycle_stage?: ClientLifecycleStage | string;
      assigned_user_id?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{
    clients: any[];
    pagination: {
      page: number;
      limit: number;
      total_count: number;
      total_pages: number;
    };
  }> {
    const page = Math.max(1, filter.page || 1);
    const limit = Math.max(1, Math.min(100, filter.limit || 20));

    let allClients = await this.db.client.findMany({
      where: {
        studio_id: studioId,
        deleted_at: null,
        status: { not: ClientStatus.MERGED },
        ...(filter.relationship_status ? { relationship_status: filter.relationship_status as any } : {}),
        ...(filter.lifecycle_stage ? { lifecycle_stage: filter.lifecycle_stage as any } : {}),
        ...(filter.assigned_user_id ? { assigned_user_id: filter.assigned_user_id } : {}),
      },
      include: {
        assigned_user: { select: { id: true, name: true, email: true } },
        projects: { select: { id: true, name: true, status: true } },
        galleries: { select: { id: true, title: true } },
        fulfillment_orders: { select: { id: true, total_amount: true, status: true } },
        custom_field_values: { include: { definition: true } },
        important_dates: true,
        structured_notes: true,
      },
      orderBy: { created_at: 'desc' },
    });

    if (filter.search && filter.search.trim()) {
      const q = filter.search.trim().toLowerCase();
      allClients = allClients.filter((c: any) => {
        const name = (c.name || '').toLowerCase();
        const email = (c.email || '').toLowerCase();
        const phone = (c.phone || '').toLowerCase();
        const company = (c.company || '').toLowerCase();
        return name.includes(q) || email.includes(q) || phone.includes(q) || company.includes(q);
      });
    }

    const totalCount = allClients.length;
    const totalPages = Math.ceil(totalCount / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginatedClients = allClients.slice(startIndex, startIndex + limit);

    return {
      clients: paginatedClients,
      items: paginatedClients,
      total: totalCount,
      page,
      limit,
      pagination: {
        page,
        limit,
        total_count: totalCount,
        total_pages: totalPages,
      },
    };
  }

  // =========================================================================
  // 6. FOLLOW-UP ACTION CENTER (DUE TODAY / OVERDUE / UPCOMING AGGREGATIONS)
  // =========================================================================
  async getFollowUpsCenter(
    studioId: string,
    filter: { clientId?: string; status?: string } = {}
  ): Promise<IFollowUpCenterSummaryDTO> {
    const followUps = await this.db.clientFollowUpRecommendation.findMany({
      where: {
        studio_id: studioId,
        ...(filter.status ? { status: filter.status as any } : {}),
        ...(filter.clientId ? { client_id: filter.clientId } : {}),
      },
      include: {
        client: { select: { id: true, name: true, email: true, phone: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    let dueToday = 0;
    let overdue = 0;
    let upcoming = 0;
    let waitingForClient = 0;
    let waitingForStudio = 0;

    const items: IFollowUpCenterItemDTO[] = [];

    for (const f of followUps) {
      const dueDate = f.due_date ? new Date(f.due_date) : f.created_at;
      const isOver = dueDate < todayStart && f.status === 'OPEN';
      const isToday = dueDate >= todayStart && dueDate <= todayEnd && f.status === 'OPEN';
      const isUp = dueDate > todayEnd;

      if (isToday) dueToday++;
      if (isOver) overdue++;
      if (isUp) upcoming++;
      if (f.waiting_for === 'CLIENT') {
        waitingForClient++;
      } else if (f.waiting_for === 'STUDIO') {
        waitingForStudio++;
      }

      // Filter out completed/cancelled when viewing default active center list
      if (!filter.status && f.status !== 'OPEN') {
        continue;
      }

      items.push({
        id: f.id,
        client_id: f.client_id,
        client_name: f.client?.name || 'Unknown Client',
        client_email: f.client?.email || '',
        title: f.title,
        reason: f.reason,
        priority: f.priority,
        status: f.status,
        due_date: dueDate,
        is_overdue: isOver,
        is_due_today: isToday,
        is_upcoming: isUp,
        waiting_for: f.waiting_for || 'STUDIO',
        linked_gallery_id: f.gallery_id,
        created_at: f.created_at,
        updated_at: f.updated_at,
      });
    }

    // Count unanswered conversations across studio
    const unansweredConversationsCount = await this.db.clientConversation.count({
      where: { studio_id: studioId, unread_studio_count: { gt: 0 } },
    });

    return {
      due_today_count: dueToday,
      overdue_count: overdue,
      upcoming_count: upcoming,
      waiting_for_client_count: waitingForClient,
      waiting_for_studio_count: waitingForStudio,
      unanswered_conversations_count: unansweredConversationsCount,
      items,
    };
  }

  async updateFollowUpStatus(
    studioId: string,
    followUpId: string,
    status: 'OPEN' | 'COMPLETED' | 'CANCELLED' | 'SNOOZED' | string
  ): Promise<any> {
    const followUp = await this.db.clientFollowUpRecommendation.findFirst({
      where: { id: followUpId, studio_id: studioId },
    });
    if (!followUp) {
      throw new Error(`Follow-up recommendation ${followUpId} not found`);
    }

    const allowed = ['OPEN', 'PENDING', 'DUE', 'OVERDUE', 'COMPLETED', 'CANCELLED', 'SNOOZED'];
    if (!allowed.includes(status)) {
      throw new Error(`Invalid follow-up status: ${status}`);
    }

    const updated = await this.db.clientFollowUpRecommendation.update({
      where: { id: followUpId },
      data: {
        status: status as any,
        updated_at: new Date(),
      },
    });

    return updated;
  }

  // =========================================================================
  // 7. CUSTOM FIELDS CRUD
  // =========================================================================
  async createCustomFieldDefinition(
    studioId: string,
    data: { name: string; key?: string; field_type: ClientCustomFieldType | string; options?: string[]; required?: boolean; is_required?: boolean }
  ): Promise<IClientCustomFieldDefinitionDTO> {
    const rawKey = data.key || data.name;
    const sanitizedKey = rawKey.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const sanitizedName = sanitizeText(data.name);
    const isRequired = data.required !== undefined ? data.required : (data.is_required !== undefined ? data.is_required : false);

    const definition = await this.db.clientCustomFieldDefinition.create({
      data: {
        studio_id: studioId,
        name: sanitizedName,
        key: sanitizedKey,
        field_type: (data.field_type || ClientCustomFieldType.TEXT) as ClientCustomFieldType,
        options: data.options ? (data.options.map((o) => sanitizeText(o)) as any) : null,
        required: isRequired,
      },
    });

    return {
      id: definition.id,
      studio_id: definition.studio_id,
      name: definition.name,
      key: definition.key,
      field_type: definition.field_type,
      options: definition.options as any,
      required: definition.required,
      created_at: definition.created_at,
      updated_at: definition.updated_at,
    };
  }

  async listCustomFieldDefinitions(studioId: string): Promise<IClientCustomFieldDefinitionDTO[]> {
    const definitions = await this.db.clientCustomFieldDefinition.findMany({
      where: { studio_id: studioId },
      orderBy: { created_at: 'asc' },
    });

    return definitions.map((d) => ({
      id: d.id,
      studio_id: d.studio_id,
      name: d.name,
      key: d.key,
      field_type: d.field_type,
      options: d.options as any,
      required: d.required,
      created_at: d.created_at,
      updated_at: d.updated_at,
    }));
  }

  async getCustomFieldDefinitions(studioId: string): Promise<IClientCustomFieldDefinitionDTO[]> {
    return this.listCustomFieldDefinitions(studioId);
  }

  async setCustomFieldValue(
    studioId: string,
    clientId: string,
    fieldIdOrData: string | { field_id: string; value: string },
    value?: string
  ): Promise<any> {
    const fieldId = typeof fieldIdOrData === 'object' ? fieldIdOrData.field_id : fieldIdOrData;
    const valString = typeof fieldIdOrData === 'object' ? fieldIdOrData.value : (value || '');

    // Validate field definition belongs to same studio
    const definition = await this.db.clientCustomFieldDefinition.findFirst({
      where: { id: fieldId, studio_id: studioId },
    });
    if (!definition) {
      throw new Error(`Custom field definition ${fieldId} not found in this studio`);
    }

    // Validate client belongs to studio
    const client = await this.db.client.findFirst({
      where: { id: clientId, studio_id: studioId },
    });
    if (!client) {
      throw new Error(`Client ${clientId} not found in this studio`);
    }

    const sanitizedValue = sanitizeText(valString);

    // Validate type constraints
    if (definition.field_type === ClientCustomFieldType.NUMBER && isNaN(Number(sanitizedValue))) {
      throw new Error(`Field ${definition.name} expects a valid number`);
    }
    if (definition.field_type === ClientCustomFieldType.BOOLEAN && !['true', 'false', '1', '0'].includes(sanitizedValue.toLowerCase())) {
      throw new Error(`Field ${definition.name} expects a boolean value`);
    }
    if (definition.field_type === ClientCustomFieldType.SELECT && definition.options) {
      const optionsArr = definition.options as string[];
      if (!optionsArr.includes(sanitizedValue)) {
        throw new Error(`Invalid select option: Value "${sanitizedValue}" is not an allowed option for ${definition.name}`);
      }
    }

    const val = await this.db.clientCustomFieldValue.upsert({
      where: { client_id_field_id: { client_id: clientId, field_id: fieldId } },
      create: {
        studio_id: studioId,
        client_id: clientId,
        field_id: fieldId,
        value: sanitizedValue,
      },
      update: {
        value: sanitizedValue,
      },
    });

    const isNum = definition.field_type === ClientCustomFieldType.NUMBER && !isNaN(Number(val.value));

    return {
      id: val.id,
      studio_id: val.studio_id,
      client_id: val.client_id,
      field_id: val.field_id,
      value: val.value,
      value_text: val.value,
      value_number: isNum ? Number(val.value) : undefined,
      created_at: val.created_at,
      updated_at: val.updated_at,
    };
  }

  async setClientCustomFieldValue(
    studioId: string,
    clientId: string,
    fieldId: string,
    value: string
  ): Promise<IClientCustomFieldValueDTO> {
    return this.setCustomFieldValue(studioId, clientId, fieldId, value);
  }

  // =========================================================================
  // 8. IMPORTANT DATES CRUD
  // =========================================================================
  async addImportantDate(
    studioId: string,
    clientId: string,
    data: { title: string; date?: string | Date; date_type?: ClientImportantDateType | string; date_value?: string | Date; is_recurring?: boolean; is_recurring_yearly?: boolean; notes?: string }
  ): Promise<any> {
    const client = await this.db.client.findFirst({
      where: { id: clientId, studio_id: studioId },
    });
    if (!client) {
      throw new Error(`Client ${clientId} not found`);
    }

    const dateVal = data.date_value || data.date || new Date();
    const recurring = data.is_recurring !== undefined ? data.is_recurring : (data.is_recurring_yearly !== undefined ? data.is_recurring_yearly : true);

    const item = await this.db.clientImportantDate.create({
      data: {
        studio_id: studioId,
        client_id: clientId,
        title: sanitizeText(data.title),
        date_type: (data.date_type || ClientImportantDateType.OTHER) as ClientImportantDateType,
        date_value: new Date(dateVal),
        is_recurring: recurring,
        notes: data.notes ? sanitizeText(data.notes) : null,
      },
    });

    return {
      id: item.id,
      studio_id: item.studio_id,
      client_id: item.client_id,
      title: item.title,
      date_type: item.date_type,
      date_value: item.date_value,
      is_recurring: item.is_recurring,
      is_recurring_yearly: item.is_recurring,
      notes: item.notes,
      created_at: item.created_at,
      updated_at: item.updated_at,
    };
  }

  async getClientImportantDates(studioId: string, clientId: string): Promise<any[]> {
    const dates = await this.db.clientImportantDate.findMany({
      where: { client_id: clientId, studio_id: studioId },
      orderBy: { date_value: 'asc' },
    });
    return dates.map((d: any) => ({
      ...d,
      is_recurring_yearly: d.is_recurring,
    }));
  }

  // =========================================================================
  // 9. CLIENT NOTES (STRICTLY PRIVATE TO PHOTOGRAPHER)
  // =========================================================================
  async addClientNote(
    studioId: string,
    clientId: string,
    contentOrData: string | { content: string; is_pinned?: boolean; category?: string; author_user_id?: string; authorId?: string },
    authorId?: string,
    isPinned = false
  ): Promise<any> {
    const client = await this.db.client.findFirst({
      where: { id: clientId, studio_id: studioId },
    });
    if (!client) {
      throw new Error(`Client ${clientId} not found`);
    }

    let rawContent = '';
    let rawAuthorId = authorId || null;
    let rawIsPinned = isPinned;
    let rawCategory = 'GENERAL';

    if (typeof contentOrData === 'object' && contentOrData !== null) {
      rawContent = contentOrData.content || '';
      rawAuthorId = contentOrData.author_user_id || contentOrData.authorId || rawAuthorId;
      rawIsPinned = contentOrData.is_pinned !== undefined ? contentOrData.is_pinned : rawIsPinned;
      rawCategory = contentOrData.category || rawCategory;
    } else {
      rawContent = String(contentOrData || '');
    }

    const note = await this.db.clientNote.create({
      data: {
        studio_id: studioId,
        client_id: clientId,
        author_id: rawAuthorId,
        content: sanitizeText(rawContent),
        is_pinned: rawIsPinned,
      },
      include: {
        author: { select: { id: true, name: true } },
      },
    });

    return {
      id: note.id,
      studio_id: note.studio_id,
      client_id: note.client_id,
      author_id: note.author_id,
      author_name: note.author?.name || null,
      content: note.content,
      is_pinned: note.is_pinned,
      category: rawCategory,
      created_at: note.created_at,
      updated_at: note.updated_at,
    };
  }

  async getClientNotes(studioId: string, clientId: string): Promise<any[]> {
    const client = await this.db.client.findFirst({
      where: { id: clientId, studio_id: studioId, deleted_at: null },
    });
    if (!client) {
      throw new Error(`Client ${clientId} not found for studio ${studioId}`);
    }
    const notes = await this.db.clientNote.findMany({
      where: { client_id: clientId, studio_id: studioId },
      include: { author: { select: { id: true, name: true } } },
      orderBy: [{ is_pinned: 'desc' }, { created_at: 'desc' }],
    });
    return notes.map((n: any) => ({
      id: n.id,
      studio_id: n.studio_id,
      client_id: n.client_id,
      author_id: n.author_id,
      author_name: n.author?.name || null,
      content: n.content,
      is_pinned: n.is_pinned,
      created_at: n.created_at,
      updated_at: n.updated_at,
    }));
  }

  // =========================================================================
  // 10. CLIENT ASSIGNMENT
  // =========================================================================
  async assignClient(
    studioId: string,
    clientId: string,
    assignedUserId: string | null,
    performingUserId?: string
  ): Promise<any> {
    const client = await this.db.client.findFirst({
      where: { id: clientId, studio_id: studioId },
    });
    if (!client) {
      throw new Error(`Client ${clientId} not found`);
    }

    if (assignedUserId) {
      // Ensure assigned user belongs to this studio
      const user = await this.db.user.findFirst({
        where: { id: assignedUserId, studio_id: studioId },
      });
      if (!user) {
        if (this.db.studioMembership) {
          const membership = await this.db.studioMembership.findFirst({
            where: { user_id: assignedUserId, studio_id: studioId },
          });
          if (!membership) {
            throw new Error('Assigned user not found in this studio');
          }
        } else {
          throw new Error('Assigned user not found in this studio');
        }
      }
    }

    const updated = await this.db.client.update({
      where: { id: clientId },
      data: {
        assigned_user_id: assignedUserId,
        last_interaction_at: new Date(),
      },
      include: {
        assigned_user: { select: { id: true, name: true, email: true } },
      },
    });

    await this.db.clientActivity.create({
      data: {
        studio_id: studioId,
        client_id: clientId,
        activity_type: 'CLIENT_UPDATED',
        title: 'Assigned staff member updated',
        description: assignedUserId ? `Assigned to user ${assignedUserId}` : 'Unassigned',
        metadata: { assigned_user_id: assignedUserId, performing_user_id: performingUserId },
      },
    });

    return updated;
  }

  // =========================================================================
  // 11. BULK ACTIONS
  // =========================================================================
  async performBulkActions(
    studioId: string,
    dto: IClientBulkActionDTO,
    userId?: string
  ): Promise<{ modified_count: number; affected_count: number }> {
    if (!dto.client_ids || dto.client_ids.length === 0) {
      return { modified_count: 0, affected_count: 0 };
    }

    if (dto.action === 'ARCHIVE') {
      const res = await this.db.client.updateMany({
        where: { id: { in: dto.client_ids }, studio_id: studioId, deleted_at: null },
        data: {
          status: ClientStatus.ARCHIVED,
          relationship_status: ClientRelationshipStatus.ARCHIVED,
        },
      });
      return { modified_count: res.count, affected_count: res.count };
    }

    if (dto.action === 'RESTORE') {
      const res = await this.db.client.updateMany({
        where: { id: { in: dto.client_ids }, studio_id: studioId, deleted_at: null },
        data: {
          status: ClientStatus.ACTIVE,
          relationship_status: ClientRelationshipStatus.ACTIVE,
        },
      });
      return { modified_count: res.count, affected_count: res.count };
    }

    if (dto.action === 'ASSIGN') {
      const res = await this.db.client.updateMany({
        where: { id: { in: dto.client_ids }, studio_id: studioId, deleted_at: null },
        data: { assigned_user_id: dto.assigned_user_id || null },
      });
      return { modified_count: res.count, affected_count: res.count };
    }

    if (dto.action === 'UPDATE_STATUS' && dto.relationship_status) {
      const res = await this.db.client.updateMany({
        where: { id: { in: dto.client_ids }, studio_id: studioId, deleted_at: null },
        data: { relationship_status: dto.relationship_status as any },
      });
      return { modified_count: res.count, affected_count: res.count };
    }

    if (dto.action === 'ADD_TAGS' && dto.tags && dto.tags.length > 0) {
      let count = 0;
      for (const cid of dto.client_ids) {
        const cl = await this.db.client.findFirst({ where: { id: cid, studio_id: studioId } });
        if (cl) {
          const newTags = Array.from(new Set([...(cl.tags || []), ...dto.tags!]));
          await this.db.client.update({
            where: { id: cid },
            data: { tags: newTags },
          });
          count++;
        }
      }
      return { modified_count: count, affected_count: count };
    }

    if (dto.action === 'REMOVE_TAGS' && dto.tags && dto.tags.length > 0) {
      let count = 0;
      for (const cid of dto.client_ids) {
        const cl = await this.db.client.findFirst({ where: { id: cid, studio_id: studioId } });
        if (cl) {
          const toRemove = new Set(dto.tags);
          const newTags = (cl.tags || []).filter((t) => !toRemove.has(t));
          await this.db.client.update({
            where: { id: cid },
            data: { tags: newTags },
          });
          count++;
        }
      }
      return { modified_count: count, affected_count: count };
    }

    if (dto.action === 'CREATE_FOLLOW_UP' && dto.follow_up_title) {
      let count = 0;
      for (const cid of dto.client_ids) {
        await this.db.clientFollowUpRecommendation.create({
          data: {
            studio_id: studioId,
            client_id: cid,
            title: sanitizeText(dto.follow_up_title),
            reason: sanitizeText(dto.follow_up_reason || 'Bulk scheduled follow-up'),
            type: 'GENERAL_FOLLOW_UP',
            status: 'OPEN',
          },
        });
        count++;
      }
      return { modified_count: count, affected_count: count };
    }

    return { modified_count: 0, affected_count: 0 };
  }

  // =========================================================================
  // 12. SECURE CSV EXPORT (FORMULA INJECTION SAFE)
  // =========================================================================
  async exportClientsCSV(studioId: string): Promise<string> {
    const clients = await this.db.client.findMany({
      where: {
        studio_id: studioId,
        deleted_at: null,
        status: { not: ClientStatus.MERGED },
      },
      include: {
        assigned_user: { select: { name: true, email: true } },
        projects: { select: { id: true, status: true } },
        galleries: { select: { id: true } },
        fulfillment_orders: { select: { total_amount: true, payment_status: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    const headers = [
      'Client ID',
      'Name',
      'Email',
      'Phone',
      'Company',
      'Relationship Status',
      'Lifecycle Stage',
      'Assigned To',
      'Projects Count',
      'Galleries Count',
      'Total Orders Amount',
      'Tags',
      'Created At',
    ];

    const rows: string[] = [headers.map(escapeCsvValue).join(',')];

    for (const c of clients) {
      const totalAmount = c.fulfillment_orders
        .filter((o) => o.payment_status === 'PAID')
        .reduce((sum, o) => sum + o.total_amount, 0);

      const row = [
        c.id,
        c.name,
        c.email,
        c.phone || '',
        c.company || '',
        c.relationship_status,
        c.lifecycle_stage,
        c.assigned_user?.name || '',
        c.projects.length,
        c.galleries.length,
        totalAmount,
        (c.tags || []).join('; '),
        c.created_at ? new Date(c.created_at).toISOString() : '',
      ];
      rows.push(row.map(escapeCsvValue).join(','));
    }

    return rows.join('\r\n');
  }
}
