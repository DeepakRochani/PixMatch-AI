import { prisma, ProcessingStatus, DownloadJobStatus } from '@pixmatch/database';
import {
  AnalyticsOverviewDTO,
  AnalyticsTimeseriesPointDTO,
  GalleryAnalyticsItemDTO,
  ClientAnalyticsSummaryDTO,
  AiAnalyticsSummaryDTO,
  StorageAnalyticsSummaryDTO,
  DownloadAnalyticsSummaryDTO,
  AnalyticsMetricComparison,
} from '@pixmatch/types';

export class AnalyticsService {
  /**
   * Parses date range presets or custom boundaries and determines the previous comparison period.
   */
  static parseDateRange(preset?: string, fromStr?: string, toStr?: string) {
    const now = new Date();
    let from: Date;
    let to: Date = new Date(now);

    const activePreset = preset || (!fromStr && !toStr ? '30d' : 'custom');

    switch (activePreset) {
      case 'today': {
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        break;
      }
      case '7d': {
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      }
      case '30d': {
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      }
      case '90d': {
        from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      }
      case 'year': {
        from = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
        break;
      }
      case 'custom':
      default: {
        from = fromStr ? new Date(fromStr) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        to = toStr ? new Date(toStr) : new Date(now);
        break;
      }
    }

    const durationMs = to.getTime() - from.getTime();
    const previousTo = new Date(from.getTime() - 1);
    const previousFrom = new Date(previousTo.getTime() - durationMs);

    return {
      from,
      to,
      previousFrom,
      previousTo,
      preset: activePreset,
    };
  }

  /**
   * Helper to compute safe comparison metric with percentage change and trend.
   */
  static computeComparison(current: number, previous: number): AnalyticsMetricComparison {
    let changePercentage = 0;
    if (previous === 0) {
      changePercentage = current > 0 ? 100 : 0;
    } else {
      changePercentage = Math.round(((current - previous) / previous) * 1000) / 10;
    }

    let trend: 'UP' | 'DOWN' | 'NEUTRAL' = 'NEUTRAL';
    if (current > previous) trend = 'UP';
    else if (current < previous) trend = 'DOWN';

    return {
      current,
      previous,
      change_percentage: changePercentage,
      trend,
    };
  }

