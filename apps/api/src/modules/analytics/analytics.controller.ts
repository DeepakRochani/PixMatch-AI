import { FastifyRequest, FastifyReply } from 'fastify';
import { AnalyticsService } from './analytics.service.js';

export class AnalyticsController {
  /**
   * GET /api/v1/analytics/overview
   */
  static async getOverview(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;
    const query = request.query as { preset?: string; from?: string; to?: string };

    const range = AnalyticsService.parseDateRange(query.preset, query.from, query.to);
    const data = await AnalyticsService.getOverview(studioId, range);

    return reply.send({
      success: true,
      data,
    });
  }

  /**
   * GET /api/v1/analytics/timeseries
   */
  static async getTimeseries(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;
    const query = request.query as { preset?: string; from?: string; to?: string; interval?: string };

    const range = AnalyticsService.parseDateRange(query.preset, query.from, query.to);
    const timeseries = await AnalyticsService.getTimeseries(studioId, range);

    return reply.send({
      success: true,
      data: {
        points: timeseries,
        total_points: timeseries.length,
      },
    });
  }

  /**
   * GET /api/v1/analytics/galleries
   */
  static async getGalleries(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;
    const query = request.query as { preset?: string; from?: string; to?: string; limit?: string };
    const limit = query.limit ? parseInt(query.limit, 10) : 50;

    const range = AnalyticsService.parseDateRange(query.preset, query.from, query.to);
    const galleries = await AnalyticsService.getGalleriesAnalytics(studioId, range, limit);

    return reply.send({
      success: true,
      data: {
        galleries,
        total: galleries.length,
      },
    });
  }

  /**
   * GET /api/v1/analytics/galleries/:id
   */
  static async getGalleryDetail(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;
    const { id } = request.params as { id: string };
    const query = request.query as { preset?: string; from?: string; to?: string };

    const range = AnalyticsService.parseDateRange(query.preset, query.from, query.to);
    try {
      const data = await AnalyticsService.getGalleryDetailAnalytics(studioId, id, range);
      return reply.send({
        success: true,
        data,
      });
    } catch {
      return reply.status(404).send({
        success: false,
        error: { code: 'GALLERY_NOT_FOUND', message: 'Gallery not found' },
      });
    }
  }

  /**
   * GET /api/v1/analytics/clients
   */
  static async getClients(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;
    const query = request.query as { preset?: string; from?: string; to?: string };

    const range = AnalyticsService.parseDateRange(query.preset, query.from, query.to);
    const data = await AnalyticsService.getClientsAnalytics(studioId, range);

    return reply.send({
      success: true,
      data,
    });
  }

  /**
   * GET /api/v1/analytics/ai
   */
  static async getAi(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;
    const query = request.query as { preset?: string; from?: string; to?: string };

    const range = AnalyticsService.parseDateRange(query.preset, query.from, query.to);
    const data = await AnalyticsService.getAiAnalytics(studioId, range);

    return reply.send({
      success: true,
      data,
    });
  }

  /**
   * GET /api/v1/analytics/storage
   */
  static async getStorage(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;
    const data = await AnalyticsService.getStorageAnalytics(studioId);

    return reply.send({
      success: true,
      data,
    });
  }

  /**
   * GET /api/v1/analytics/downloads
   */
  static async getDownloads(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;
    const query = request.query as { preset?: string; from?: string; to?: string };

    const range = AnalyticsService.parseDateRange(query.preset, query.from, query.to);
    const data = await AnalyticsService.getDownloadsAnalytics(studioId, range);

    return reply.send({
      success: true,
      data,
    });
  }

  /**
   * GET /api/v1/analytics/export
   */
  static async exportData(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;
    const query = request.query as { preset?: string; from?: string; to?: string; format?: 'csv' | 'json' };
    const format = query.format === 'json' ? 'json' : 'csv';

    const range = AnalyticsService.parseDateRange(query.preset, query.from, query.to);
    const result = await AnalyticsService.exportAnalytics(studioId, range, format);

    if (format === 'json') {
      return reply.send({
        success: true,
        data: result,
      });
    }

    const filename = `studio-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    return reply
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .send(result);
  }

  /**
   * POST /api/v1/analytics/aggregate
   */
  static async triggerAggregate(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;
    const res = await AnalyticsService.aggregateDaily(studioId);
    return reply.send({
      success: true,
      data: res,
    });
  }

  /**
   * POST /api/v1/analytics/backfill
   */
  static async triggerBackfill(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;
    const body = request.body as { days?: number };
    const days = Math.min(Math.max(body?.days || 30, 1), 365);

    const res = await AnalyticsService.backfillDaily(studioId, days);
    return reply.send({
      success: true,
      data: res,
    });
  }
}
