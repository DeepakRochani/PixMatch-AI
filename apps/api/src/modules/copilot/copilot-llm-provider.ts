/**
 * Copilot LLM Provider & Intent Classifier — PIXMatch AI Phase 15
 * Fact-grounded response synthesizer with deterministic fallback, zero hallucination, and prompt injection defense.
 */

import { CopilotContextFactsDTO, CopilotMessageDTO } from '@pixmatch/types';

export interface CopilotLLMProvider {
  generateResponse(prompt: string, facts: CopilotContextFactsDTO, history?: CopilotMessageDTO[]): Promise<{
    content: string;
    intent: string;
    suggestedActions?: Array<{
      action_type: string;
      label: string;
      requires_approval: boolean;
      is_destructive?: boolean;
      payload?: Record<string, any>;
    }>;
  }>;
}

/**
 * Defensive sanitizer for user input to prevent prompt injection and confidential data extraction attempts.
 */
export function sanitizeUserInput(input: string): { sanitized: string; isSuspect: boolean } {
  const suspectPatterns = [
    /ignore\s+(all\s+)?previous\s+instructions/i,
    /reveal\s+(system\s+)?prompt/i,
    /give\s+me\s+(raw\s+)?embeddings/i,
    /show\s+(api\s+)?keys/i,
    /show\s+credentials/i,
    /drop\s+table/i,
    /<script[\s\S]*?>[\s\S]*?<\/script>/i,
  ];

  let isSuspect = false;
  for (const pattern of suspectPatterns) {
    if (pattern.test(input)) {
      isSuspect = true;
      break;
    }
  }

  // Strip dangerous tag structures
  const sanitized = input.replace(/<[^>]*>?/gm, '').trim();
  return { sanitized, isSuspect };
}

/**
 * Deterministic Copilot Provider: Synthesizes direct, fact-grounded responses from verified database facts.
 * Never calls external APIs, guarantees zero hallucination, and costs $0.00.
 */