  /**
   * Sanitizes string values to prevent CSV / Formula Injection in Excel and Google Sheets.
   * If a value starts with =, +, -, @, \t, or \r, prefix it with a single quote.
   */
  static sanitizeCsvField(val: string | number | null | undefined): string {
    if (val === null || val === undefined) return '';
    let str = String(val);
    if (/^[=+\-@\t\r]/.test(str)) {
      str = `'${str}`;
    }
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r') || str.includes('\t')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  /**
   * GET /api/v1/analytics/overview
   */
  static async getOverview(studioId: string, range: ReturnType<typeof AnalyticsService.parseDateRange>): Promise<AnalyticsOverviewDTO> {
    const { from, to, previousFrom, previousTo } = range;

    // 1. Static aggregate totals
    const [
      totalGalleries,
      totalPhotos,
      aiIndexedPhotos,
      totalClients,
      totalStorageSum,
      recentGalleries,
      recentJobs,
    ] = await Promise.all([
      prisma.gallery.count({ where: { studio_id: studioId } }),
      prisma.photo.count({ where: { studio_id: studioId } }),
      prisma.photo.count({ where: { studio_id: studioId, is_face_indexed: true } }),
      prisma.client.count({ where: { studio_id: studioId, deleted_at: null } }),
      prisma.photo.aggregate({
        where: { studio_id: studioId },
        _sum: { file_size: true },
      }),
      prisma.gallery.findMany({
        where: { studio_id: studioId },
        take: 5,
        orderBy: { created_at: 'desc' },
        include: {
          _count: { select: { photos: true, clients: true, favorites: true, selections: true, client_sessions: true } },
        },
      }),
      prisma.processingJob.findMany({
        where: { studio_id: studioId },
        take: 10,
        orderBy: { created_at: 'desc' },
      }),
    ]);

    const storageUsedBytes = Number(totalStorageSum._sum.file_size || 0);

    // 2. Current period event metrics
    const [
      currSessions,
      currUniqueVisitors,
      currFavorites,
      currSelections,
      currDownloads,
      currDownloadSum,
      currAiSearches,
      currAiMatches,
      currDeliveriesSent,
      currDeliveriesOpened,
    ] = await Promise.all([
      prisma.galleryClientSession.count({
        where: { gallery: { studio_id: studioId }, created_at: { gte: from, lte: to } },
      }),
      prisma.galleryClientSession.groupBy({
        by: ['session_token_hash'],
        where: { gallery: { studio_id: studioId }, created_at: { gte: from, lte: to } },
      }).then((res) => res.length),
      prisma.galleryFavorite.count({
        where: { gallery: { studio_id: studioId }, created_at: { gte: from, lte: to } },
      }),
      prisma.gallerySelection.count({
        where: { gallery: { studio_id: studioId }, created_at: { gte: from, lte: to } },
      }),
      prisma.clientDownloadJob.count({
        where: { gallery: { studio_id: studioId }, created_at: { gte: from, lte: to } },
      }),
      prisma.clientDownloadJob.aggregate({
        where: { gallery: { studio_id: studioId }, created_at: { gte: from, lte: to } },
        _sum: { file_size: true },
      }),
      prisma.aiSearchLog.count({
        where: { studio_id: studioId, created_at: { gte: from, lte: to } },
      }),
      prisma.aiSearchLog.aggregate({
        where: { studio_id: studioId, created_at: { gte: from, lte: to } },
        _sum: { matches_count: true },
      }),
      prisma.galleryDelivery.count({
        where: { studio_id: studioId, sent_at: { gte: from, lte: to } },
      }),
      prisma.galleryDelivery.count({
        where: { studio_id: studioId, status: { in: ['OPENED', 'ACTIVE', 'COMPLETED'] }, sent_at: { gte: from, lte: to } },
      }),
    ]);

    // 3. Previous period event metrics
    const [
      prevSessions,
      prevUniqueVisitors,
      prevFavorites,
      prevSelections,
      prevDownloads,
      prevDownloadSum,
      prevAiSearches,
      prevAiMatches,
      prevDeliveriesSent,
      prevDeliveriesOpened,
    ] = await Promise.all([
      prisma.galleryClientSession.count({
        where: { gallery: { studio_id: studioId }, created_at: { gte: previousFrom, lte: previousTo } },
      }),
      prisma.galleryClientSession.groupBy({
        by: ['session_token_hash'],
        where: { gallery: { studio_id: studioId }, created_at: { gte: previousFrom, lte: previousTo } },
      }).then((res) => res.length),
      prisma.galleryFavorite.count({
        where: { gallery: { studio_id: studioId }, created_at: { gte: previousFrom, lte: previousTo } },
      }),
      prisma.gallerySelection.count({
        where: { gallery: { studio_id: studioId }, created_at: { gte: previousFrom, lte: previousTo } },
      }),
      prisma.clientDownloadJob.count({
        where: { gallery: { studio_id: studioId }, created_at: { gte: previousFrom, lte: previousTo } },
      }),
      prisma.clientDownloadJob.aggregate({
        where: { gallery: { studio_id: studioId }, created_at: { gte: previousFrom, lte: previousTo } },
        _sum: { file_size: true },
      }),
      prisma.aiSearchLog.count({
        where: { studio_id: studioId, created_at: { gte: previousFrom, lte: previousTo } },
      }),
      prisma.aiSearchLog.aggregate({
        where: { studio_id: studioId, created_at: { gte: previousFrom, lte: previousTo } },
        _sum: { matches_count: true },
      }),
      prisma.galleryDelivery.count({
        where: { studio_id: studioId, sent_at: { gte: previousFrom, lte: previousTo } },
      }),
      prisma.galleryDelivery.count({
        where: { studio_id: studioId, status: { in: ['OPENED', 'ACTIVE', 'COMPLETED'] }, sent_at: { gte: previousFrom, lte: previousTo } },
      }),
    ]);

    const currDownloadBytes = Number(currDownloadSum._sum.file_size || 0);
    const prevDownloadBytes = Number(prevDownloadSum._sum.file_size || 0);

    const currTotalMatches = currAiMatches._sum.matches_count || 0;
    const prevTotalMatches = prevAiMatches._sum.matches_count || 0;

    const currMatchRate = currAiSearches > 0 ? Math.round((currTotalMatches > 0 ? (currTotalMatches / currAiSearches) : 0) * 100) : 0;
    const prevMatchRate = prevAiSearches > 0 ? Math.round((prevTotalMatches > 0 ? (prevTotalMatches / prevAiSearches) : 0) * 100) : 0;

    const currOpenRate = currDeliveriesSent > 0 ? Math.round((currDeliveriesOpened / currDeliveriesSent) * 100) : 0;
    const prevOpenRate = prevDeliveriesSent > 0 ? Math.round((prevDeliveriesOpened / prevDeliveriesSent) * 100) : 0;

    // 4. Deterministic text insights
    const insights: string[] = [];
    if (currSessions > prevSessions) {
      const pct = prevSessions > 0 ? Math.round(((currSessions - prevSessions) / prevSessions) * 100) : 100;
      insights.push(`Gallery traffic increased by ${pct}% compared to the previous period.`);
    } else if (currSessions < prevSessions && prevSessions > 0) {
      const pct = Math.round(((prevSessions - currSessions) / prevSessions) * 100);
      insights.push(`Gallery traffic dipped by ${pct}% vs prior period.`);
    }

    if (currFavorites > 0) {
      insights.push(`Clients favorited ${currFavorites} photos during this window.`);
    }

    if (currAiSearches > 0) {
      insights.push(`Find My Photos was used ${currAiSearches} times with an average match rate of ${currMatchRate}%.`);
    }

    if (currDeliveriesSent > 0) {
      insights.push(`Gallery delivery open rate is currently at ${currOpenRate}%.`);
    }

    if (insights.length === 0) {
      insights.push('Share your galleries with clients to start generating live engagement metrics.');
    }

    return {
      period: {
        from: from.toISOString(),
        to: to.toISOString(),
        preset: range.preset as any,
        previous_from: previousFrom.toISOString(),
        previous_to: previousTo.toISOString(),
      },
      metrics: {
        total_galleries: totalGalleries,
        total_photos: totalPhotos,
        total_clients: totalClients,
        gallery_views: this.computeComparison(currSessions, prevSessions),
        unique_visitors: this.computeComparison(currUniqueVisitors, prevUniqueVisitors),
        favorites: this.computeComparison(currFavorites, prevFavorites),
        selections: this.computeComparison(currSelections, prevSelections),
        downloads: this.computeComparison(currDownloads, prevDownloads),
        download_bytes: this.computeComparison(currDownloadBytes, prevDownloadBytes),
        find_my_photos_searches: this.computeComparison(currAiSearches, prevAiSearches),
        find_my_photos_matches: this.computeComparison(currTotalMatches, prevTotalMatches),
        match_rate_percentage: this.computeComparison(currMatchRate, prevMatchRate),
        delivery_open_rate_percentage: this.computeComparison(currOpenRate, prevOpenRate),
        storage_used_bytes: storageUsedBytes,
        // Backward-compatibility aliases for dashboard
        totalGalleries,
        totalPhotos,
        aiIndexedPhotos,
        totalClients,
        storageUsedBytes,
        aiSearches: currAiSearches || aiIndexedPhotos,
        clientVisits: currSessions,
        totalFavorites: currFavorites,
        totalSelections: currSelections,
        downloadsCount: currDownloads,
      } as any,
      engagement_funnel: {
        delivered: currDeliveriesSent,
        opened: currDeliveriesOpened,
        viewed: currSessions,
        favorited: currFavorites,
        selected: currSelections,
        downloaded: currDownloads,
      },
      deterministic_insights: insights,
      recentGalleries: recentGalleries.map((g) => ({
        id: g.id,
        title: g.title,
        slug: g.slug,
        cover_photo_url: g.cover_photo_url,
        event_type: g.event_type,
        event_date: g.event_date.toISOString(),
        status: g.status,
        photo_count: g._count.photos,
        client_count: g._count.clients,
        favorites_count: g._count.favorites,
        selections_count: g._count.selections,
        client_views: g._count.client_sessions,
      })) as any,
      recentJobs: recentJobs.map((j) => ({
        id: j.id,
        job_type: j.job_type,
        status: j.status,
        progress: j.progress,
        created_at: j.created_at.toISOString(),
      })) as any,
    } as unknown as AnalyticsOverviewDTO;
  }

  /**
   * GET /api/v1/analytics/timeseries
   */
  static async getTimeseries(
    studioId: string,
    range: ReturnType<typeof AnalyticsService.parseDateRange>
  ): Promise<AnalyticsTimeseriesPointDTO[]> {
    const { from, to } = range;

    // Generate date buckets
    const pointsMap = new Map<string, AnalyticsTimeseriesPointDTO>();
    const current = new Date(from);
    current.setHours(0, 0, 0, 0);

    const end = new Date(to);
    end.setHours(23, 59, 59, 999);

    while (current <= end) {
      const key = current.toISOString().slice(0, 10);
      pointsMap.set(key, {
        date: key,
        gallery_views: 0,
        unique_visitors: 0,
        favorites: 0,
        selections: 0,
        downloads: 0,
        find_my_photos_searches: 0,
        find_my_photos_matches: 0,
        delivery_sends: 0,
        delivery_opens: 0,
        photos_processed: 0,
      });
      current.setDate(current.getDate() + 1);
    }

    // Query events in range
    const [sessions, favorites, selections, downloads, aiSearches, deliveries, processingJobs] = await Promise.all([
      prisma.galleryClientSession.findMany({
        where: { gallery: { studio_id: studioId }, created_at: { gte: from, lte: to } },
        select: { created_at: true, session_token_hash: true },
      }),
      prisma.galleryFavorite.findMany({
        where: { gallery: { studio_id: studioId }, created_at: { gte: from, lte: to } },
        select: { created_at: true },
      }),
      prisma.gallerySelection.findMany({
        where: { gallery: { studio_id: studioId }, created_at: { gte: from, lte: to } },
        select: { created_at: true },
      }),
      prisma.clientDownloadJob.findMany({
        where: { gallery: { studio_id: studioId }, created_at: { gte: from, lte: to } },
        select: { created_at: true },
      }),
      prisma.aiSearchLog.findMany({
        where: { studio_id: studioId, created_at: { gte: from, lte: to } },
        select: { created_at: true, matches_count: true },
      }),
      prisma.galleryDelivery.findMany({
        where: { studio_id: studioId, sent_at: { gte: from, lte: to } },
        select: { sent_at: true, status: true },
      }),
      prisma.processingJob.findMany({
        where: { studio_id: studioId, status: ProcessingStatus.COMPLETED, created_at: { gte: from, lte: to } },
        select: { created_at: true },
      }),
    ]);

    // Populate daily points
    for (const s of sessions) {
      const key = s.created_at.toISOString().slice(0, 10);
      const point = pointsMap.get(key);
      if (point) {
        point.gallery_views += 1;
        point.unique_visitors += 1;
      }
    }

    for (const f of favorites) {
      const key = f.created_at.toISOString().slice(0, 10);
      const point = pointsMap.get(key);
      if (point) point.favorites += 1;
    }

    for (const sel of selections) {
      const key = sel.created_at.toISOString().slice(0, 10);
      const point = pointsMap.get(key);
      if (point) point.selections += 1;
    }

    for (const d of downloads) {
      const key = d.created_at.toISOString().slice(0, 10);
      const point = pointsMap.get(key);
      if (point) point.downloads += 1;
    }

    for (const ai of aiSearches) {
      const key = ai.created_at.toISOString().slice(0, 10);
      const point = pointsMap.get(key);
      if (point) {
        point.find_my_photos_searches += 1;
        point.find_my_photos_matches += ai.matches_count;
      }
    }

    for (const del of deliveries) {
      const key = del.sent_at.toISOString().slice(0, 10);
      const point = pointsMap.get(key);
      if (point) {
        point.delivery_sends += 1;
        if (del.status === 'OPENED' || del.status === 'ACTIVE' || del.status === 'COMPLETED') {
          point.delivery_opens += 1;
        }
      }
    }

    for (const p of processingJobs) {
      const key = p.created_at.toISOString().slice(0, 10);
      const point = pointsMap.get(key);
      if (point) point.photos_processed += 1;
    }

    return Array.from(pointsMap.values());
  }

  /**
   * GET /api/v1/analytics/galleries
   */
  static async getGalleriesAnalytics(
    studioId: string,
    range: ReturnType<typeof AnalyticsService.parseDateRange>,
    limit = 50
  ): Promise<GalleryAnalyticsItemDTO[]> {
    const { from, to } = range;

    const galleries = await prisma.gallery.findMany({
      where: { studio_id: studioId },
      include: {
        _count: {
          select: {
            photos: true,
            favorites: true,
            selections: true,
            client_sessions: true,
            download_jobs: true,
          },
        },
        client_sessions: {
          where: { created_at: { gte: from, lte: to } },
          select: { id: true, created_at: true },
        },
        favorites: {
          where: { created_at: { gte: from, lte: to } },
          select: { id: true, created_at: true },
        },
        selections: {
          where: { created_at: { gte: from, lte: to } },
          select: { id: true, created_at: true },
        },
        download_jobs: {
          where: { created_at: { gte: from, lte: to } },
          select: { id: true, file_size: true, created_at: true },
        },
        ai_search_logs: {
          where: { created_at: { gte: from, lte: to } },
          select: { id: true, matches_count: true, created_at: true },
        },
      },
      take: limit,
      orderBy: { created_at: 'desc' },
    });

    return galleries.map((g) => {
      const views = g.client_sessions.length;
      const favs = g.favorites.length;
      const sels = g.selections.length;
      const dls = g.download_jobs.length;
      const dlBytes = g.download_jobs.reduce((acc, curr) => acc + Number(curr.file_size), 0);
      const searches = g.ai_search_logs.length;
      const matches = g.ai_search_logs.reduce((acc, curr) => acc + curr.matches_count, 0);

      // Deterministic Engagement Score: views*1 + favs*3 + sels*4 + dls*5 + searches*2
      const engagementScore = views * 1 + favs * 3 + sels * 4 + dls * 5 + searches * 2;
      const engagementRate = views > 0 ? Math.min(100, Math.round(((favs + sels + dls) / views) * 100)) : 0;

      // Determine latest activity
      const timestamps = [
        ...g.client_sessions.map((x) => x.created_at.getTime()),
        ...g.favorites.map((x) => x.created_at.getTime()),
        ...g.selections.map((x) => x.created_at.getTime()),
        ...g.download_jobs.map((x) => x.created_at.getTime()),
      ];
      const maxTs = timestamps.length > 0 ? Math.max(...timestamps) : null;

      return {
        id: g.id,
        title: g.title,
        slug: g.slug,
        cover_photo_url: g.cover_photo_url,
        event_type: g.event_type,
        event_date: g.event_date.toISOString(),
        status: g.status,
        photo_count: g._count.photos,
        views_count: views,
        unique_visitors_count: views,
        favorites_count: favs,
        selections_count: sels,
        downloads_count: dls,
        download_bytes: dlBytes,
        ai_searches_count: searches,
        ai_matches_count: matches,
        engagement_score: engagementScore,
        engagement_rate_percentage: engagementRate,
        last_activity_at: maxTs ? new Date(maxTs).toISOString() : null,
      };
    }).sort((a, b) => b.engagement_score - a.engagement_score);
  }

  /**
   * GET /api/v1/analytics/galleries/:id
   */
  static async getGalleryDetailAnalytics(
    studioId: string,
    galleryId: string,
    range: ReturnType<typeof AnalyticsService.parseDateRange>
  ) {
    const { from, to } = range;

    const gallery = await prisma.gallery.findFirst({
      where: { id: galleryId, studio_id: studioId },
      include: {
        _count: {
          select: {
            photos: true,
            favorites: true,
            selections: true,
            client_sessions: true,
            download_jobs: true,
            deliveries: true,
          },
        },
        client_sessions: {
          where: { created_at: { gte: from, lte: to } },
        },
        favorites: {
          where: { created_at: { gte: from, lte: to } },
        },
        selections: {
          where: { created_at: { gte: from, lte: to } },
        },
        download_jobs: {
          where: { created_at: { gte: from, lte: to } },
        },
        ai_search_logs: {
          where: { created_at: { gte: from, lte: to } },
        },
        deliveries: {
          where: { sent_at: { gte: from, lte: to } },
        },
      },
    });

    if (!gallery) {
      throw new Error('Gallery not found');
    }

    const downloadBytes = gallery.download_jobs.reduce((acc, curr) => acc + Number(curr.file_size), 0);
    const aiMatches = gallery.ai_search_logs.reduce((acc, curr) => acc + curr.matches_count, 0);
    const deliveriesSent = gallery.deliveries.length;
    const deliveriesOpened = gallery.deliveries.filter((d) => d.status === 'OPENED' || d.status === 'ACTIVE' || d.status === 'COMPLETED').length;

    return {
      gallery: {
        id: gallery.id,
        title: gallery.title,
        slug: gallery.slug,
        status: gallery.status,
        event_type: gallery.event_type,
        event_date: gallery.event_date.toISOString(),
      },
      stats: {
        total_photos: gallery._count.photos,
        views_count: gallery.client_sessions.length,
        unique_visitors: gallery.client_sessions.length,
        favorites_count: gallery.favorites.length,
        selections_count: gallery.selections.length,
        downloads_count: gallery.download_jobs.length,
        download_bytes: downloadBytes,
        find_my_photos_searches: gallery.ai_search_logs.length,
        find_my_photos_matches: aiMatches,
        deliveries_sent: deliveriesSent,
        deliveries_opened: deliveriesOpened,
        delivery_open_rate: deliveriesSent > 0 ? Math.round((deliveriesOpened / deliveriesSent) * 100) : 0,
      },
    };
  }

  /**
   * GET /api/v1/analytics/clients
   */
  static async getClientsAnalytics(
    studioId: string,
    range: ReturnType<typeof AnalyticsService.parseDateRange>
  ): Promise<ClientAnalyticsSummaryDTO> {
    const { from, to } = range;

    const [totalClients, newClients, clientsWithGalleries, clientsWithActivity] = await Promise.all([
      prisma.client.count({ where: { studio_id: studioId, deleted_at: null } }),
      prisma.client.count({ where: { studio_id: studioId, created_at: { gte: from, lte: to }, deleted_at: null } }),
      prisma.client.count({ where: { studio_id: studioId, galleries: { some: {} }, deleted_at: null } }),
      prisma.clientActivity.groupBy({
        by: ['client_id'],
        where: { studio_id: studioId, created_at: { gte: from, lte: to } },
      }),
    ]);

    const activeClientIds = clientsWithActivity.map((c) => c.client_id);

    const topClients = await prisma.client.findMany({
      where: { studio_id: studioId, deleted_at: null },
      include: {
        _count: { select: { galleries: true, activities: true } },
        activities: {
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
      take: 10,
      orderBy: { activities: { _count: 'desc' } },
    });

    return {
      total_clients: totalClients,
      new_clients_in_period: newClients,
      active_clients_in_period: activeClientIds.length,
      returning_clients_count: Math.max(0, totalClients - newClients),
      clients_with_galleries_count: clientsWithGalleries,
      top_active_clients: topClients.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        status: c.status,
        galleries_count: c._count.galleries,
        favorites_count: 0,
        selections_count: 0,
        downloads_count: 0,
        last_activity_at: c.activities[0]?.created_at.toISOString() || null,
      })),
    };
  }

