import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '@pixmatch/database';

const updateStudioSchema = z.object({
  name: z.string().min(2).optional(),
  logo_url: z.string().optional(),
  website: z.string().optional(),
});

export class StudiosController {
  static async getCurrent(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;
    const studio = await prisma.studio.findUnique({
      where: { id: studioId },
      include: {
        subscription: true,
        memberships: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar_url: true, role: true },
            },
          },
        },
      },
    });

    if (!studio) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Studio not found' },
      });
    }

    return reply.send({
      success: true,
      data: {
        ...studio,
        subscription: studio.subscription
          ? {
              ...studio.subscription,
              storage_limit_bytes: Number(studio.subscription.storage_limit_bytes),
            }
          : null,
      },
    });
  }

  static async update(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;
    const input = updateStudioSchema.parse(request.body);

    const updated = await prisma.studio.update({
      where: { id: studioId },
      data: input,
    });

    return reply.send({
      success: true,
      data: updated,
    });
  }
}
