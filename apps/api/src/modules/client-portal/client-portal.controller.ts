/**
 * Client Portal Controller — PixMatch AI Phase 27
 * Handles public client portal HTTP requests with automatic token resolution,
 * private caching headers, strict IDOR prevention, and data minimization.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { ClientPortalSessionService } from './client-portal-session.service.js';
import { ClientPortalService } from './client-portal.service.js';
import { StudioBrandingService } from '../branding/studio-branding.service.js';
import {
  IUpdateClientPortalProfileDTO,
  IUpdateClientPortalPreferenceDTO,
} from '@pixmatch/types';

export class ClientPortalController {
  /**
   * Helper to set strict private cache headers on all client-specific responses.
   */
  private static setPrivateHeaders(reply: FastifyReply) {
    reply.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    reply.header('X-Robots-Tag', 'noindex, noarchive, nofollow');
  }

  /**
   * Helper to extract and validate token from params or headers.
   */
  private static async resolveSession(request: FastifyRequest) {
    const params = request.params as Record<string, string>;
    const token =
      params.token ||
      (request.headers['x-client-portal-token'] as string) ||
      (request.query as any)?.token;

    if (!token) {
      const err = new Error('Client portal token is required.');
      (err as any).statusCode = 401;
      throw err;
    }

    const session = await ClientPortalSessionService.validateToken(token);
    return { session, rawToken: token };
  }

  /**
   * GET /api/v1/public/client-portal/:token/home
   */
  static async getPortalHome(request: FastifyRequest, reply: FastifyReply) {
    ClientPortalController.setPrivateHeaders(reply);
    const { session, rawToken } = await ClientPortalController.resolveSession(request);
    const data = await ClientPortalService.getPortalHome(session, rawToken);
    return reply.send({ success: true, data });
  }

  /**
   * GET /api/v1/public/client-portal/:token/session
   */
  static async getSessionInfo(request: FastifyRequest, reply: FastifyReply) {
    ClientPortalController.setPrivateHeaders(reply);
    const { rawToken } = await ClientPortalController.resolveSession(request);
    const data = await ClientPortalSessionService.getSessionDTO(rawToken);
    return reply.send({ success: true, data });
  }

  /**
   * GET /api/v1/public/client-portal/:token/branding
   */
  static async getBranding(request: FastifyRequest, reply: FastifyReply) {
    ClientPortalController.setPrivateHeaders(reply);
    const { session } = await ClientPortalController.resolveSession(request);
    const data = await StudioBrandingService.getBranding(session.studioId);
    return reply.send({ success: true, data });
  }

  /**
   * GET /api/v1/public/client-portal/:token/projects
   */
  static async getProjects(request: FastifyRequest, reply: FastifyReply) {
    ClientPortalController.setPrivateHeaders(reply);
    const { session } = await ClientPortalController.resolveSession(request);
    const data = await ClientPortalService.getClientProjects(session);
    return reply.send({ success: true, data });
  }

  /**
   * GET /api/v1/public/client-portal/:token/projects/:projectId
   */
  static async getProjectDetail(request: FastifyRequest, reply: FastifyReply) {
    ClientPortalController.setPrivateHeaders(reply);
    const { session } = await ClientPortalController.resolveSession(request);
    const { projectId } = request.params as { projectId: string };
    const data = await ClientPortalService.getClientProjectDetail(session, projectId);
    return reply.send({ success: true, data });
  }

  /**
   * GET /api/v1/public/client-portal/:token/orders
   */
  static async getOrders(request: FastifyRequest, reply: FastifyReply) {
    ClientPortalController.setPrivateHeaders(reply);
    const { session } = await ClientPortalController.resolveSession(request);
    const data = await ClientPortalService.getClientOrders(session);
    return reply.send({ success: true, data });
  }

  /**
   * GET /api/v1/public/client-portal/:token/orders/:orderId
   */
  static async getOrderDetail(request: FastifyRequest, reply: FastifyReply) {
    ClientPortalController.setPrivateHeaders(reply);
    const { session } = await ClientPortalController.resolveSession(request);
    const { orderId } = request.params as { orderId: string };
    const data = await ClientPortalService.getClientOrderDetail(session, orderId);
    return reply.send({ success: true, data });
  }

  /**
   * GET /api/v1/public/client-portal/:token/downloads
   */
  static async getDownloads(request: FastifyRequest, reply: FastifyReply) {
    ClientPortalController.setPrivateHeaders(reply);
    const { session } = await ClientPortalController.resolveSession(request);
    const data = await ClientPortalService.getClientDownloads(session);
    return reply.send({ success: true, data });
  }

  /**
   * GET /api/v1/public/client-portal/:token/downloads/:packageId/file
   */
  static async downloadPackageFile(request: FastifyRequest, reply: FastifyReply) {
    ClientPortalController.setPrivateHeaders(reply);
    const { session } = await ClientPortalController.resolveSession(request);
    const { packageId } = request.params as { packageId: string };
    const data = await ClientPortalService.getPackageDownloadUrl(session, packageId);
    return reply.send({ success: true, data });
  }

  /**
   * GET /api/v1/public/client-portal/:token/delivery
   */
  static async getDelivery(request: FastifyRequest, reply: FastifyReply) {
    ClientPortalController.setPrivateHeaders(reply);
    const { session } = await ClientPortalController.resolveSession(request);
    const data = await ClientPortalService.getClientDelivery(session);
    return reply.send({ success: true, data });
  }

  /**
   * POST /api/v1/public/client-portal/:token/delivery/:deliveryId/confirm
   */
  static async confirmDelivery(request: FastifyRequest, reply: FastifyReply) {
    ClientPortalController.setPrivateHeaders(reply);
    const { session } = await ClientPortalController.resolveSession(request);
    const { deliveryId } = request.params as { deliveryId: string };
    const data = await ClientPortalService.confirmDelivery(session, deliveryId);
    return reply.send({ success: true, data });
  }

  /**
   * GET /api/v1/public/client-portal/:token/notifications
   */
  static async getNotifications(request: FastifyRequest, reply: FastifyReply) {
    ClientPortalController.setPrivateHeaders(reply);
    const { session } = await ClientPortalController.resolveSession(request);
    const data = await ClientPortalService.getClientNotifications(session);
    return reply.send({ success: true, data });
  }

  /**
   * POST /api/v1/public/client-portal/:token/notifications/:notificationId/read
   */
  static async markNotificationRead(request: FastifyRequest, reply: FastifyReply) {
    ClientPortalController.setPrivateHeaders(reply);
    const { session } = await ClientPortalController.resolveSession(request);
    const { notificationId } = request.params as { notificationId: string };
    const data = await ClientPortalService.markNotificationRead(session, notificationId);
    return reply.send({ success: true, data });
  }

  /**
   * GET /api/v1/public/client-portal/:token/profile
   */
  static async getProfile(request: FastifyRequest, reply: FastifyReply) {
    ClientPortalController.setPrivateHeaders(reply);
    const { session } = await ClientPortalController.resolveSession(request);
    const data = await ClientPortalService.getClientProfile(session);
    return reply.send({ success: true, data });
  }

  /**
   * PATCH /api/v1/public/client-portal/:token/profile
   */
  static async updateProfile(request: FastifyRequest, reply: FastifyReply) {
    ClientPortalController.setPrivateHeaders(reply);
    const { session } = await ClientPortalController.resolveSession(request);
    const body = request.body as IUpdateClientPortalProfileDTO;
    const data = await ClientPortalService.updateClientProfile(session, body);
    return reply.send({ success: true, data });
  }

  /**
   * PATCH /api/v1/public/client-portal/:token/preferences
   */
  static async updatePreferences(request: FastifyRequest, reply: FastifyReply) {
    ClientPortalController.setPrivateHeaders(reply);
    const { session } = await ClientPortalController.resolveSession(request);
    const body = request.body as IUpdateClientPortalPreferenceDTO;
    const data = await ClientPortalService.updateClientPreferences(session, body);
    return reply.send({ success: true, data });
  }

  // -------------------------------------------------------------
  // PHASE 28: CLIENT PORTAL MESSAGING
  // -------------------------------------------------------------

  /**
   * GET /api/v1/public/client-portal/:token/messages
   */
  static async getClientConversations(request: FastifyRequest, reply: FastifyReply) {
    ClientPortalController.setPrivateHeaders(reply);
    const { session } = await ClientPortalController.resolveSession(request);
    const data = await ClientPortalService.getClientConversations(session);
    return reply.send({ success: true, data });
  }

  /**
   * GET /api/v1/public/client-portal/:token/messages/:conversationId
   */
  static async getClientConversationDetail(request: FastifyRequest, reply: FastifyReply) {
    ClientPortalController.setPrivateHeaders(reply);
    const { session } = await ClientPortalController.resolveSession(request);
    const { conversationId } = request.params as { conversationId: string };
    const data = await ClientPortalService.getClientConversationDetail(session, conversationId);
    return reply.send({ success: true, data });
  }

  /**
   * POST /api/v1/public/client-portal/:token/messages
   */
  static async sendClientMessage(request: FastifyRequest, reply: FastifyReply) {
    ClientPortalController.setPrivateHeaders(reply);
    const { session } = await ClientPortalController.resolveSession(request);
    const body = request.body as any;
    const data = await ClientPortalService.sendClientMessage(session, body);
    return reply.status(201).send({ success: true, data });
  }
}