  /**
   * GET /api/v1/analytics/ai
   */
  static async getAiAnalytics(
    studioId: string,
    range: ReturnType<typeof AnalyticsService.parseDateRange>
  ): Promise<AiAnalyticsSummaryDTO> {
    const { from, to } = range;

    const [searches, totalMatchesAgg, zeroMatchSearches, avgLatencyAgg, photosIndexed, facesIndexed, jobsCompleted, jobsFailed] = await Promise.all([
      prisma.aiSearchLog.count({ where: { studio_id: studioId, created_at: { gte: from, lte: to } } }),
      prisma.aiSearchLog.aggregate({
        where: { studio_id: studioId, created_at: { gte: from, lte: to } },
        _sum: { matches_count: true },
      }),
      prisma.aiSearchLog.count({
        where: { studio_id: studioId, matches_count: 0, created_at: { gte: from, lte: to } },
      }),
      prisma.aiSearchLog.aggregate({
        where: { studio_id: studioId, created_at: { gte: from, lte: to } },
        _avg: { processing_time_ms: true },
      }),
      prisma.photo.count({ where: { studio_id: studioId, is_face_indexed: true } }),
      prisma.faceDetection.count({ where: { studio_id: studioId } }),
      prisma.processingJob.count({
        where: { studio_id: studioId, job_type: 'FACE_INDEXING', status: ProcessingStatus.COMPLETED, created_at: { gte: from, lte: to } },
      }),
      prisma.processingJob.count({
        where: { studio_id: studioId, job_type: 'FACE_INDEXING', status: ProcessingStatus.FAILED, created_at: { gte: from, lte: to } },
      }),
    ]);

    const totalMatches = totalMatchesAgg._sum.matches_count || 0;
    const matchesSearches = searches - zeroMatchSearches;
    const matchRate = searches > 0 ? Math.round((matchesSearches / searches) * 100) : 0;
    const avgMatches = searches > 0 ? Math.round((totalMatches / searches) * 10) / 10 : 0;
    const avgLatency = Math.round(avgLatencyAgg._avg.processing_time_ms || 0);

    const totalJobs = jobsCompleted + jobsFailed;
    const successRate = totalJobs > 0 ? Math.round((jobsCompleted / totalJobs) * 100) : 100;

    return {
      total_searches: searches,
      searches_with_matches: matchesSearches,
      searches_with_no_match: zeroMatchSearches,
      match_rate_percentage: matchRate,
      total_matches: totalMatches,
      avg_matches_per_search: avgMatches,
      avg_processing_time_ms: avgLatency,
      photos_indexed_count: photosIndexed,
      faces_indexed_count: facesIndexed,
      jobs_completed: jobsCompleted,
      jobs_failed: jobsFailed,
      success_rate_percentage: successRate,
    };
  }

