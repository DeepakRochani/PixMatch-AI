import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma, ClientStatus, DeliveryStatus } from '@pixmatch/database';
import { CRMService } from './crm.service.js';

const createClientSchema = z.object({
  first_name: z.string().trim().optional(),
  last_name: z.string().trim().optional(),
  name: z.string().trim().min(1).optional(),
  email: z.string().email().toLowerCase().trim(),
  phone: z.string().trim().optional().nullable(),
  company: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  tags: z.array(z.string().trim()).optional(),
  gallery_id: z.string().uuid().optional(),
  relationship_type: z.string().default('PRIMARY'),
  force_create: z.boolean().optional().default(false),
});

const updateClientSchema = z.object({
  first_name: z.string().trim().optional().nullable(),
  last_name: z.string().trim().optional().nullable(),
  name: z.string().trim().min(1).optional(),
  email: z.string().email().toLowerCase().trim().optional(),
  phone: z.string().trim().optional().nullable(),
  company: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  tags: z.array(z.string().trim()).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']).optional(),
});

const listClientsQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(['ALL', 'ACTIVE', 'INACTIVE', 'ARCHIVED']).optional().default('ALL'),
  hasGalleries: z.enum(['all', 'true', 'false']).optional().default('all'),
  recentActivity: z.enum(['true', 'false']).optional().default('false'),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export class ClientsController {
  /**
   * List clients with server-side search, filtering, and cursor pagination.
   */
  static async list(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;
    const query = listClientsQuerySchema.parse(request.query);

    const where: any = {
      studio_id: studioId,
    };

    // Soft delete filtering
    if (query.status === 'ARCHIVED') {
      where.OR = [
        { status: ClientStatus.ARCHIVED },
        { deleted_at: { not: null } },
      ];
    } else {
      where.deleted_at = null;
      if (query.status === 'ACTIVE') {
        where.status = ClientStatus.ACTIVE;
      } else if (query.status === 'INACTIVE') {
        where.status = ClientStatus.INACTIVE;
      }
    }

    // Server-side text search
    if (query.search && query.search.trim().length > 0) {
      const searchTerm = query.search.trim();
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { first_name: { contains: searchTerm, mode: 'insensitive' } },
            { last_name: { contains: searchTerm, mode: 'insensitive' } },
            { email: { contains: searchTerm, mode: 'insensitive' } },
            { phone: { contains: searchTerm, mode: 'insensitive' } },
            { company: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
      ];
    }

    // Gallery count filter
    if (query.hasGalleries === 'true') {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { galleries: { some: {} } },
            { gallery_id: { not: null } },
          ],
        },
      ];
    } else if (query.hasGalleries === 'false') {
      where.AND = [
        ...(where.AND || []),
        {
          galleries: { none: {} },
          gallery_id: null,
        },
      ];
    }

    // Cursor pagination setup
    const limit = query.limit;
    const findArgs: any = {
      where,
      take: limit + 1,
      orderBy: { created_at: 'desc' },
      include: {
        gallery: { select: { id: true, title: true, slug: true, cover_photo_url: true } },
        galleries: {
          include: {
            gallery: {
              select: {
                id: true,
                title: true,
                slug: true,
                cover_photo_url: true,
                created_at: true,
                photos: { select: { id: true }, take: 1 },
              },
            },
          },
        },
        deliveries: {
          take: 1,
          orderBy: { created_at: 'desc' },
          select: { status: true, sent_at: true, opened_at: true },
        },
        activities: {
          take: 1,
          orderBy: { created_at: 'desc' },
          select: { created_at: true, activity_type: true, description: true },
        },
      },
    };

    if (query.cursor) {
      findArgs.cursor = { id: query.cursor };
      findArgs.skip = 1;
    }

    const rawClients = await prisma.client.findMany(findArgs);
    const hasMore = rawClients.length > limit;
    const clientsData = hasMore ? rawClients.slice(0, limit) : rawClients;
    const nextCursor = hasMore && clientsData.length > 0 ? clientsData[clientsData.length - 1].id : null;

    // Aggregate statistics across the studio
    const [totalCount, activeCount, withGalleriesCount, recentActivityCount] = await Promise.all([
      prisma.client.count({ where: { studio_id: studioId, deleted_at: null } }),
      prisma.client.count({ where: { studio_id: studioId, status: ClientStatus.ACTIVE, deleted_at: null } }),
      prisma.client.count({
        where: {
          studio_id: studioId,
          deleted_at: null,
          OR: [{ galleries: { some: {} } }, { gallery_id: { not: null } }],
        },
      }),
      prisma.clientActivity.count({
        where: {
          studio_id: studioId,
          created_at: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    const formattedClients = clientsData.map((c: any) => {
      const assignedGalleries = c.galleries || [];
      const primaryGallery = c.gallery || assignedGalleries[0]?.gallery;
      const latestActivity = c.activities?.[0];

      return {
        id: c.id,
        studio_id: c.studio_id,
        first_name: c.first_name,
        last_name: c.last_name,
        name: c.name,
        email: c.email,
        phone: c.phone,
        company: c.company,
        notes: c.notes,
        tags: c.tags || [],
        status: c.status,
        deleted_at: c.deleted_at,
        created_at: c.created_at,
        updated_at: c.updated_at,
        galleries_count: assignedGalleries.length + (c.gallery_id && !assignedGalleries.some((g: any) => g.gallery_id === c.gallery_id) ? 1 : 0),
        latest_gallery_title: primaryGallery?.title || null,
        last_activity_at: latestActivity?.created_at || c.updated_at || c.created_at,
        gallery: primaryGallery ? {
          id: primaryGallery.id,
          title: primaryGallery.title,
          slug: primaryGallery.slug,
          cover_photo_url: primaryGallery.cover_photo_url,
        } : null,
      };
    });

    return reply.send({
      success: true,
      data: {
        clients: formattedClients,
        has_more: hasMore,
        next_cursor: nextCursor,
        total_count: totalCount,
        stats: {
          total: totalCount,
          active: activeCount,
          with_galleries: withGalleriesCount,
          recent_activity: recentActivityCount,
        },
      },
    });
  }

  /**
   * Check for duplicate clients inside the studio.
   */
  static async checkDuplicate(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;
    const body = z.object({
      email: z.string().email().toLowerCase().trim(),
      phone: z.string().trim().optional(),
    }).parse(request.body);

    const existing = await prisma.client.findFirst({
      where: {
        studio_id: studioId,
        deleted_at: null,
        OR: [
          { email: body.email },
          ...(body.phone ? [{ phone: body.phone }] : []),
        ],
      },
      include: {
        galleries: { include: { gallery: { select: { id: true, title: true } } } },
      },
    });

    if (existing) {
      return reply.send({
        success: true,
        is_duplicate: true,
        existing_client: {
          id: existing.id,
          name: existing.name,
          email: existing.email,
          phone: existing.phone,
          galleries_count: existing.galleries.length,
        },
      });
    }

    return reply.send({
      success: true,
      is_duplicate: false,
    });
  }

  /**
   * Create a new client with duplicate detection.
   */
  static async create(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;
    const input = createClientSchema.parse(request.body);

    // Check for duplicates inside the same studio
    if (!input.force_create) {
      const existing = await prisma.client.findFirst({
        where: {
          studio_id: studioId,
          deleted_at: null,
          OR: [
            { email: input.email },
            ...(input.phone ? [{ phone: input.phone }] : []),
          ],
        },
      });

      if (existing) {
        return reply.status(409).send({
          statusCode: 409,
          error: 'Conflict',
          message: `A client with email ${input.email} already exists in your studio.`,
          existing_client_id: existing.id,
          possible_duplicate: true,
        });
      }
    }

    // Determine full name
    const computedName = input.name || `${input.first_name || ''} ${input.last_name || ''}`.trim() || input.email;

    // Create client
    const client = await prisma.client.create({
      data: {
        studio_id: studioId,
        gallery_id: input.gallery_id || null,
        first_name: input.first_name || null,
        last_name: input.last_name || null,
        name: computedName,
        email: input.email,
        phone: input.phone || null,
        company: input.company || null,
        notes: input.notes || null,
        tags: input.tags || [],
        status: ClientStatus.ACTIVE,
      },
    });

    // If gallery_id is provided, create the ClientGallery relationship
    if (input.gallery_id) {
      const gallery = await prisma.gallery.findFirst({
        where: { id: input.gallery_id, studio_id: studioId },
      });

      if (gallery) {
        await prisma.clientGallery.upsert({
          where: {
            client_id_gallery_id: {
              client_id: client.id,
              gallery_id: gallery.id,
            },
          },
          update: {
            relationship_type: input.relationship_type || 'PRIMARY',
          },
          create: {
            client_id: client.id,
            gallery_id: gallery.id,
            studio_id: studioId,
            relationship_type: input.relationship_type || 'PRIMARY',
          },
        });

        // Log GALLERY_ASSIGNED
        await prisma.clientActivity.create({
          data: {
            studio_id: studioId,
            client_id: client.id,
            gallery_id: gallery.id,
            activity_type: 'GALLERY_ASSIGNED',
            description: `Assigned to gallery "${gallery.title}" as ${input.relationship_type || 'PRIMARY'}`,
          },
        }).catch(() => null);
      }
    }

    // Log CLIENT_CREATED
    await prisma.clientActivity.create({
      data: {
        studio_id: studioId,
        client_id: client.id,
        activity_type: 'CLIENT_CREATED',
        description: `Client profile created for ${computedName}`,
      },
    }).catch(() => null);

    return reply.status(201).send({
      success: true,
      data: client,
    });
  }

  /**
   * Get single client profile with comprehensive statistics and activity history.
   */
  static async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const studioId = request.studioId!;
    const { id } = request.params;

    const client = await prisma.client.findFirst({
      where: {
        id,
        studio_id: studioId,
      },
      include: {
        galleries: {
          include: {
            gallery: {
              select: {
                id: true,
                title: true,
                slug: true,
                event_type: true,
                event_date: true,
                cover_photo_url: true,
                status: true,
                access_type: true,
                expires_at: true,
                downloads_enabled: true,
                enable_ai_face_search: true,
                created_at: true,
                _count: {
                  select: { photos: true },
                },
              },
            },
          },
        },
        deliveries: {
          orderBy: { created_at: 'desc' },
          take: 10,
        },
        activities: {
          orderBy: { created_at: 'desc' },
          take: 50,
          include: {
            gallery: { select: { title: true, slug: true } },
          },
        },
      },
    });

    if (!client) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Client not found or belongs to another studio',
      });
    }

    // Calculate aggregated metrics for this client across associated galleries
    const galleryIds = client.galleries.map((cg) => cg.gallery_id);
    if (client.gallery_id && !galleryIds.includes(client.gallery_id)) {
      galleryIds.push(client.gallery_id);
    }

    let totalPhotosDelivered = 0;
    let totalFavorites = 0;
    let totalSelections = 0;
    let totalDownloads = 0;

    if (galleryIds.length > 0) {
      const [photosCount, favsCount, selCount, dlCount] = await Promise.all([
        prisma.photo.count({ where: { gallery_id: { in: galleryIds } } }),
        prisma.galleryFavorite.count({ where: { gallery_id: { in: galleryIds } } }),
        prisma.gallerySelection.count({ where: { gallery_id: { in: galleryIds } } }),
        prisma.clientDownloadJob.count({ where: { gallery_id: { in: galleryIds } } }),
      ]);
      totalPhotosDelivered = photosCount;
      totalFavorites = favsCount;
      totalSelections = selCount;
      totalDownloads = dlCount;
    }

    return reply.send({
      success: true,
      data: {
        ...client,
        stats: {
          total_galleries: galleryIds.length,
          total_photos_delivered: totalPhotosDelivered,
          favorites: totalFavorites,
          selections: totalSelections,
          downloads: totalDownloads,
          last_activity: client.activities[0]?.created_at || client.updated_at,
        },
      },
    });
  }

  /**
   * Update client details, private notes, tags, or status.
   */
  static async update(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const studioId = request.studioId!;
    const { id } = request.params;
    const input = updateClientSchema.parse(request.body);

    const existing = await prisma.client.findFirst({
      where: { id, studio_id: studioId },
    });

    if (!existing) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Client not found or belongs to another studio',
      });
    }

    const computedName = input.name || (input.first_name || input.last_name
      ? `${input.first_name || existing.first_name || ''} ${input.last_name || existing.last_name || ''}`.trim()
      : undefined);

    const updated = await prisma.client.update({
      where: { id },
      data: {
        first_name: input.first_name !== undefined ? input.first_name : existing.first_name,
        last_name: input.last_name !== undefined ? input.last_name : existing.last_name,
        name: computedName || existing.name,
        email: input.email !== undefined ? input.email : existing.email,
        phone: input.phone !== undefined ? input.phone : existing.phone,
        company: input.company !== undefined ? input.company : existing.company,
        notes: input.notes !== undefined ? input.notes : existing.notes,
        tags: input.tags !== undefined ? input.tags : existing.tags,
        status: (input.status as ClientStatus) || existing.status,
      },
    });

    // Log activity
    await prisma.clientActivity.create({
      data: {
        studio_id: studioId,
        client_id: id,
        activity_type: 'CLIENT_UPDATED',
        description: 'Client profile information updated',
      },
    }).catch(() => null);

    return reply.send({
      success: true,
      data: updated,
    });
  }

  /**
   * Soft delete a client.
   */
  static async softDelete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const studioId = request.studioId!;
    const { id } = request.params;

    const existing = await prisma.client.findFirst({
      where: { id, studio_id: studioId },
    });

    if (!existing) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Client not found or belongs to another studio',
      });
    }

    const deleted = await prisma.client.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        status: ClientStatus.ARCHIVED,
      },
    });

    // Log CLIENT_ARCHIVED
    await prisma.clientActivity.create({
      data: {
        studio_id: studioId,
        client_id: id,
        activity_type: 'CLIENT_ARCHIVED',
        description: `Client ${existing.name} archived (soft deleted)`,
      },
    }).catch(() => null);

    return reply.send({
      success: true,
      message: 'Client successfully archived',
      data: deleted,
    });
  }

  /**
   * Restore a soft-deleted client.
   */
  static async restore(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const studioId = request.studioId!;
    const { id } = request.params;

    const existing = await prisma.client.findFirst({
      where: { id, studio_id: studioId },
    });

    if (!existing) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Client not found or belongs to another studio',
      });
    }

    const restored = await prisma.client.update({
      where: { id },
      data: {
        deleted_at: null,
        status: ClientStatus.ACTIVE,
      },
    });

    // Log CLIENT_RESTORED
    await prisma.clientActivity.create({
      data: {
        studio_id: studioId,
        client_id: id,
        activity_type: 'CLIENT_RESTORED',
        description: `Client ${existing.name} restored to active status`,
      },
    }).catch(() => null);

    return reply.send({
      success: true,
      message: 'Client restored successfully',
      data: restored,
    });
  }

  /**
   * List galleries assigned to a client.
   */
  static async listGalleries(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const studioId = request.studioId!;
    const { id } = request.params;

    const client = await prisma.client.findFirst({
      where: { id, studio_id: studioId },
    });

    if (!client) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Client not found',
      });
    }

    const clientGalleries = await prisma.clientGallery.findMany({
      where: { client_id: id, studio_id: studioId },
      include: {
        gallery: {
          select: {
            id: true,
            title: true,
            slug: true,
            event_type: true,
            event_date: true,
            cover_photo_url: true,
            status: true,
            access_type: true,
            expires_at: true,
            downloads_enabled: true,
            created_at: true,
            _count: { select: { photos: true } },
          },
        },
      },
    });

    return reply.send({
      success: true,
      data: clientGalleries,
    });
  }

  /**
   * Get paginated activity timeline for a client.
   */
  static async listActivity(request: FastifyRequest<{ Params: { id: string }; Querystring: { limit?: number; cursor?: string } }>, reply: FastifyReply) {
    const studioId = request.studioId!;
    const { id } = request.params;
    const limit = Math.min(Number(request.query?.limit) || 20, 100);

    const client = await prisma.client.findFirst({
      where: { id, studio_id: studioId },
    });

    if (!client) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Client not found',
      });
    }

    const activities = await prisma.clientActivity.findMany({
      where: { client_id: id, studio_id: studioId },
      take: limit + 1,
      orderBy: { created_at: 'desc' },
      include: {
        gallery: { select: { id: true, title: true, slug: true } },
      },
    });

    const hasMore = activities.length > limit;
    const data = hasMore ? activities.slice(0, limit) : activities;

    return reply.send({
      success: true,
      data: {
        activities: data,
        has_more: hasMore,
      },
    });
  }

  // =========================================================================
  // PHASE 29: CRM 2.0 HANDLERS
  // =========================================================================

  /**
   * Convert Lead to Client (idempotent, deduplicated)
   */
  static async convertLead(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;
    const userId = (request.user as any)?.id;
    const schema = z.object({
      lead_id: z.string().uuid(),
      name: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      company: z.string().optional(),
      tags: z.array(z.string()).optional(),
      notes: z.string().optional(),
      assigned_user_id: z.string().uuid().optional(),
      create_project: z.boolean().optional(),
      project_name: z.string().optional(),
      project_type: z.string().optional(),
    });

    const body = schema.parse(request.body);
    const crmService = new CRMService();
    try {
      const result = await crmService.convertLeadToClient(studioId, body as any, userId);
      return reply.status(result.is_new_client ? 201 : 200).send({
        success: true,
        data: result,
      });
    } catch (err: any) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: err.message || 'Failed to convert lead',
      });
    }
  }

  /**
   * Find candidate duplicate clients inside the studio
   */
  static async findDuplicates(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;
    const query = z.object({
      client_id: z.string().uuid().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      name: z.string().optional(),
    }).parse(request.query);

    const crmService = new CRMService();
    const duplicates = await crmService.findDuplicateCandidates(studioId, query);
    return reply.send({
      success: true,
      data: duplicates,
    });
  }

  /**
   * Preview a safe client merge
   */
  static async previewMerge(request: FastifyRequest<{ Params: { id: string; targetId: string } }>, reply: FastifyReply) {
    const studioId = request.studioId!;
    const { id, targetId } = request.params;

    const crmService = new CRMService();
    const preview = await crmService.previewMerge(studioId, id, targetId);
    return reply.send({
      success: true,
      data: preview,
    });
  }

  /**
   * Execute transactional client merge
   */
  static async executeMerge(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const studioId = request.studioId!;
    const userId = (request.user as any)?.id;
    const { id } = request.params;

    const schema = z.object({
      target_client_id: z.string().uuid(),
      confirmed: z.boolean(),
      notes: z.string().optional(),
    });

    const body = schema.parse(request.body);
    const crmService = new CRMService();

    try {
      const result = await crmService.executeMerge(
        studioId,
        {
          source_client_id: id,
          target_client_id: body.target_client_id,
          confirmed: body.confirmed,
          notes: body.notes,
        },
        userId
      );
      return reply.send({
        success: true,
        data: result,
      });
    } catch (err: any) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: err.message || 'Failed to merge clients',
      });
    }
  }

  /**
   * Get Comprehensive Client 360 view
   */
  static async get360(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const studioId = request.studioId!;
    const { id } = request.params;

    const crmService = new CRMService();
    try {
      const data = await crmService.getClient360(studioId, id);
      return reply.send({
        success: true,
        data,
      });
    } catch (err: any) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: err.message || 'Client not found',
      });
    }
  }

  /**
   * Get Relationship Timeline with server-side category filters and pagination
   */
  static async getTimeline(
    request: FastifyRequest<{
      Params: { id: string };
      Querystring: { category?: string; page?: number; limit?: number };
    }>,
    reply: FastifyReply
  ) {
    const studioId = request.studioId!;
    const { id } = request.params;
    const filter = {
      category: request.query?.category as any,
      page: Number(request.query?.page) || 1,
      limit: Math.min(Number(request.query?.limit) || 50, 100),
    };

    const crmService = new CRMService();
    try {
      const result = await crmService.getClientTimeline(studioId, id, filter);
      return reply.send({
        success: true,
        data: result,
      });
    } catch (err: any) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: err.message || 'Client not found',
      });
    }
  }

  /**
   * Get Follow-up Center Items
   */
  static async getFollowUpsCenter(
    request: FastifyRequest<{ Querystring: { status?: string; priority?: string; clientId?: string } }>,
    reply: FastifyReply
  ) {
    const studioId = request.studioId!;
    const crmService = new CRMService();
    const data = await crmService.getFollowUpsCenter(studioId, request.query || {});
    return reply.send({
      success: true,
      data,
    });
  }

  /**
   * Create Custom Field Definition
   */
  static async createCustomFieldDefinition(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;
    const schema = z.object({
      name: z.string().min(1),
      key: z.string().min(1),
      field_type: z.enum(['TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'SELECT']).default('TEXT'),
      options: z.array(z.string()).optional(),
      required: z.boolean().optional().default(false),
    });

    const body = schema.parse(request.body);
    const crmService = new CRMService();
    try {
      const definition = await crmService.createCustomFieldDefinition(studioId, body);
      return reply.status(201).send({
        success: true,
        data: definition,
      });
    } catch (err: any) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: err.message || 'Failed to create custom field',
      });
    }
  }

  /**
   * List Custom Field Definitions
   */
  static async listCustomFieldDefinitions(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;
    const crmService = new CRMService();
    const definitions = await crmService.listCustomFieldDefinitions(studioId);
    return reply.send({
      success: true,
      data: definitions,
    });
  }

  /**
   * Set Client Custom Field Value
   */
  static async setCustomFieldValue(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const studioId = request.studioId!;
    const { id } = request.params;
    const schema = z.object({
      field_id: z.string().uuid(),
      value: z.string(),
    });

    const body = schema.parse(request.body);
    const crmService = new CRMService();
    try {
      const val = await crmService.setClientCustomFieldValue(studioId, id, body.field_id, body.value);
      return reply.send({
        success: true,
        data: val,
      });
    } catch (err: any) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: err.message || 'Failed to set custom field value',
      });
    }
  }

  /**
   * Add Important Date
   */
  static async addImportantDate(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const studioId = request.studioId!;
    const { id } = request.params;
    const schema = z.object({
      title: z.string().min(1),
      date_type: z.enum(['ANNIVERSARY', 'BIRTHDAY', 'EVENT_DATE', 'COMPANY_MILESTONE', 'OTHER']).default('OTHER'),
      date_value: z.string(),
      is_recurring: z.boolean().optional().default(true),
      notes: z.string().optional(),
    });

    const body = schema.parse(request.body);
    const crmService = new CRMService();
    try {
      const item = await crmService.addImportantDate(studioId, id, body);
      return reply.status(201).send({
        success: true,
        data: item,
      });
    } catch (err: any) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: err.message || 'Failed to add important date',
      });
    }
  }

  /**
   * Add Structured Internal Note
   */
  static async addNote(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const studioId = request.studioId!;
    const userId = (request.user as any)?.id;
    const { id } = request.params;
    const schema = z.object({
      content: z.string().min(1),
      is_pinned: z.boolean().optional().default(false),
    });

    const body = schema.parse(request.body);
    const crmService = new CRMService();
    try {
      const note = await crmService.addClientNote(studioId, id, body.content, userId, body.is_pinned);
      return reply.status(201).send({
        success: true,
        data: note,
      });
    } catch (err: any) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: err.message || 'Failed to add note',
      });
    }
  }

  /**
   * Assign Client to Studio Member
   */
  static async assign(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const studioId = request.studioId!;
    const performingUserId = (request.user as any)?.id;
    const { id } = request.params;
    const schema = z.object({
      assigned_user_id: z.string().uuid().nullable(),
    });

    const body = schema.parse(request.body);
    const crmService = new CRMService();
    try {
      const client = await crmService.assignClient(studioId, id, body.assigned_user_id, performingUserId);
      return reply.send({
        success: true,
        data: client,
      });
    } catch (err: any) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: err.message || 'Failed to assign client',
      });
    }
  }

  /**
   * Perform Safe Bulk Actions
   */
  static async bulkAction(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;
    const userId = (request.user as any)?.id;
    const schema = z.object({
      client_ids: z.array(z.string().uuid()).min(1),
      action: z.enum(['ASSIGN', 'ADD_TAGS', 'REMOVE_TAGS', 'UPDATE_STATUS', 'CREATE_FOLLOW_UP']),
      assigned_user_id: z.string().uuid().optional(),
      tags: z.array(z.string()).optional(),
      relationship_status: z.string().optional(),
      follow_up_title: z.string().optional(),
      follow_up_reason: z.string().optional(),
    });

    const body = schema.parse(request.body);
    const crmService = new CRMService();
    try {
      const result = await crmService.performBulkActions(studioId, body as any, userId);
      return reply.send({
        success: true,
        data: result,
      });
    } catch (err: any) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: err.message || 'Failed to perform bulk action',
      });
    }
  }

  /**
   * Export CRM Clients CSV (Formula-injection hardened)
   */
  static async exportCSV(request: FastifyRequest, reply: FastifyReply) {
    const studioId = request.studioId!;
    const crmService = new CRMService();
    const csvContent = await crmService.exportClientsCSV(studioId);

    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header('Content-Disposition', `attachment; filename="clients-export-${new Date().toISOString().split('T')[0]}.csv"`);
    return reply.send(csvContent);
  }
}

