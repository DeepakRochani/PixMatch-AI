import { FastifyRequest, FastifyReply } from 'fastify';
import { NotificationService, DispatchNotificationParams } from './notification.service.js';

export class NotificationController {
  /**
   * Dispatches a notification
   */
  static async dispatch(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user;
    const body = request.body as DispatchNotificationParams;

    if (!body || !body.event || !body.recipient) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'Missing required fields: event and recipient are mandatory.' },
      });
    }

    const studioId = user?.studioId || (user as any)?.studio_id;
    const userId = user?.userId || (user as any)?.user_id;

    const result = await NotificationService.dispatch({
      ...body,
      studioId: body.studioId || studioId,
      userId: body.userId || userId,
    });

    if (!result.success && result.error?.startsWith('INVALID_EMAIL')) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_RECIPIENT', message: result.error },
      });
    }

    return reply.status(200).send({
      success: true,
      data: result,
    });
  }

  /**
   * Gets notification preferences for authenticated user's studio
   */
  static async getPreferences(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user;
    const studioId = user?.studioId || (user as any)?.studio_id;
    const userId = user?.userId || (user as any)?.user_id;

    if (!user || !studioId) {
      return reply.status(400).send({
        success: false,
        error: { code: 'STUDIO_REQUIRED', message: 'User is not associated with an active studio.' },
      });
    }

    const preferences = await NotificationService.getPreferences(userId, studioId);
    return reply.status(200).send({
      success: true,
      data: preferences,
    });
  }

  /**
   * Updates notification preferences
   */
  static async updatePreferences(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user;
    const studioId = user?.studioId || (user as any)?.studio_id;
    const userId = user?.userId || (user as any)?.user_id;

    if (!user || !studioId) {
      return reply.status(400).send({
        success: false,
        error: { code: 'STUDIO_REQUIRED', message: 'User is not associated with an active studio.' },
      });
    }

    const preferences = await NotificationService.updatePreferences(userId, studioId, request.body as any);
    return reply.status(200).send({
      success: true,
      data: preferences,
    });
  }
}