  /**
   * GET /api/v1/analytics/storage
   */
  static async getStorageAnalytics(studioId: string): Promise<StorageAnalyticsSummaryDTO> {
    const [photosCount, totalSizeAgg, subscription, galleries, connections] = await Promise.all([
      prisma.photo.count({ where: { studio_id: studioId } }),
      prisma.photo.aggregate({
        where: { studio_id: studioId },
        _sum: { file_size: true },
      }),
      prisma.subscription.findUnique({ where: { studio_id: studioId } }),
      prisma.gallery.findMany({
        where: { studio_id: studioId },
        include: {
          _count: { select: { photos: true } },
          photos: { select: { file_size: true } },
        },
      }),
      prisma.storageConnection.findMany({
        where: { studio_id: studioId },
        select: { provider: true, display_name: true, status: true, storage_used_bytes: true },
      }),
    ]);

    const totalBytes = Number(totalSizeAgg._sum.file_size || 0);
    const limitBytes = Number(subscription?.storage_limit_bytes || 2147483648); // 2GB default
    const usagePct = limitBytes > 0 ? Math.min(100, Math.round((totalBytes / limitBytes) * 100)) : 0;

    const galleryBreakdown = galleries.map((g) => {
      const gBytes = g.photos.reduce((acc, curr) => acc + Number(curr.file_size), 0);
      return {
        gallery_id: g.id,
        title: g.title,
        photo_count: g._count.photos,
        storage_bytes: gBytes,
        percentage_of_total: totalBytes > 0 ? Math.round((gBytes / totalBytes) * 100) : 0,
      };
    }).sort((a, b) => b.storage_bytes - a.storage_bytes);

    return {
      total_storage_bytes: totalBytes,
      photos_stored_count: photosCount,
      storage_limit_bytes: limitBytes,
      usage_percentage: usagePct,
      estimated_monthly_growth_bytes: Math.round(totalBytes * 0.15), // Estimated ~15% monthly velocity
      galleries_breakdown: galleryBreakdown,
      connected_storage_providers: connections.map((c) => ({
        provider: c.provider,
        display_name: c.display_name,
        status: c.status,
        storage_used_bytes: Number(c.storage_used_bytes),
      })),
    };
  }

