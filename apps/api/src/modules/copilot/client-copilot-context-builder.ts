/**
 * Client Copilot Context Builder — PIXMatch AI Phase 17
 * Constructs fact-grounded context strings for AI Photographer Copilot queries regarding clients.
 */

import { prisma } from '@pixmatch/database';
import { Client360Service } from '../client-intelligence/client-360.service.js';

export class ClientCopilotContextBuilder {
  private client360Service: Client360Service;
  private db: any;

  constructor(dbClient?: any) {
    this.db = dbClient || prisma;
    this.client360Service = new Client360Service(this.db);
  }

  /**
   * Builds sanitized factual context string for a specific client.
   */
  async buildClientContext(studioId: string, clientId: string): Promise<string> {
    const client360 = await this.client360Service.getClient360(studioId, clientId);
    if (!client360) {
      return `Client ${clientId} was not found in this studio.`;
    }

    const { client, engagement, journey, stats, galleries, insights, activeFollowUps, pendingDrafts } = client360;

    // Sanitize any freeform user input before injecting into prompt
    const sanitize = (val?: string | null) => (val || '').replace(/[\r\n`$]/g, ' ').slice(0, 100);

    const lines: string[] = [
      `=== FACTUAL CLIENT 360: ${sanitize(client.name)} (${client.id}) ===`,
      `Email: ${client.email}`,
      `Total Galleries: ${stats.totalGalleries}`,
      `Repeat Client: ${stats.isRepeatClient ? 'YES' : 'NO'}`,
      `Lifetime Value: $${(stats.lifetimeValue || 0).toFixed(2)}`,
      `First Seen: ${stats.firstSeenAt ? new Date(stats.firstSeenAt).toISOString().split('T')[0] : 'N/A'}`,
      `Last Active: ${stats.lastActiveAt ? new Date(stats.lastActiveAt).toISOString().split('T')[0] : 'N/A'}`,
      ``,
      `--- ENGAGEMENT & JOURNEY ---`,
      `Engagement Score: ${engagement.engagementScore}/100 (${engagement.state})`,
      `Engagement Recency Category: ${engagement.recencyCategory}`,
      `Current Journey Stage: ${journey.currentStage}`,
      `Previous Journey Stage: ${journey.previousStage || 'NONE'}`,
      `Total Logged Visits: ${engagement.totalVisits}`,
      `Total Photo Favorites: ${engagement.totalFavorites}`,
      `Total Selections Completed: ${engagement.totalSelections}`,
      `Total Downloads: ${engagement.totalDownloads}`,
      ``,
      `--- GALLERIES ENGAGEMENT ---`,
      ...galleries.map((g: any) =>
        `- Gallery "${sanitize(g.galleryTitle)}" (${g.galleryStatus}): Visits=${g.visitCount}, Favorites=${g.favoriteCount}, Selections=${g.selectionCount}, Downloads=${g.downloadCount}, LastActivity=${g.lastActivityAt ? new Date(g.lastActivityAt).toISOString().split('T')[0] : 'None'}`
      ),
      ``,
      `--- ACTIVE INSIGHTS (${insights.length}) ---`,
      ...insights.map((i: any) => `- [${i.severity}] ${i.type}: ${sanitize(i.title)} - ${sanitize(i.message)}`),
      ``,
      `--- PENDING FOLLOW-UP RECOMMENDATIONS (${activeFollowUps.length}) ---`,
      ...activeFollowUps.map((f: any) => `- [${f.priority}] ${f.type}: ${sanitize(f.title)} (${f.status})`),
      ``,
      `--- PENDING COMMUNICATION DRAFTS (${pendingDrafts.length}) ---`,
      ...pendingDrafts.map((d: any) => `- [${d.channel}] Status: ${d.status}, Subject: "${sanitize(d.subject)}"`),
      `======================================================`
    ];

    return lines.join('\n');
  }

  /**
   * Builds overview context for studio-level client intelligence.
   */
  async buildStudioOverviewContext(studioId: string): Promise<string> {
    const overview = (await this.client360Service.getClientIntelligenceOverview(studioId)) as any;

    return [
      `=== STUDIO CLIENT INTELLIGENCE OVERVIEW ===`,
      `Total Active Clients: ${overview.totalClients}`,
      `Average Engagement Score: ${overview.averageEngagementScore}/100`,
      `Engagement Distribution:`,
      `  - Engaged: ${overview.engagementDistribution.ENGAGED}`,
      `  - Active: ${overview.engagementDistribution.ACTIVE}`,
      `  - Low Engagement: ${overview.engagementDistribution.LOW_ENGAGEMENT}`,
      `  - At Risk: ${overview.engagementDistribution.AT_RISK}`,
      `  - Inactive: ${overview.engagementDistribution.INACTIVE}`,
      `Pending Follow-ups Count: ${overview.pendingFollowUpsCount}`,
      `Pending Drafts Count: ${overview.pendingDraftsCount}`,
      `============================================`
    ].join('\n');
  }
}
