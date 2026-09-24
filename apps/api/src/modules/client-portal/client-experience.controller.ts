/**
 * Client Experience Controller — PixMatch AI Phase 30
 * Advanced Client Experience & Gallery Experience 2.0
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { ClientExperienceService } from './client-experience.service.js';
import { ClientPortalSessionService } from './client-portal-session.service.js';

export class ClientExperienceController {
  /**
   * Applies standard Phase 30 client portal security & anti-caching headers.
   */
  private static applySecurityHeaders(reply: FastifyReply) {
    reply.header('Cache-Control', 'private, no-store');
    reply.header('X-Robots-Tag', 'noindex, noarchive');
    reply.header('X-Frame-Options', 'DENY');
  }

  /**
   * GET /api/client-portal/:token/experience
   * Aggregates the unified Client Experience Home dashboard.
   */
  static async getExperienceHome(request: FastifyRequest, reply: FastifyReply) {
    ClientExperienceController.applySecurityHeaders(reply);
    const { token } = request.params as { token: string };

    try {
      const data = await ClientExperienceService.getClientExperienceHome(token);
      return reply.send({ success: true, data });
    } catch (err: any) {
      const statusCode = err.statusCode || 500;
      return reply.code(statusCode).send({
        success: false,
        error: statusCode === 404 ? 'Client portal session not found or expired.' : (err.message || 'Internal server error'),
      });
    }
  }

  /**
   * POST /api/client-portal/:token/navigation-state
   * Save client "Continue where you left off" navigation state.
   */
  static async saveNavigationState(request: FastifyRequest, reply: FastifyReply) {
    ClientExperienceController.applySecurityHeaders(reply);
    const { token } = request.params as { token: string };
    const body = request.body as any;

    try {
      const updatedState = await ClientExperienceService.saveNavigationState(token, body);
      return reply.send({ success: true, data: updatedState });
    } catch (err: any) {
      const statusCode = err.statusCode || 500;
      return reply.code(statusCode).send({
        success: false,
        error: err.message || 'Failed to save navigation state',
      });
    }
  }

  /**
   * GET /api/client-portal/:token/navigation-state
   * Retrieve client "Continue where you left off" navigation state.
   */
  static async getNavigationState(request: FastifyRequest, reply: FastifyReply) {
    ClientExperienceController.applySecurityHeaders(reply);
    const { token } = request.params as { token: string };

    try {
      const state = await ClientExperienceService.getNavigationState(token);
      return reply.send({ success: true, data: state });
    } catch (err: any) {
      const statusCode = err.statusCode || 500;
      return reply.code(statusCode).send({
        success: false,
        error: err.message || 'Failed to retrieve navigation state',
      });
    }
  }

  /**
   * GET /api/client-portal/:token/timeline
   * Get Client-Safe Filtered Timeline (No internal CRM notes/scores).
   */
  static async getClientSafeTimeline(request: FastifyRequest, reply: FastifyReply) {
    ClientExperienceController.applySecurityHeaders(reply);
    const { token } = request.params as { token: string };
    const query = request.query as { page?: string; limit?: string };

    try {
      const page = query.page ? parseInt(query.page, 10) : 1;
      const limit = query.limit ? parseInt(query.limit, 10) : 20;

      const data = await ClientExperienceService.getClientSafeTimeline(token, { page, limit });
      return reply.send({ success: true, data });
    } catch (err: any) {
      const statusCode = err.statusCode || 500;
      return reply.code(statusCode).send({
        success: false,
        error: err.message || 'Failed to load timeline',
      });
    }
  }

  /**
   * GET /api/client-portal/:token/galleries/:galleryId/search
   * Client-facing safe search in gallery.
   */
  static async searchGallery(request: FastifyRequest, reply: FastifyReply) {
    ClientExperienceController.applySecurityHeaders(reply);
    const { token, galleryId } = request.params as { token: string; galleryId: string };
    const query = request.query as { q?: string; album_id?: string; page?: string; limit?: string };

    try {
      const page = query.page ? parseInt(query.page, 10) : 1;
      const limit = query.limit ? parseInt(query.limit, 10) : 24;

      const data = await ClientExperienceService.searchGallery(token, {
        gallery_id: galleryId,
        query: query.q || '',
        album_id: query.album_id,
        page,
        limit,
      });

      return reply.send({ success: true, data });
    } catch (err: any) {
      const statusCode = err.statusCode || 500;
      return reply.code(statusCode).send({
        success: false,
        error: err.message || 'Search failed',
      });
    }
  }

  /**
   * GET /api/client-portal/:token/photos/:photoId/lightbox
   * Lightbox 2.0 high-res photo metadata and next/previous links.
   */
  static async getLightboxPhoto(request: FastifyRequest, reply: FastifyReply) {
    ClientExperienceController.applySecurityHeaders(reply);
    const { token, photoId } = request.params as { token: string; photoId: string };

    try {
      const data = await ClientExperienceService.getLightboxPhoto(token, photoId);
      return reply.send({ success: true, data });
    } catch (err: any) {
      const statusCode = err.statusCode || 500;
      return reply.code(statusCode).send({
        success: false,
        error: err.message || 'Photo not found or inaccessible',
      });
    }
  }

  /**
   * POST /api/client-portal/:token/photos/:photoId/favorite
   * Toggle photo favorite.
   */
  static async toggleFavorite(request: FastifyRequest, reply: FastifyReply) {
    ClientExperienceController.applySecurityHeaders(reply);
    const { token, photoId } = request.params as { token: string; photoId: string };

    try {
      const data = await ClientExperienceService.toggleFavorite(token, photoId);
      return reply.send({ success: true, data });
    } catch (err: any) {
      const statusCode = err.statusCode || 500;
      return reply.code(statusCode).send({
        success: false,
        error: err.message || 'Failed to toggle favorite',
      });
    }
  }

  /**
   * POST /api/client-portal/:token/photos/:photoId/select
   * Toggle photo selection.
   */
  static async toggleSelection(request: FastifyRequest, reply: FastifyReply) {
    ClientExperienceController.applySecurityHeaders(reply);
    const { token, photoId } = request.params as { token: string; photoId: string };

    try {
      const data = await ClientExperienceService.toggleSelection(token, photoId);
      return reply.send({ success: true, data });
    } catch (err: any) {
      const statusCode = err.statusCode || 500;
      return reply.code(statusCode).send({
        success: false,
        error: err.message || 'Failed to toggle selection',
      });
    }
  }

  /**
   * POST /api/client-portal/:token/galleries/:galleryId/find-my-photos
   * Find My Photos Experience with privacy explanation.
   */
  static async getFindMyPhotosResults(request: FastifyRequest, reply: FastifyReply) {
    ClientExperienceController.applySecurityHeaders(reply);
    const { token, galleryId } = request.params as { token: string; galleryId: string };
    const body = request.body as { photo_ids?: string[] };

    try {
      const data = await ClientExperienceService.getFindMyPhotosResults(
        token,
        galleryId,
        body?.photo_ids || []
      );
      return reply.send({ success: true, data });
    } catch (err: any) {
      const statusCode = err.statusCode || 500;
      return reply.code(statusCode).send({
        success: false,
        error: err.message || 'Find My Photos search failed',
      });
    }
  }
}