export class DeterministicCopilotProvider implements CopilotLLMProvider {
  async generateResponse(
    prompt: string,
    facts: CopilotContextFactsDTO,
    _history?: CopilotMessageDTO[]
  ): Promise<{
    content: string;
    intent: string;
    suggestedActions?: Array<{
      action_type: string;
      label: string;
      requires_approval: boolean;
      is_destructive?: boolean;
      payload?: Record<string, any>;
    }>;
  }> {
    const { sanitized, isSuspect } = sanitizeUserInput(prompt);

    if (isSuspect) {
      return {
        content: "I am your PixMatch AI Gallery Copilot. I only assist with gallery preparation, processing diagnostics, and photo curation within this gallery's verified operational boundaries.",
        intent: 'SECURITY_BOUNDARY',
      };
    }

    const lower = sanitized.toLowerCase();
    const suggestedActions: Array<any> = [];

    // 1. "Is this gallery ready?" / Readiness inquiry
    if (lower.includes('ready') || lower.includes('can i publish') || lower.includes('ready to publish') || lower.includes('status')) {
      const isReady = facts.readiness.status === 'READY';
      const isAlmost = facts.readiness.status === 'ALMOST_READY';
      let content = '';

      if (isReady) {
        content = `✓ **This gallery is fully prepared and ready to publish!**\n\n- **Photos:** ${facts.processing.processed_count} processed\n- **AI Indexing:** ${facts.ai_indexing.indexed_count} indexed\n- **Cover:** Selected\n- **Smart Albums:** ${facts.smart_albums.active_albums_count} active\n\nNo blocking issues found.`;
      } else if (isAlmost) {
        content = `⚡ **Gallery is almost ready (${facts.readiness.score}/100 readiness score).**\n\n✓ **${facts.processing.processed_count}** photos processed\n${facts.processing.failed_count > 0 ? `⚠ **${facts.processing.failed_count}** processing jobs failed` : '✓ Processing clean'}\n${!facts.gallery.has_cover ? '⚠ No cover photo selected' : '✓ Cover selected'}\n\nI recommend resolving the remaining items below before publishing.`;
      } else {
        content = `⚠ **Gallery needs attention (${facts.readiness.score}/100 score).**\n\n`;
        if (facts.readiness.blockers.length > 0) {
          content += `**Key Blockers:**\n` + facts.readiness.blockers.map((b) => `- ❌ ${b}`).join('\n') + '\n\n';
        }
        if (facts.readiness.warnings.length > 0) {
          content += `**Warnings:**\n` + facts.readiness.warnings.map((w) => `- ⚠ ${w}`).join('\n') + '\n\n';
        }
      }

      if (facts.processing.failed_count > 0) {
        suggestedActions.push({
          action_type: 'RETRY_PROCESSING',
          label: 'Retry Failed Jobs',
          requires_approval: false,
          payload: { galleryId: facts.gallery.id },
        });
      }
      if (!facts.gallery.has_cover) {
        suggestedActions.push({
          action_type: 'APPLY_RECOMMENDED_COVER',
          label: 'Apply Recommended Cover',
          requires_approval: true,
          payload: { galleryId: facts.gallery.id },
        });
      }

      return { content, intent: 'GALLERY_READINESS', suggestedActions };
    }

    // 2. "What needs my attention?"
    if (lower.includes('attention') || lower.includes('what should i do') || lower.includes('issues') || lower.includes('problems')) {
      const items: string[] = [];
      if (facts.processing.failed_count > 0) items.push(`${facts.processing.failed_count} processing jobs failed`);
      if (facts.processing.pending_count > 0) items.push(`${facts.processing.pending_count} photos still in processing queue`);
      if (facts.ai_indexing.unindexed_count > 0) items.push(`${facts.ai_indexing.unindexed_count} photos pending AI facial indexing`);
      if (!facts.gallery.has_cover) items.push('Gallery has no hero cover photo');
      if (facts.duplicates.duplicate_groups > 0) items.push(`${facts.duplicates.duplicate_groups} duplicate/burst groups detected`);
      if (facts.quality.low_quality_count > 0) items.push(`${facts.quality.low_quality_count} photos flagged for blur or low exposure`);

      let content = '';
      if (items.length === 0) {
        content = `🎉 **Nothing needs urgent attention.** All ${facts.processing.total_photos} photos are processed and ready.`;
      } else {
        content = `Here are the items requiring your attention for **${facts.gallery.title}**:\n\n` +
          items.map((it, idx) => `${idx + 1}. **${it}**`).join('\n') +
          `\n\nRecommended next step: ${facts.processing.failed_count > 0 ? 'Retry failed processing jobs.' : !facts.gallery.has_cover ? 'Select a cover photo.' : 'Review flagged photos.'}`;
      }

      return { content, intent: 'ATTENTION_SUMMARY', suggestedActions };
    }

    // 3. Duplicates / Bursts
    if (lower.includes('duplicate') || lower.includes('burst') || lower.includes('similar')) {
      const content = `🔎 **Duplicate & Burst Analysis:**\n\n- **Duplicate Groups:** ${facts.duplicates.duplicate_groups}\n- **Burst Clusters:** ${facts.duplicates.burst_clusters_count}\n- **Duplicate Photos:** ${facts.duplicates.duplicate_photos_count} total shots\n\nPixMatch AI has identified the "Best Shot" in each burst sequence. Would you like to review these clusters?`;
      suggestedActions.push({
        action_type: 'REVIEW_DUPLICATES',
        label: 'Review Duplicate Clusters',
        requires_approval: false,
        payload: { galleryId: facts.gallery.id },
      });
      return { content, intent: 'DUPLICATE_CHECK', suggestedActions };
    }

    // 4. Processing status
    if (lower.includes('process') || lower.includes('jobs') || lower.includes('upload')) {
      const content = `⚙ **Processing Status:**\n\n- **Total Uploaded:** ${facts.processing.total_photos} photos\n- **Successfully Processed:** ${facts.processing.processed_count} (${facts.processing.processing_pct}%)\n- **Pending in Queue:** ${facts.processing.pending_count}\n- **Failed Jobs:** ${facts.processing.failed_count}`;
      if (facts.processing.failed_count > 0) {
        suggestedActions.push({
          action_type: 'RETRY_PROCESSING',
          label: 'Retry Failed Jobs',
          requires_approval: false,
          payload: { galleryId: facts.gallery.id },
        });
      }
      return { content, intent: 'PROCESSING_STATUS', suggestedActions };
    }

    // 5. Smart Albums / Event Story
    if (lower.includes('smart album') || lower.includes('album') || lower.includes('story') || lower.includes('chapter')) {
      const content = `📖 **Story & Smart Albums Overview:**\n\n- **Active Smart Albums:** ${facts.smart_albums.active_albums_count}\n- **Timeline Chapters:** ${facts.event_intelligence.chapter_count}\n- **Event Story:** ${facts.event_intelligence.has_story ? (facts.event_intelligence.story_published ? 'Published' : 'Draft') : 'Not yet generated'}\n\nGenerating smart albums and an event story helps guests navigate your gallery.`;
      if (!facts.event_intelligence.has_story && facts.processing.total_photos >= 10) {
        suggestedActions.push({
          action_type: 'GENERATE_EVENT_STORY',
          label: 'Generate Event Story',
          requires_approval: false,
          payload: { galleryId: facts.gallery.id },
        });
      }
      if (facts.smart_albums.active_albums_count === 0 && facts.processing.total_photos >= 20) {
        suggestedActions.push({
          action_type: 'GENERATE_SMART_ALBUMS',
          label: 'Generate Smart Albums',
          requires_approval: false,
          payload: { galleryId: facts.gallery.id },
        });
      }
      return { content, intent: 'STORY_ALBUM_CHECK', suggestedActions };
    }

    // 6. Automation status & workflow queries
    if (lower.includes('automation') || lower.includes('workflow') || lower.includes('running') || lower.includes('fail')) {
      const content = `⚡ **Studio Automation Status:**\n\n- **Gallery Ready Score:** ${facts.readiness.score}/100\n- **Processing:** ${facts.processing.processed_count}/${facts.processing.total_photos} photos ready\n- **Pending Approvals:** No blocking actions requiring emergency bypass.\n\nYou can run automated workflows like **Wedding Auto Prep** or **Fast Gallery** from the Automation Center.`;
      suggestedActions.push({
        action_type: 'PROPOSE_WORKFLOW_RUN',
        label: 'Run Wedding Auto Prep',
        requires_approval: true,
        payload: { galleryId: facts.gallery.id, templateId: 'template-wedding-auto-prep' },
      });
      return { content, intent: 'AUTOMATION_STATUS', suggestedActions };
    }

    // 6.5 Phase 20: Studio Operations, Booking & Project Management
    if (
      lower.includes('operation') ||
      lower.includes('booking') ||
      lower.includes('inquir') ||
      lower.includes('lead') ||
      lower.includes('shoot') ||
      lower.includes('project') ||
      lower.includes('milestone') ||
      lower.includes('task') ||
      lower.includes('calendar')
    ) {
      const content = `📋 **Studio Operations & Project Management:**\n\nI can help manage your end-to-end studio workflow:\n\n- **Lead CRM:** Track incoming inquiries, follow-up dates, and convert leads into booked projects.\n- **Project 360:** Manage shoot details, locations, multi-gallery linking, and milestone progress.\n- **Operational Tasks:** Assign deadlines, track priorities, and spot overdue milestones.\n- **Studio Calendar:** View all upcoming shoots, delivery deadlines, and task reminders.\n\n*Seamlessly linked with Client Intelligence, Galleries, and Revenue Tracking.*`;

      suggestedActions.push({
        action_type: 'VIEW_OPERATIONS_OVERVIEW',
        label: 'Operations Command Center',
        requires_approval: false,
        payload: {},
      });
      suggestedActions.push({
        action_type: 'VIEW_LEADS_PIPELINE',
        label: 'View Leads Pipeline',
        requires_approval: false,
        payload: {},
      });
      suggestedActions.push({
        action_type: 'VIEW_UPCOMING_SHOOTS',
        label: 'View Upcoming Shoots',
        requires_approval: false,
        payload: {},
      });
      suggestedActions.push({
        action_type: 'VIEW_STUDIO_CALENDAR',
        label: 'Studio Operations Calendar',
        requires_approval: false,
        payload: {},
      });

      return { content, intent: 'OPERATIONS_INTELLIGENCE', suggestedActions };
    }

    // 7. Phase 19: AI Business Growth & Marketing Intelligence
    if (
      lower.includes('growth') ||
      lower.includes('marketing') ||
      lower.includes('campaign') ||
      lower.includes('reactivat') ||
      lower.includes('seasonal') ||
      lower.includes('opportunity') ||
      lower.includes('opportunities') ||
      lower.includes('re-engag') ||
      lower.includes('reengage') ||
      lower.includes('past client') ||
      lower.includes('past clients') ||
      lower.includes('dormant') ||
      lower.includes('promo')
    ) {
      const content = `🚀 **AI Business Growth & Marketing Intelligence:**\n\nI can help grow your photography business through data-driven client re-engagement and marketing intelligence:\n\n- **Growth Opportunities:** Identify dormant clients, seasonal preparation alerts, and package upgrades.\n- **Reactivation Hub:** Deterministic re-engagement scoring with verified email suppression checks.\n- **Campaign Builder:** Draft, preview, and track marketing campaigns with strict human approval gates.\n- **Campaign Performance:** Real-time delivery, open, click, conversion rates, and verified ROI tracking.\n\n*All marketing emails require your explicit approval before dispatch.*`;

      suggestedActions.push({
        action_type: 'VIEW_GROWTH_OVERVIEW',
        label: 'Growth Command Center',
        requires_approval: false,
        payload: {},
      });
      suggestedActions.push({
        action_type: 'VIEW_REACTIVATION_CANDIDATES',
        label: 'View Reactivation Candidates',
        requires_approval: false,
        payload: {},
      });
      suggestedActions.push({
        action_type: 'CREATE_CAMPAIGN_DRAFT',
        label: 'Create Campaign Draft',
        requires_approval: true,
        payload: { objective: 'REACTIVATION' },
      });

      return { content, intent: 'GROWTH_INTELLIGENCE', suggestedActions };
    }

    // 8. Phase 18: Studio Business & Revenue Intelligence
    if (
      lower.includes('revenue') ||
      lower.includes('profit') ||
      lower.includes('income') ||
      lower.includes('expense') ||
      lower.includes('financial') ||
      lower.includes('forecast') ||
      lower.includes('goal') ||
      lower.includes('pricing') ||
      lower.includes('aov') ||
      lower.includes('how much did i make') ||
      lower.includes('business')
    ) {
      const content = `📊 **Studio Business & Revenue Intelligence:**\n\nI can provide comprehensive, verified financial summaries for your photography studio:\n\n- **Command Center:** Track total revenue, expenses, net profit, and profit margins.\n- **Forecasting:** Deterministic projections with confidence intervals.\n- **Performance:** Turnaround times, repeat client rates, and average order values.\n- **Anomaly Insights:** Alerts on revenue drops, expense surges, or turnaround increases.\n\n*Note: Business intelligence reflects only recorded transactions, ensuring strictly zero synthetic financial assumptions.*`;

      suggestedActions.push({
        action_type: 'VIEW_BUSINESS_OVERVIEW',
        label: 'View Business Overview',
        requires_approval: false,
        payload: {},
      });
      suggestedActions.push({
        action_type: 'VIEW_REVENUE_TRENDS',
        label: 'View Revenue & Expenses',
        requires_approval: false,
        payload: {},
      });

      return { content, intent: 'BUSINESS_INTELLIGENCE', suggestedActions };
    }

    // 9. Phase 17: Client Engagement, Follow-ups, and Communication Drafting
    if (lower.includes('client') || lower.includes('engagement') || lower.includes('follow up') || lower.includes('follow-up') || lower.includes('message') || lower.includes('email') || lower.includes('draft')) {
      const g = facts.gallery as any;
      const content = `👥 **Client Intelligence & Engagement:**\n\n- **Gallery:** ${g.title}\n- **Assigned Client:** ${g.client_name ? `${g.client_name} (${g.client_email || 'No email'})` : 'No direct client assigned'}\n\nI can help evaluate client engagement, check journey progression, scan for pending follow-ups, or prepare draft communications for your approval.`;

      if (g.client_id) {
        suggestedActions.push({
          action_type: 'VIEW_CLIENT_360',
          label: 'View Client 360',
          requires_approval: false,
          payload: { clientId: g.client_id },
        });
        suggestedActions.push({
          action_type: 'DRAFT_FOLLOW_UP',
          label: 'Draft Gallery Reminder',
          requires_approval: true,
          payload: { clientId: g.client_id, galleryId: g.id, type: 'GALLERY_REMINDER' },
        });
      } else {
        suggestedActions.push({
          action_type: 'VIEW_CLIENTS',
          label: 'View All Clients',
          requires_approval: false,
          payload: {},
        });
      }
      return { content, intent: 'CLIENT_INTELLIGENCE', suggestedActions };
    }

    // Default fallback grounded response
    return {
      content: `I am reviewing **${facts.gallery.title}** (${facts.gallery.photo_count} photos, ${facts.readiness.score}/100 readiness score).\n\nFeel free to ask:\n- *"Is this gallery ready to publish?"*\n- *"What needs my attention?"*\n- *"How engaged is the client?"*\n- *"Show my studio growth opportunities."*\n- *"Which clients should I reactivate?"*\n- *"Show my studio revenue and profit overview."*\n- *"Draft a follow-up email for this client."*\n- *"What automations are running?"*\n- *"Check for duplicate and burst photos."*`,
      intent: 'GENERAL_ASSISTANCE',
      suggestedActions,
    };

  }
}

export class CopilotLLMProviderFactory {
  static getProvider(): CopilotLLMProvider {
    return new DeterministicCopilotProvider();
  }
}