  /**
   * GET /api/v1/analytics/downloads
   */
  static async getDownloadsAnalytics(
    studioId: string,
    range: ReturnType<typeof AnalyticsService.parseDateRange>
  ): Promise<DownloadAnalyticsSummaryDTO> {
    const { from, to } = range;

    const [downloadJobs, totalBytesAgg, galleries] = await Promise.all([
      prisma.clientDownloadJob.findMany({
        where: { gallery: { studio_id: studioId }, created_at: { gte: from, lte: to } },
        select: { id: true, photo_count: true, file_size: true, gallery_id: true },
      }),
      prisma.clientDownloadJob.aggregate({
        where: { gallery: { studio_id: studioId }, created_at: { gte: from, lte: to } },
        _sum: { file_size: true },
      }),
      prisma.gallery.findMany({
        where: { studio_id: studioId },
        select: { id: true, title: true },
      }),
    ]);

    const totalJobs = downloadJobs.length;
    const totalPhotos = downloadJobs.reduce((acc, curr) => acc + curr.photo_count, 0);
    const totalBytes = Number(totalBytesAgg._sum.file_size || 0);

    const singleDls = downloadJobs.filter((d) => d.photo_count === 1).length;
    const bulkDls = downloadJobs.filter((d) => d.photo_count > 1).length;

    const galleryMap = new Map(galleries.map((g) => [g.id, g.title]));
    const galleryDlMap = new Map<string, { count: number; bytes: number }>();

    for (const job of downloadJobs) {
      const existing = galleryDlMap.get(job.gallery_id) || { count: 0, bytes: 0 };
      existing.count += 1;
      existing.bytes += Number(job.file_size);
      galleryDlMap.set(job.gallery_id, existing);
    }

    const topGalleries = Array.from(galleryDlMap.entries()).map(([gid, stats]) => ({
      gallery_id: gid,
      title: galleryMap.get(gid) || 'Unknown Gallery',
      downloads_count: stats.count,
      download_bytes: stats.bytes,
    })).sort((a, b) => b.downloads_count - a.downloads_count);

    return {
      total_download_jobs: totalJobs,
      total_photos_downloaded: totalPhotos,
      total_download_bytes: totalBytes,
      single_downloads_count: singleDls,
      bulk_downloads_count: bulkDls,
      top_downloaded_galleries: topGalleries,
    };
  }

