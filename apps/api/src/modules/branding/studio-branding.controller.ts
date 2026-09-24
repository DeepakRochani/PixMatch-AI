/**
 * Studio Branding & Domain Controller — PixMatch AI Phase 27
 * Handles authenticated studio endpoints for branding setup, custom domains, and client portal session issuance.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { StudioBrandingService } from './studio-branding.service.js';
import { StudioDomainService } from './studio-domain.service.js';
import { ClientPortalSessionService } from '../client-portal/client-portal-session.service.js';
import {
  IUpdateStudioBrandingDTO,
  ICreateStudioDomainDTO,
} from '@pixmatch/types';

export class StudioBrandingController {
  // -------------------------------------------------------------
  // BRANDING MANAGEMENT
  // -------------------------------------------------------------

  static async getBranding(request: FastifyRequest, reply: FastifyReply) {
    const { studioId } = request.params as { studioId: string };
    const data = await StudioBrandingService.getBranding(studioId);
    return reply.send({ success: true, data });
  }

  static async updateBranding(request: FastifyRequest, reply: FastifyReply) {
    const { studioId } = request.params as { studioId: string };
    const body = request.body as IUpdateStudioBrandingDTO;
    const data = await StudioBrandingService.updateBranding(studioId, body);
    return reply.send({ success: true, data });
  }

  static async resetBranding(request: FastifyRequest, reply: FastifyReply) {
    const { studioId } = request.params as { studioId: string };
    const data = await StudioBrandingService.resetBranding(studioId);
    return reply.send({ success: true, data });
  }

  // -------------------------------------------------------------
  // CUSTOM DOMAINS
  // -------------------------------------------------------------

  static async listDomains(request: FastifyRequest, reply: FastifyReply) {
    const { studioId } = request.params as { studioId: string };
    const data = await StudioDomainService.listDomains(studioId);
    return reply.send({ success: true, data });
  }

  static async createDomain(request: FastifyRequest, reply: FastifyReply) {
    const { studioId } = request.params as { studioId: string };
    const body = request.body as ICreateStudioDomainDTO;
    const data = await StudioDomainService.createDomain(studioId, body);
    return reply.status(201).send({ success: true, data });
  }

  static async getDomain(request: FastifyRequest, reply: FastifyReply) {
    const { studioId, domainId } = request.params as { studioId: string; domainId: string };
    const data = await StudioDomainService.getDomain(studioId, domainId);
    return reply.send({ success: true, data });
  }

  static async verifyDomain(request: FastifyRequest, reply: FastifyReply) {
    const { studioId, domainId } = request.params as { studioId: string; domainId: string };
    const data = await StudioDomainService.verifyDomain(studioId, domainId);
    return reply.send({ success: true, data });
  }

  static async setPrimaryDomain(request: FastifyRequest, reply: FastifyReply) {
    const { studioId, domainId } = request.params as { studioId: string; domainId: string };
    const data = await StudioDomainService.setPrimaryDomain(studioId, domainId);
    return reply.send({ success: true, data });
  }

  static async deleteDomain(request: FastifyRequest, reply: FastifyReply) {
    const { studioId, domainId } = request.params as { studioId: string; domainId: string };
    const data = await StudioDomainService.deleteDomain(studioId, domainId);
    return reply.send({ success: true, data });
  }

  // -------------------------------------------------------------
  // CLIENT PORTAL SESSIONS ISSUANCE
  // -------------------------------------------------------------

  static async createClientPortalSession(request: FastifyRequest, reply: FastifyReply) {
    const { studioId, clientId } = request.params as { studioId: string; clientId: string };
    const body = (request.body || {}) as { expiresInDays?: number };

    const data = await ClientPortalSessionService.createSession(studioId, clientId, {
      expiresInDays: body.expiresInDays,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });

    return reply.status(201).send({ success: true, data });
  }

  static async revokeClientPortalSession(request: FastifyRequest, reply: FastifyReply) {
    const { studioId, sessionId } = request.params as { studioId: string; sessionId: string };
    const data = await ClientPortalSessionService.revokeSession(studioId, sessionId);
    return reply.send({ success: true, data });
  }
}
