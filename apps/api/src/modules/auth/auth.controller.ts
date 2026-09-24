import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma, UserRole, StudioMemberRole } from '@pixmatch/database';
import { hashPassword, verifyPassword, signAccessToken, signRefreshToken } from '@pixmatch/auth';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  studioName: z.string().min(2),
});

export class AuthController {
  static async login(request: FastifyRequest, reply: FastifyReply) {
    const { email, password } = loginSchema.parse(request.body);

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: {
            studio: true,
          },
        },
      },
    });

    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      });
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return reply.status(401).send({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      });
    }

    const primaryMembership = user.memberships[0];
    const studio = primaryMembership?.studio ?? null;

    const token = signAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role as any,
      studioId: studio?.id ?? null,
      studioMemberRole: (primaryMembership?.role as any) ?? null,
    });

    const refreshToken = signRefreshToken({ userId: user.id });

    return reply.send({
      success: true,
      data: {
        token,
        refreshToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar_url: user.avatar_url,
          created_at: user.created_at,
          updated_at: user.updated_at,
        },
        studio: studio
          ? {
              id: studio.id,
              name: studio.name,
              slug: studio.slug,
              logo_url: studio.logo_url,
              website: studio.website,
            }
          : null,
      },
    });
  }

  static async register(request: FastifyRequest, reply: FastifyReply) {
    const { name, email, password, studioName } = registerSchema.parse(request.body);

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return reply.status(400).send({
        success: false,
        error: { code: 'EMAIL_EXISTS', message: 'User with this email already exists' },
      });
    }

    const password_hash = await hashPassword(password);
    const studioSlug = studioName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Transaction to create User, Studio, StudioMembership, and Free Subscription
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          password_hash,
          role: UserRole.STUDIO_OWNER,
        },
      });

      const studio = await tx.studio.create({
        data: {
          name: studioName,
          slug: `${studioSlug}-${Date.now().toString().slice(-4)}`,
        },
      });

      const membership = await tx.studioMembership.create({
        data: {
          user_id: user.id,
          studio_id: studio.id,
          role: StudioMemberRole.OWNER,
        },
      });

      await tx.subscription.create({
        data: {
          studio_id: studio.id,
          plan: 'FREE',
          status: 'ACTIVE',
          storage_limit_bytes: BigInt(2 * 1024 * 1024 * 1024),
          photo_limit: 500,
          ai_search_limit: 50,
        },
      });

      // Default platform storage connection
      await tx.storageConnection.create({
        data: {
          studio_id: studio.id,
          provider: 'PLATFORM',
          display_name: 'PixMatch Fast Local Storage',
          status: 'ACTIVE',
        },
      });

      return { user, studio, membership };
    });

    const token = signAccessToken({
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role as any,
      studioId: result.studio.id,
      studioMemberRole: result.membership.role as any,
    });

    const refreshToken = signRefreshToken({ userId: result.user.id });

    return reply.status(201).send({
      success: true,
      data: {
        token,
        refreshToken,
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
        },
        studio: {
          id: result.studio.id,
          name: result.studio.name,
          slug: result.studio.slug,
        },
      },
    });
  }

  static async me(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
    }

    const user = await prisma.user.findUnique({
      where: { id: request.user.userId },
      include: {
        memberships: {
          include: {
            studio: {
              include: {
                subscription: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return reply.status(404).send({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
    }

    const primaryMembership = user.memberships[0];
    const studio = primaryMembership?.studio ?? null;

    return reply.send({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar_url: user.avatar_url,
          created_at: user.created_at,
          updated_at: user.updated_at,
        },
        studio: studio
          ? {
              id: studio.id,
              name: studio.name,
              slug: studio.slug,
              logo_url: studio.logo_url,
              website: studio.website,
              subscription: studio.subscription
                ? {
                    plan: studio.subscription.plan,
                    status: studio.subscription.status,
                    storage_limit_bytes: studio.subscription.storage_limit_bytes.toString(),
                    photo_limit: studio.subscription.photo_limit,
                    ai_search_limit: studio.subscription.ai_search_limit,
                  }
                : null,
            }
          : null,
        membership: primaryMembership
          ? {
              role: primaryMembership.role,
            }
          : null,
      },
    });
  }
}