  /**
   * GET /api/v1/analytics/export
   * Exports analytics data as CSV (sanitized against formula injection) or JSON.
   */
  static async exportAnalytics(
    studioId: string,
    range: ReturnType<typeof AnalyticsService.parseDateRange>,
    format: 'csv' | 'json' = 'csv'
  ) {
    const [overview, timeseries, galleries, clients, ai] = await Promise.all([
      this.getOverview(studioId, range),
      this.getTimeseries(studioId, range),
      this.getGalleriesAnalytics(studioId, range),
      this.getClientsAnalytics(studioId, range),
      this.getAiAnalytics(studioId, range),
    ]);

    if (format === 'json') {
      return {
        exported_at: new Date().toISOString(),
        overview,
        timeseries,
        galleries,
        clients,
        ai,
      };
    }

    // CSV format generation with strict formula injection defense
    const lines: string[] = [];

    // Header Metadata
    lines.push('# PIXMATCH AI - STUDIO ANALYTICS REPORT');
    lines.push(`Report Generated,${new Date().toISOString()}`);
    lines.push(`Period From,${range.from.toISOString()}`);
    lines.push(`Period To,${range.to.toISOString()}`);
    lines.push('');

    // Overview KPIs
    lines.push('--- SUMMARY KPIS ---');
    lines.push('Metric,Current Value,Previous Value,Change %');
    lines.push(`Gallery Views,${overview.metrics.gallery_views.current},${overview.metrics.gallery_views.previous},${overview.metrics.gallery_views.change_percentage}%`);
    lines.push(`Unique Visitors,${overview.metrics.unique_visitors.current},${overview.metrics.unique_visitors.previous},${overview.metrics.unique_visitors.change_percentage}%`);
    lines.push(`Favorites,${overview.metrics.favorites.current},${overview.metrics.favorites.previous},${overview.metrics.favorites.change_percentage}%`);
    lines.push(`Selections,${overview.metrics.selections.current},${overview.metrics.selections.previous},${overview.metrics.selections.change_percentage}%`);
    lines.push(`Downloads,${overview.metrics.downloads.current},${overview.metrics.downloads.previous},${overview.metrics.downloads.change_percentage}%`);
    lines.push(`Find My Photos Searches,${overview.metrics.find_my_photos_searches.current},${overview.metrics.find_my_photos_searches.previous},${overview.metrics.find_my_photos_searches.change_percentage}%`);
    lines.push('');

    // Gallery Performance Table
    lines.push('--- GALLERY PERFORMANCE ---');
    lines.push('Gallery Title,Event Date,Status,Photos,Views,Favorites,Selections,Downloads,AI Searches,Engagement Score');
    for (const g of galleries) {
      lines.push([
        this.sanitizeCsvField(g.title),
        this.sanitizeCsvField(g.event_date.slice(0, 10)),
        this.sanitizeCsvField(g.status),
        g.photo_count,
        g.views_count,
        g.favorites_count,
        g.selections_count,
        g.downloads_count,
        g.ai_searches_count,
        g.engagement_score,
      ].join(','));
    }
    lines.push('');

    // Daily Timeseries Table
    lines.push('--- DAILY ENGAGEMENT TIMELINE ---');
    lines.push('Date,Views,Favorites,Selections,Downloads,AI Searches');
    for (const t of timeseries) {
      lines.push(`${t.date},${t.gallery_views},${t.favorites},${t.selections},${t.downloads},${t.find_my_photos_searches}`);
    }

    return lines.join('\n');
  }

