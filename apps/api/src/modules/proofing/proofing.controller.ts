/**
 * Proofing Controller — PixMatch AI Phase 25
 * Handles HTTP requests for Studio management & Public Client portal endpoints.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import {
  CreateProofingSessionDTO,
  UpdateProofingSessionDTO,
  UpdateProofingRulesDTO,
  ToggleProofingItemDTO,
  BulkToggleProofingItemDTO,
  CreateProofingCommentDTO,
  UpdateProofingCommentDTO,
  CreateProofingComparisonDTO,
  SubmitClientSelectionsDTO,
  ReviewProofingSelectionsDTO,
  VerifyProofingPinDTO,
  ProofingSessionStatus,
} from '@pixmatch/types';
import { ProofingSessionService } from './proofing-session.service.js';
import { ProofingSelectionService } from './proofing-selection.service.js';
import { ProofingFeedbackService } from './proofing-feedback.service.js';
import { ProofingReviewService } from './proofing-review.service.js';
import { ProofingAnalyticsService } from './proofing-analytics.service.js';

export class ProofingController {
  // =============================================================
  // PUBLIC CLIENT PORTAL ENDPOINTS (Token authenticated)
  // =============================================================

  public static async getPublicSession(req: FastifyRequest<{ Params: { token: string }; Querystring: { pin?: string } }>, reply: FastifyReply) {
    try {
      const { token } = req.params;
      const { pin } = req.query;
      const session = await ProofingSessionService.getSessionByToken(token, pin);
      return reply.send({ success: true, data: session });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  public static async verifyPublicPin(req: FastifyRequest<{ Params: { token: string }; Body: VerifyProofingPinDTO }>, reply: FastifyReply) {
    try {
      const { token } = req.params;
      const { pin_code } = req.body;
      const isValid = await ProofingSessionService.verifyPin(token, pin_code);
      if (!isValid) {
        return reply.status(401).send({ success: false, error: 'Invalid PIN code.' });
      }
      const session = await ProofingSessionService.getSessionByToken(token, pin_code);
      return reply.send({ success: true, data: session });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  public static async togglePublicItem(
    req: FastifyRequest<{ Params: { token: string; itemId: string }; Body: ToggleProofingItemDTO; Querystring: { pin?: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { token, itemId } = req.params;
      const { pin } = req.query;
      const publicSession = await ProofingSessionService.getSessionByToken(token, pin);
      if (publicSession.requires_pin && !publicSession.is_pin_verified) {
        return reply.status(401).send({ success: false, error: 'PIN verification required.' });
      }

      const item = await ProofingSelectionService.updateItem(publicSession.id, itemId, req.body);
      const quota = ProofingSessionService.calculateQuota(publicSession.rules, (await ProofingSelectionService.getSessionItems(publicSession.id)) as any);

      return reply.send({ success: true, data: { item, quota } });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  public static async bulkTogglePublicItems(
    req: FastifyRequest<{ Params: { token: string }; Body: BulkToggleProofingItemDTO; Querystring: { pin?: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { token } = req.params;
      const { pin } = req.query;
      const publicSession = await ProofingSessionService.getSessionByToken(token, pin);
      if (publicSession.requires_pin && !publicSession.is_pin_verified) {
        return reply.status(401).send({ success: false, error: 'PIN verification required.' });
      }

      const result = await ProofingSelectionService.bulkUpdateItems(publicSession.id, req.body);
      const items = await ProofingSelectionService.getSessionItems(publicSession.id);
      const quota = ProofingSessionService.calculateQuota(publicSession.rules, items as any);

      return reply.send({ success: true, data: { ...result, quota } });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  public static async addPublicComment(
    req: FastifyRequest<{ Params: { token: string; itemId: string }; Body: CreateProofingCommentDTO; Querystring: { pin?: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { token, itemId } = req.params;
      const { pin } = req.query;
      const publicSession = await ProofingSessionService.getSessionByToken(token, pin);
      if (publicSession.requires_pin && !publicSession.is_pin_verified) {
        return reply.status(401).send({ success: false, error: 'PIN verification required.' });
      }

      const comment = await ProofingFeedbackService.addComment(publicSession.id, itemId, {
        ...req.body,
        author_type: 'CLIENT',
      });

      return reply.send({ success: true, data: comment });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  public static async getPublicItemComments(
    req: FastifyRequest<{ Params: { token: string; itemId: string }; Querystring: { pin?: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { itemId } = req.params;
      const comments = await ProofingFeedbackService.getItemComments(itemId);
      return reply.send({ success: true, data: comments });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  public static async createPublicComparison(
    req: FastifyRequest<{ Params: { token: string }; Body: CreateProofingComparisonDTO; Querystring: { pin?: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { token } = req.params;
      const { pin } = req.query;
      const publicSession = await ProofingSessionService.getSessionByToken(token, pin);
      if (publicSession.requires_pin && !publicSession.is_pin_verified) {
        return reply.status(401).send({ success: false, error: 'PIN verification required.' });
      }

      const comparison = await ProofingSelectionService.createComparison(publicSession.id, req.body);
      return reply.send({ success: true, data: comparison });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  public static async selectComparisonWinner(
    req: FastifyRequest<{ Params: { token: string; comparisonId: string }; Body: { winner_photo_id: string }; Querystring: { pin?: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { token, comparisonId } = req.params;
      const { winner_photo_id } = req.body;
      const { pin } = req.query;
      const publicSession = await ProofingSessionService.getSessionByToken(token, pin);

      const comparison = await ProofingSelectionService.selectComparisonWinner(publicSession.id, comparisonId, winner_photo_id);
      return reply.send({ success: true, data: comparison });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  public static async submitPublicSelections(
    req: FastifyRequest<{ Params: { token: string }; Body: SubmitClientSelectionsDTO; Querystring: { pin?: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { token } = req.params;
      const { pin } = req.query;
      const publicSession = await ProofingSessionService.getSessionByToken(token, pin);
      if (publicSession.requires_pin && !publicSession.is_pin_verified) {
        return reply.status(401).send({ success: false, error: 'PIN verification required.' });
      }

      const updatedSession = await ProofingReviewService.submitClientSelections(publicSession.id, req.body);
      return reply.send({ success: true, data: updatedSession });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  // =============================================================
  // AUTHENTICATED STUDIO MANAGEMENT ENDPOINTS
  // =============================================================

  public static async listSessions(
    req: FastifyRequest<{ Querystring: { gallery_id?: string; project_id?: string; status?: ProofingSessionStatus } }>,
    reply: FastifyReply
  ) {
    try {
      const studioId = (req as any).user?.studio_id || (req.headers['x-studio-id'] as string);
      if (!studioId) return reply.status(400).send({ success: false, error: 'Studio ID is required.' });

      const sessions = await ProofingSessionService.listSessions(studioId, req.query);
      return reply.send({ success: true, data: sessions });
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message });
    }
  }

  public static async createSession(req: FastifyRequest<{ Body: CreateProofingSessionDTO }>, reply: FastifyReply) {
    try {
      const studioId = (req as any).user?.studio_id || (req.headers['x-studio-id'] as string);
      const userId = (req as any).user?.id;
      if (!studioId) return reply.status(400).send({ success: false, error: 'Studio ID is required.' });

      const session = await ProofingSessionService.createSession(studioId, req.body, userId);
      return reply.status(201).send({ success: true, data: session });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  public static async getSession(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const studioId = (req as any).user?.studio_id || (req.headers['x-studio-id'] as string);
      const { id } = req.params;

      const session = await ProofingSessionService.getSessionById(id, studioId);
      if (!session) return reply.status(404).send({ success: false, error: 'Proofing session not found.' });

      return reply.send({ success: true, data: session });
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message });
    }
  }

  public static async updateSession(
    req: FastifyRequest<{ Params: { id: string }; Body: UpdateProofingSessionDTO }>,
    reply: FastifyReply
  ) {
    try {
      const studioId = (req as any).user?.studio_id || (req.headers['x-studio-id'] as string);
      const userId = (req as any).user?.id;
      const { id } = req.params;

      const updated = await ProofingSessionService.updateSession(id, studioId, req.body, userId);
      return reply.send({ success: true, data: updated });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  public static async updateRules(
    req: FastifyRequest<{ Params: { id: string }; Body: UpdateProofingRulesDTO }>,
    reply: FastifyReply
  ) {
    try {
      const studioId = (req as any).user?.studio_id || (req.headers['x-studio-id'] as string);
      const userId = (req as any).user?.id;
      const { id } = req.params;

      const rules = await ProofingSessionService.updateRules(id, studioId, req.body, userId);
      return reply.send({ success: true, data: rules });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  public static async deleteSession(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const studioId = (req as any).user?.studio_id || (req.headers['x-studio-id'] as string);
      const { id } = req.params;

      await ProofingSessionService.deleteSession(id, studioId);
      return reply.send({ success: true, message: 'Proofing session deleted.' });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  public static async getSessionQuota(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const studioId = (req as any).user?.studio_id || (req.headers['x-studio-id'] as string);
      const { id } = req.params;

      const session = await ProofingSessionService.getSessionById(id, studioId);
      if (!session) return reply.status(404).send({ success: false, error: 'Session not found.' });

      return reply.send({ success: true, data: session.quota });
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message });
    }
  }

  public static async reviewSelections(
    req: FastifyRequest<{ Params: { id: string }; Body: ReviewProofingSelectionsDTO }>,
    reply: FastifyReply
  ) {
    try {
      const studioId = (req as any).user?.studio_id || (req.headers['x-studio-id'] as string);
      const userId = (req as any).user?.id || 'STUDIO_USER';
      const { id } = req.params;

      const review = await ProofingReviewService.reviewSelections(id, studioId, userId, req.body);
      return reply.send({ success: true, data: review });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  public static async getSummary(req: FastifyRequest, reply: FastifyReply) {
    try {
      const studioId = (req as any).user?.studio_id || (req.headers['x-studio-id'] as string);
      if (!studioId) return reply.status(400).send({ success: false, error: 'Studio ID is required.' });

      const summary = await ProofingAnalyticsService.getStudioSummary(studioId);
      return reply.send({ success: true, data: summary });
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message });
    }
  }

  public static async getAuditLog(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const studioId = (req as any).user?.studio_id || (req.headers['x-studio-id'] as string);
      const { id } = req.params;

      const logs = await ProofingAnalyticsService.getSessionAuditLog(id, studioId);
      return reply.send({ success: true, data: logs });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  public static async resolveComment(
    req: FastifyRequest<{ Params: { commentId: string }; Body: UpdateProofingCommentDTO }>,
    reply: FastifyReply
  ) {
    try {
      const userId = (req as any).user?.id || 'STUDIO_USER';
      const { commentId } = req.params;

      const updated = await ProofingFeedbackService.updateComment(commentId, req.body, userId);
      return reply.send({ success: true, data: updated });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }
}
