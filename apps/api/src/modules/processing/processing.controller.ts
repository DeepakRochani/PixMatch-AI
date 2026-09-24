import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma, ProcessingStatus } from '@pixmatch/database';
import { dispatchPhotoProcessing } from '@pixmatch/worker';

export class ProcessingController {
  static async listJobs(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;
    const { status } = request.query as { status?: string };

    const whereClause: { studio_id: string; status?: ProcessingStatus } = { studio_id: studioId };
    if (status && Object.values(ProcessingStatus).includes(status as ProcessingStatus)) {
      whereClause.status = status as ProcessingStatus;
    }

    const jobs = await prisma.processingJob.findMany({
      where: whereClause,
      include: {
        gallery: { select: { id: true, title: true } },
        photo: { select: { id: true, original_url: true, original_filename: true, thumbnail_url: true } },
      },
      orderBy: { created_at: 'desc' },
      take: 100,
    });

    return reply.send({
      success: true,
      data: jobs,
    });
  }

  static async getJob(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const studioId = request.studioId!;

    const job = await prisma.processingJob.findFirst({
      where: { id, studio_id: studioId },
      include: {
        gallery: { select: { id: true, title: true } },
        photo: { select: { id: true, original_url: true, original_filename: true, thumbnail_url: true } },
      },
    });

    if (!job) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Job not found' },
      });
    }

    return reply.send({
      success: true,
      data: job,
    });
  }

  static async retryJob(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const studioId = request.studioId!;

    const job = await prisma.processingJob.findFirst({
      where: { id, studio_id: studioId },
      include: { photo: true },
    });

    if (!job) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Job not found' },
      });
    }

    const updatedJob = await prisma.processingJob.update({
      where: { id },
      data: {
        status: ProcessingStatus.QUEUED,
        progress: 0,
        error_message: null,
      },
    });

    if (job.photo) {
      await prisma.photo.update({
        where: { id: job.photo.id },
        data: { processing_status: ProcessingStatus.QUEUED },
      });

      await dispatchPhotoProcessing({
        photoId: job.photo.id,
        studioId: job.studio_id,
        galleryId: job.gallery_id || job.photo.gallery_id,
        storagePath: job.photo.storage_path,
      });
    }

    return reply.send({
      success: true,
      data: updatedJob,
    });
  }
}