  /**
   * Idempotently aggregates and upserts daily analytics for a studio and its galleries.
   */
  static async aggregateDaily(studioId: string, targetDate: Date = new Date()) {
    const dayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0);
    const dayEnd = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

    const [views, favorites, selections, downloads, dlSum, aiSearches, aiMatches, photosProcessed, storageSum, newClients, deliveries, opens] = await Promise.all([
      prisma.galleryClientSession.count({
        where: { gallery: { studio_id: studioId }, created_at: { gte: dayStart, lte: dayEnd } },
      }),
      prisma.galleryFavorite.count({
        where: { gallery: { studio_id: studioId }, created_at: { gte: dayStart, lte: dayEnd } },
      }),
      prisma.gallerySelection.count({
        where: { gallery: { studio_id: studioId }, created_at: { gte: dayStart, lte: dayEnd } },
      }),
      prisma.clientDownloadJob.count({
        where: { gallery: { studio_id: studioId }, created_at: { gte: dayStart, lte: dayEnd } },
      }),
      prisma.clientDownloadJob.aggregate({
        where: { gallery: { studio_id: studioId }, created_at: { gte: dayStart, lte: dayEnd } },
        _sum: { file_size: true },
      }),
      prisma.aiSearchLog.count({
        where: { studio_id: studioId, created_at: { gte: dayStart, lte: dayEnd } },
      }),
      prisma.aiSearchLog.aggregate({
        where: { studio_id: studioId, created_at: { gte: dayStart, lte: dayEnd } },
        _sum: { matches_count: true },
      }),
      prisma.processingJob.count({
        where: { studio_id: studioId, status: ProcessingStatus.COMPLETED, created_at: { gte: dayStart, lte: dayEnd } },
      }),
      prisma.photo.aggregate({
        where: { studio_id: studioId },
        _sum: { file_size: true },
      }),
      prisma.client.count({
        where: { studio_id: studioId, created_at: { gte: dayStart, lte: dayEnd } },
      }),
      prisma.galleryDelivery.count({
        where: { studio_id: studioId, sent_at: { gte: dayStart, lte: dayEnd } },
      }),
      prisma.galleryDelivery.count({
        where: { studio_id: studioId, status: { in: ['OPENED', 'ACTIVE', 'COMPLETED'] }, sent_at: { gte: dayStart, lte: dayEnd } },
      }),
    ]);

    const downloadBytes = BigInt(dlSum._sum.file_size || 0);
    const storageBytes = BigInt(storageSum._sum.file_size || 0);
    const matchesCount = aiMatches._sum.matches_count || 0;

    await prisma.studioAnalyticsDaily.upsert({
      where: {
        studio_id_date: {
          studio_id: studioId,
          date: dayStart,
        },
      },
      update: {
        gallery_views: views,
        unique_gallery_visitors: views,
        photo_views: views,
        favorites: favorites,
        selections: selections,
        downloads: downloads,
        download_bytes: downloadBytes,
        find_my_photos_searches: aiSearches,
        find_my_photos_matches: matchesCount,
        photos_processed: photosProcessed,
        storage_bytes: storageBytes,
        new_clients: newClients,
        gallery_deliveries: deliveries,
        gallery_opens: opens,
        updated_at: new Date(),
      },
      create: {
        studio_id: studioId,
        date: dayStart,
        gallery_views: views,
        unique_gallery_visitors: views,
        photo_views: views,
        favorites: favorites,
        selections: selections,
        downloads: downloads,
        download_bytes: downloadBytes,
        find_my_photos_searches: aiSearches,
        find_my_photos_matches: matchesCount,
        photos_processed: photosProcessed,
        storage_bytes: storageBytes,
        new_clients: newClients,
        gallery_deliveries: deliveries,
        gallery_opens: opens,
      },
    });

    return { success: true, date: dayStart.toISOString() };
  }

  /**
   * Resumable, transaction-safe backfill mechanism for previous days.
   */
  static async backfillDaily(studioId: string, days = 30) {
    const results = [];
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const res = await this.aggregateDaily(studioId, d);
      results.push(res);
    }
    return { success: true, backfilled_days: results.length };
  }
}
