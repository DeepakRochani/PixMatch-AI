/**
 * Studio Team Collaboration & Internal Operations 2.0 Service — PIXMatch AI Phase 32
 */

import { PrismaClient } from '@prisma/client';
import {
  CollaborationThreadType,
  CollaborationThreadStatus,
  CollaborationMessageType,
  WorkHandoffStatus,
  WorkBlockerSeverity,
  WorkBlockerStatus,
  HelpRequestCategory,
  HelpRequestPriority,
  HelpRequestStatus,
  ITeamCollaborationThreadDTO,
  ITeamCollaborationMessageDTO,
  ITeamMentionDTO,
  ITeamHandoffDTO,
  ITeamBlockerDTO,
  ITeamHelpRequestDTO,
  ITeamCollaborationAttachmentDTO,
  ITeamAttentionDTO,
  ITeamAttentionItemDTO,
  ICreateThreadDTO,
  ICreateMessageDTO,
  ICreateHandoffDTO,
  ICreateBlockerDTO,
  ICreateHelpRequestDTO,
  ICollaborationSearchFilterDTO,
  ICollaborationSearchResultDTO,
} from '@pixmatch/types';

export class StudioTeamCollaborationService {
  constructor(private db: PrismaClient | any) {}

  private getDb(): any {
    return this.db;
  }

  // -------------------------------------------------------------
  // Content Sanitization & Security Helpers
  // -------------------------------------------------------------

  /**
   * Sanitizes message and note bodies against XSS and dangerous URL schemes.
   * Blocks javascript:, data:, and vbscript: URIs.
   */
  static sanitizeContent(text: string): string {
    if (!text) return '';
    let sanitized = String(text)
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript\s*:/gi, 'blocked-scheme:')
      .replace(/data\s*:\s*text\/html/gi, 'blocked-data:')
      .replace(/vbscript\s*:/gi, 'blocked-scheme:');

    return sanitized;
  }

  /**
   * Sanitizes fields against CSV formula injection.
   */
  static sanitizeCSVField(val: unknown): string {
    if (val === null || val === undefined) return '';
    let str = String(val);
    if (/^[=+\-@\t\r]/.test(str)) {
      str = `'${str}`;
    }
    if (str.includes(',') || str.includes('\n')) {
      str = `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  /**
   * Validates file attachments for safe MIME types and size (max 25MB).
   */
  static validateAttachment(mimeType: string, sizeBytes: number, originalFilename: string) {
    const MAX_SIZE = 25 * 1024 * 1024; // 25 MB
    if (sizeBytes > MAX_SIZE) {
      throw new Error(`File size ${sizeBytes} exceeds maximum permitted limit of 25MB`);
    }
    if (sizeBytes <= 0) {
      throw new Error('File size must be greater than zero bytes');
    }

    // Path traversal in filename
    if (originalFilename.includes('..') || originalFilename.includes('/') || originalFilename.includes('\\')) {
      throw new Error('Invalid filename containing path traversal characters');
    }

    const allowedMimes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
      'text/csv',
      'text/plain',
      'application/zip',
    ];

    const lowerMime = mimeType.toLowerCase();
    const isAllowed = allowedMimes.includes(lowerMime) || lowerMime.startsWith('image/');
    if (!isAllowed) {
      throw new Error(`MIME type '${mimeType}' is not permitted for internal attachments`);
    }
  }

  /**
   * Extracts member IDs from Markdown @[Name](member:member_id)
   */
  static extractMentions(text: string): string[] {
    if (!text) return [];
    const pattern = /@\[([^\]]+)\]\(member:([^)]+)\)/g;
    const memberIds: string[] = [];
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match[2]) {
        memberIds.push(match[2]);
      }
    }
    return memberIds;
  }

  /**
   * Resolves membership of a user in a studio.
   */
  async resolveMember(studioId: string, userId: string): Promise<any> {
    const db = this.getDb();
    const member = await db.studioMembership.findFirst({
      where: {
        studio_id: studioId,
        OR: [
          { user_id: userId },
          { id: userId },
        ],
      },
      include: {
        user: true,
      },
    });

    if (!member) {
      throw new Error('User is not a member of this studio');
    }
    if (member.status === 'DEACTIVATED' || member.status === 'SUSPENDED') {
      throw new Error(`Access denied: member account is ${member.status.toLowerCase()}`);
    }
    return member;
  }

  // -------------------------------------------------------------
  // 1. COLLABORATION THREADS
  // -------------------------------------------------------------

  async createThread(
    studioId: string,
    userId: string,
    dto: ICreateThreadDTO
  ): Promise<ITeamCollaborationThreadDTO> {
    const db = this.getDb();
    const member = await this.resolveMember(studioId, userId);

    if (dto.project_id) {
      const proj = await db.operationProject?.findFirst?.({
        where: { id: dto.project_id, studio_id: studioId },
      });
      if (!proj) throw new Error('Referenced project not found in this studio');
    }
    if (dto.task_id) {
      const task = await db.operationTask?.findFirst?.({
        where: { id: dto.task_id, studio_id: studioId },
      });
      if (!task) throw new Error('Referenced task not found in this studio');
    }
    if (dto.client_id) {
      const cl = await db.client?.findFirst?.({
        where: { id: dto.client_id, studio_id: studioId },
      });
      if (!cl) throw new Error('Referenced client not found in this studio');
    }

    const thread = await db.teamCollaborationThread.create({
      data: {
        studio_id: studioId,
        project_id: dto.project_id || null,
        task_id: dto.task_id || null,
        client_id: dto.client_id || null,
        gallery_id: dto.gallery_id || null,
        production_project_id: dto.production_project_id || null,
        title: dto.title ? StudioTeamCollaborationService.sanitizeContent(dto.title) : null,
        thread_type: dto.thread_type || CollaborationThreadType.GENERAL,
        created_by_member_id: member.id,
        status: CollaborationThreadStatus.ACTIVE,
        last_activity_at: new Date(),
      },
    });

    // Create initial message if provided
    let initialMsg: any = null;
    if (dto.initial_message) {
      initialMsg = await this.createMessage(studioId, userId, thread.id, {
        body: dto.initial_message,
        message_type: CollaborationMessageType.MESSAGE,
        attachments: dto.attachments,
      });
    }

    // Log Activity
    await db.studioTeamActivity.create({
      data: {
        studio_id: studioId,
        member_id: member.id,
        user_id: userId,
        activity_type: 'THREAD_CREATED',
        title: `Collaboration thread started: ${thread.title || thread.thread_type}`,
        description: dto.initial_message ? dto.initial_message.substring(0, 120) : null,
        metadata: { thread_id: thread.id, thread_type: thread.thread_type },
      },
    });

    return {
      id: thread.id,
      studio_id: thread.studio_id,
      project_id: thread.project_id,
      task_id: thread.task_id,
      client_id: thread.client_id,
      gallery_id: thread.gallery_id,
      production_project_id: thread.production_project_id,
      title: thread.title,
      thread_type: thread.thread_type as CollaborationThreadType,
      created_by_member_id: thread.created_by_member_id,
      created_by_name: member.user?.name || 'Member',
      status: thread.status as CollaborationThreadStatus,
      created_at: thread.created_at,
      updated_at: thread.updated_at,
      last_activity_at: thread.last_activity_at,
      archived_at: thread.archived_at,
      message_count: initialMsg ? 1 : 0,
      unread_count: 0,
      last_message: initialMsg || null,
    };
  }

  async listThreads(
    studioId: string,
    userId: string,
    filters: {
      project_id?: string;
      task_id?: string;
      client_id?: string;
      status?: CollaborationThreadStatus;
      thread_type?: CollaborationThreadType;
      search?: string;
      limit?: number;
      cursor?: string;
    } = {}
  ): Promise<{ items: ITeamCollaborationThreadDTO[]; has_more: boolean; next_cursor?: string | null }> {
    const db = this.getDb();
    const member = await this.resolveMember(studioId, userId);

    const limit = Math.min(Math.max(filters.limit || 30, 1), 100);
    const where: any = { studio_id: studioId };

    if (filters.project_id) where.project_id = filters.project_id;
    if (filters.task_id) where.task_id = filters.task_id;
    if (filters.client_id) where.client_id = filters.client_id;
    if (filters.status) where.status = filters.status;
    if (filters.thread_type) where.thread_type = filters.thread_type;
    if (filters.search) {
      where.title = { contains: filters.search, mode: 'insensitive' };
    }

    const threads = await db.teamCollaborationThread.findMany({
      where,
      orderBy: { last_activity_at: 'desc' },
      take: limit + 1,
      include: {
        read_states: {
          where: { member_id: member.id },
        },
      },
    });

    const hasMore = threads.length > limit;
    const itemsToProcess = hasMore ? threads.slice(0, limit) : threads;

    // Enrich with author name, message count & last message
    const enriched: ITeamCollaborationThreadDTO[] = await Promise.all(
      itemsToProcess.map(async (t: any) => {
        const [msgCount, lastMsg, author] = await Promise.all([
          db.teamCollaborationMessage.count({
            where: { thread_id: t.id, studio_id: studioId, deleted_at: null },
          }),
          db.teamCollaborationMessage.findFirst({
            where: { thread_id: t.id, studio_id: studioId, deleted_at: null },
            orderBy: { created_at: 'desc' },
          }),
          db.studioMembership.findUnique({
            where: { id: t.created_by_member_id },
            include: { user: true },
          }),
        ]);

        const readState = t.read_states?.[0];
        let unreadCount = 0;
        if (readState && readState.last_read_at) {
          unreadCount = await db.teamCollaborationMessage.count({
            where: {
              thread_id: t.id,
              studio_id: studioId,
              deleted_at: null,
              created_at: { gt: readState.last_read_at },
            },
          });
        } else if (!readState) {
          unreadCount = msgCount;
        }

        return {
          id: t.id,
          studio_id: t.studio_id,
          project_id: t.project_id,
          task_id: t.task_id,
          client_id: t.client_id,
          gallery_id: t.gallery_id,
          production_project_id: t.production_project_id,
          title: t.title,
          thread_type: t.thread_type as CollaborationThreadType,
          created_by_member_id: t.created_by_member_id,
          created_by_name: author?.user?.name || 'Member',
          status: t.status as CollaborationThreadStatus,
          created_at: t.created_at,
          updated_at: t.updated_at,
          last_activity_at: t.last_activity_at,
          archived_at: t.archived_at,
          message_count: msgCount,
          unread_count: unreadCount,
          last_message: lastMsg
            ? {
                id: lastMsg.id,
                thread_id: lastMsg.thread_id,
                studio_id: lastMsg.studio_id,
                author_member_id: lastMsg.author_member_id,
                body: lastMsg.body,
                message_type: lastMsg.message_type as CollaborationMessageType,
                created_at: lastMsg.created_at,
              }
            : null,
        };
      })
    );

    return {
      threads: enriched,
      items: enriched,
      has_more: hasMore,
      next_cursor: hasMore ? itemsToProcess[itemsToProcess.length - 1].id : null,
    };
  }

  async getThread(studioId: string, userId: string, threadId: string): Promise<ITeamCollaborationThreadDTO> {
    const db = this.getDb();
    const member = await this.resolveMember(studioId, userId);

    const thread = await db.teamCollaborationThread.findFirst({
      where: { id: threadId, studio_id: studioId },
    });

    if (!thread) {
      throw new Error('Collaboration thread not found');
    }

    const [author, msgCount, readState] = await Promise.all([
      db.studioMembership.findUnique({
        where: { id: thread.created_by_member_id },
        include: { user: true },
      }),
      db.teamCollaborationMessage.count({
        where: { thread_id: thread.id, studio_id: studioId, deleted_at: null },
      }),
      db.teamThreadReadState.findUnique({
        where: {
          studio_id_thread_id_member_id: {
            studio_id: studioId,
            thread_id: thread.id,
            member_id: member.id,
          },
        },
      }),
    ]);

    let unreadCount = 0;
    if (readState && readState.last_read_at) {
      unreadCount = await db.teamCollaborationMessage.count({
        where: {
          thread_id: thread.id,
          studio_id: studioId,
          deleted_at: null,
          created_at: { gt: readState.last_read_at },
        },
      });
    } else if (!readState) {
      unreadCount = msgCount;
    }

    return {
      id: thread.id,
      studio_id: thread.studio_id,
      project_id: thread.project_id,
      task_id: thread.task_id,
      client_id: thread.client_id,
      gallery_id: thread.gallery_id,
      production_project_id: thread.production_project_id,
      title: thread.title,
      thread_type: thread.thread_type as CollaborationThreadType,
      created_by_member_id: thread.created_by_member_id,
      created_by_name: author?.user?.name || 'Member',
      status: thread.status as CollaborationThreadStatus,
      created_at: thread.created_at,
      updated_at: thread.updated_at,
      last_activity_at: thread.last_activity_at,
      archived_at: thread.archived_at,
      message_count: msgCount,
      unread_count: unreadCount,
    };
  }

  async updateThread(
    studioId: string,
    userId: string,
    threadId: string,
    dto: { title?: string; status?: CollaborationThreadStatus }
  ): Promise<ITeamCollaborationThreadDTO> {
    const db = this.getDb();
    await this.resolveMember(studioId, userId);

    const existing = await db.teamCollaborationThread.findFirst({
      where: { id: threadId, studio_id: studioId },
    });
    if (!existing) throw new Error('Collaboration thread not found');

    const data: any = { updated_at: new Date() };
    if (dto.title !== undefined) {
      data.title = dto.title ? StudioTeamCollaborationService.sanitizeContent(dto.title) : null;
    }
    if (dto.status !== undefined) {
      data.status = dto.status;
      if (dto.status === CollaborationThreadStatus.ARCHIVED) {
        data.archived_at = new Date();
      } else if (dto.status === CollaborationThreadStatus.ACTIVE) {
        data.archived_at = null;
      }
    }

    const updated = await db.teamCollaborationThread.update({
      where: { id: threadId },
      data,
    });

    return this.getThread(studioId, userId, updated.id);
  }

  // -------------------------------------------------------------
  // 2. MESSAGES & REPLIES
  // -------------------------------------------------------------

  async createMessage(
    studioId: string,
    userId: string,
    threadId: string,
    dto: ICreateMessageDTO
  ): Promise<ITeamCollaborationMessageDTO> {
    const db = this.getDb();
    const member = await this.resolveMember(studioId, userId);

    const thread = await db.teamCollaborationThread.findFirst({
      where: { id: threadId, studio_id: studioId },
    });
    if (!thread) throw new Error('Collaboration thread not found');

    if (thread.status === CollaborationThreadStatus.ARCHIVED || thread.status === CollaborationThreadStatus.CLOSED) {
      throw new Error(`Cannot send message: thread is ${thread.status.toLowerCase()}`);
    }

    const cleanBody = StudioTeamCollaborationService.sanitizeContent(dto.body);
    if (!cleanBody.trim()) {
      throw new Error('Message body cannot be empty');
    }

    const replyId = dto.reply_to_id || (dto as any).parent_message_id || null;

    // Validate reply target if present
    if (replyId) {
      const replyTarget = await db.teamCollaborationMessage.findFirst({
        where: { id: replyId, thread_id: threadId, studio_id: studioId },
      });
      if (!replyTarget) {
        throw new Error('Reply target message not found in this thread');
      }
    }

    const msg = await db.teamCollaborationMessage.create({
      data: {
        thread_id: threadId,
        studio_id: studioId,
        author_member_id: member.id,
        body: cleanBody,
        message_type: dto.message_type || CollaborationMessageType.MESSAGE,
        reply_to_id: replyId,
        created_at: new Date(),
      },
    });

    // Update thread activity timestamp
    await db.teamCollaborationThread.update({
      where: { id: threadId },
      data: {
        last_activity_at: new Date(),
        updated_at: new Date(),
        message_count: { increment: 1 },
      },
    });

    // Auto mark read for author
    await this.markThreadRead(studioId, userId, threadId, msg.id);

    // Process mentions (both explicit DTO list and parsed from markdown @[Name](member:id))
    const mentionsCreated: ITeamMentionDTO[] = [];
    const extractedFromText = StudioTeamCollaborationService.extractMentions(dto.body);
    const combinedMentions = Array.from(
      new Set([...(dto.mentions || []), ...extractedFromText])
    );

    if (combinedMentions.length > 0) {
      for (const mId of combinedMentions) {
        if (mId === member.id) continue; // skip self mention

        // Verify mentioned member belongs to studio and is active
        const targetMember = await db.studioMembership.findFirst({
          where: { id: mId, studio_id: studioId },
          include: { user: true },
        });

        if (targetMember && targetMember.status === 'ACTIVE') {
          const mention = await db.teamMessageMention.create({
            data: {
              studio_id: studioId,
              message_id: msg.id,
              mentioned_member_id: targetMember.id,
              created_at: new Date(),
            },
          });

          mentionsCreated.push({
            id: mention.id,
            studio_id: studioId,
            message_id: msg.id,
            mentioned_member_id: targetMember.id,
            mentioned_member_name: targetMember.user?.name || targetMember.user_name || 'Member',
            created_at: mention.created_at,
          });

          // Log Activity for mention
          if (db.studioTeamActivity?.create) {
            await db.studioTeamActivity.create({
              data: {
                studio_id: studioId,
                member_id: targetMember.id,
                user_id: targetMember.user_id,
                activity_type: 'MEMBER_MENTIONED',
                title: `${member.user?.name || member.user_name || 'A team member'} mentioned you in a collaboration thread`,
                description: cleanBody.substring(0, 100),
                metadata: { thread_id: threadId, message_id: msg.id },
              },
            });
          }
        }
      }
    }

    // Process attachments
    const attachmentsCreated: any[] = [];
    if (dto.attachments && Array.isArray(dto.attachments)) {
      for (const att of dto.attachments) {
        const originalName = att.original_filename || (att as any).file_name || 'file';
        const sizeBytes = att.size_bytes || (att as any).file_size_bytes || 0;
        const mimeType = att.mime_type || 'application/octet-stream';

        StudioTeamCollaborationService.validateAttachment(mimeType, sizeBytes, originalName);

        const record = await db.teamCollaborationAttachment.create({
          data: {
            studio_id: studioId,
            message_id: msg.id,
            storage_key: att.storage_key,
            original_filename: originalName,
            mime_type: mimeType,
            size_bytes: sizeBytes,
            sha256: att.sha256 || null,
            created_by_member_id: member.id,
            created_at: new Date(),
          },
        });

        attachmentsCreated.push({
          id: record.id,
          studio_id: studioId,
          message_id: msg.id,
          storage_key: record.storage_key,
          original_filename: record.original_filename,
          file_name: record.original_filename, // alias
          mime_type: record.mime_type,
          size_bytes: record.size_bytes,
          file_size_bytes: record.size_bytes, // alias
          created_by_member_id: record.created_by_member_id,
          created_at: record.created_at,
        });
      }
    }

    return {
      id: msg.id,
      studio_id: msg.studio_id,
      thread_id: msg.thread_id,
      author_member_id: msg.author_member_id,
      author_name: member.user?.name || member.user_name || 'Member',
      author_role: member.role,
      body: msg.body,
      message_type: msg.message_type as CollaborationMessageType,
      reply_to_id: msg.reply_to_id,
      parent_message_id: msg.reply_to_id, // alias
      is_edited: msg.is_edited || false,
      is_deleted: msg.is_deleted || false,
      created_at: msg.created_at,
      updated_at: msg.updated_at,
      mentions: mentionsCreated,
      attachments: attachmentsCreated,
      acknowledgements_count: 0,
      has_acknowledged: false,
    } as any;
  }

  async listMessages(
    studioId: string,
    userId: string,
    threadId: string,
    filters: { limit?: number; cursor?: string } = {}
  ): Promise<{ items: ITeamCollaborationMessageDTO[]; has_more: boolean; next_cursor?: string | null }> {
    const db = this.getDb();
    await this.resolveMember(studioId, userId);

    const thread = await db.teamCollaborationThread.findFirst({
      where: { id: threadId, studio_id: studioId },
    });
    if (!thread) throw new Error('Collaboration thread not found');

    const limit = Math.min(Math.max(filters.limit || 50, 1), 100);

    const messages = await db.teamCollaborationMessage.findMany({
      where: {
        thread_id: threadId,
        studio_id: studioId,
        deleted_at: null,
      },
      orderBy: { created_at: 'asc' },
      take: limit + 1,
      include: {
        mentions: true,
        attachments: true,
      },
    });

    const hasMore = messages.length > limit;
    const items = hasMore ? messages.slice(0, limit) : messages;

    // Enrich with author name, replies & acknowledgements
    const enriched: ITeamCollaborationMessageDTO[] = await Promise.all(
      items.map(async (m: any) => {
        const [author, acks, replyToMsg] = await Promise.all([
          db.studioMembership.findUnique({
            where: { id: m.author_member_id },
            include: { user: true },
          }),
          db.teamCollaborationAcknowledgement.findMany({
            where: {
              studio_id: studioId,
              entity_type: 'MESSAGE',
              entity_id: m.id,
            },
          }),
          m.reply_to_id
            ? db.teamCollaborationMessage.findUnique({
                where: { id: m.reply_to_id },
              })
            : null,
        ]);

        return {
          id: m.id,
          thread_id: m.thread_id,
          studio_id: m.studio_id,
          author_member_id: m.author_member_id,
          author_name: author?.user?.name || 'Member',
          author_role: author?.role || 'PHOTOGRAPHER',
          body: m.body,
          message_type: m.message_type as CollaborationMessageType,
          reply_to_id: m.reply_to_id,
          reply_to: replyToMsg
            ? {
                id: replyToMsg.id,
                author_name: 'Team Member',
                body: replyToMsg.body,
              }
            : null,
          created_at: m.created_at,
          edited_at: m.edited_at,
          deleted_at: m.deleted_at,
          mentions: m.mentions || [],
          attachments: (m.attachments || []).map((att: any) => ({
            id: att.id,
            studio_id: att.studio_id,
            message_id: att.message_id,
            storage_key: att.storage_key,
            original_filename: att.original_filename,
            mime_type: att.mime_type,
            size_bytes: att.size_bytes,
            sha256: att.sha256,
            created_by_member_id: att.created_by_member_id,
            created_at: att.created_at,
          })),
          acknowledgements: acks.map((a: any) => ({
            member_id: a.member_id,
            member_name: 'Member',
            created_at: a.created_at,
          })),
        };
      })
    );

    return {
      items: enriched,
      has_more: hasMore,
      next_cursor: hasMore ? items[items.length - 1].id : null,
    };
  }

  async updateMessage(
    studioId: string,
    userId: string,
    messageId: string,
    body: string
  ): Promise<ITeamCollaborationMessageDTO> {
    const db = this.getDb();
    const member = await this.resolveMember(studioId, userId);

    const message = await db.teamCollaborationMessage.findFirst({
      where: { id: messageId, studio_id: studioId },
    });
    if (!message) throw new Error('Message not found');

    // Only author or admin/owner can edit
    const isOwnerOrAdmin = ['OWNER', 'ADMIN'].includes(member.role);
    if (message.author_member_id !== member.id && !isOwnerOrAdmin) {
      throw new Error('Unauthorized to edit this message');
    }

    const cleanBody = StudioTeamCollaborationService.sanitizeContent(body);
    if (!cleanBody.trim()) throw new Error('Message body cannot be empty');

    const updated = await db.teamCollaborationMessage.update({
      where: { id: messageId },
      data: {
        body: cleanBody,
        edited_at: new Date(),
      },
    });

    return {
      id: updated.id,
      thread_id: updated.thread_id,
      studio_id: updated.studio_id,
      author_member_id: updated.author_member_id,
      author_name: member.user?.name || 'Member',
      author_role: member.role || 'PHOTOGRAPHER',
      body: updated.body,
      message_type: updated.message_type as CollaborationMessageType,
      reply_to_id: updated.reply_to_id,
      created_at: updated.created_at,
      edited_at: updated.edited_at,
      deleted_at: updated.deleted_at,
    };
  }

  async deleteMessage(
    studioId: string,
    userId: string,
    arg3: string,
    arg4?: string
  ): Promise<{ success: boolean; id: string; is_deleted?: boolean }> {
    const db = this.getDb();
    const member = await this.resolveMember(studioId, userId);
    const messageId = arg4 || arg3;

    const message = await db.teamCollaborationMessage.findFirst({
      where: { id: messageId, studio_id: studioId },
    });
    if (!message) throw new Error('Message not found');

    const isOwnerOrAdmin = ['OWNER', 'ADMIN', 'STUDIO_OWNER', 'STUDIO_ADMIN'].includes(member.role);
    if (message.author_member_id !== member.id && !isOwnerOrAdmin) {
      throw new Error('Unauthorized to delete this message');
    }

    // Soft deletion
    await db.teamCollaborationMessage.update({
      where: { id: messageId },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
        body: '[Message deleted]',
      },
    });

    return { success: true, id: messageId, is_deleted: true };
  }

  // -------------------------------------------------------------
  // 3. MENTIONS & READ STATES
  // -------------------------------------------------------------

  async listMentions(
    studioId: string,
    userId: string,
    filters: { unread_only?: boolean; limit?: number } = {}
  ): Promise<ITeamMentionDTO[]> {
    const db = this.getDb();
    const member = await this.resolveMember(studioId, userId);

    const where: any = {
      studio_id: studioId,
      mentioned_member_id: member.id,
    };
    if (filters.unread_only) {
      where.read_at = null;
    }

    const mentions = await db.teamMessageMention.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: filters.limit || 50,
      include: {
        message: {
          include: {
            thread: true,
          },
        },
      },
    });

    return mentions.map((m: any) => ({
      id: m.id,
      studio_id: m.studio_id,
      message_id: m.message_id,
      mentioned_member_id: m.mentioned_member_id,
      created_at: m.created_at,
      read_at: m.read_at,
      thread_id: m.message?.thread_id,
      thread_title: m.message?.thread?.title || 'Collaboration Thread',
      message_body: m.message?.body,
    }));
  }

  async markMentionRead(studioId: string, userId: string, mentionId: string): Promise<{ success: boolean }> {
    const db = this.getDb();
    const member = await this.resolveMember(studioId, userId);

    const mention = await db.teamMessageMention.findFirst({
      where: { id: mentionId, studio_id: studioId, mentioned_member_id: member.id },
    });
    if (!mention) throw new Error('Mention not found');

    await db.teamMessageMention.update({
      where: { id: mentionId },
      data: { read_at: new Date() },
    });

    return { success: true };
  }

  async markThreadRead(
    studioId: string,
    userId: string,
    threadId: string,
    lastReadMessageId?: string
  ): Promise<{ success: boolean }> {
    const db = this.getDb();
    const member = await this.resolveMember(studioId, userId);

    const thread = await db.teamCollaborationThread.findFirst({
      where: { id: threadId, studio_id: studioId },
    });
    if (!thread) throw new Error('Thread not found');

    await db.teamThreadReadState.upsert({
      where: {
        studio_id_thread_id_member_id: {
          studio_id: studioId,
          thread_id: threadId,
          member_id: member.id,
        },
      },
      create: {
        studio_id: studioId,
        thread_id: threadId,
        member_id: member.id,
        last_read_message_id: lastReadMessageId || null,
        last_read_at: new Date(),
      },
      update: {
        last_read_message_id: lastReadMessageId || undefined,
        last_read_at: new Date(),
      },
    });

    return { success: true };
  }

  // -------------------------------------------------------------
  // 4. ACKNOWLEDGEMENTS (Idempotent)
  // -------------------------------------------------------------

  async acknowledgeEntity(
    studioId: string,
    userId: string,
    entityType: string,
    entityId: string
  ): Promise<{ success: boolean; acknowledged: boolean; acknowledged_at: Date | null }> {
    const db = this.getDb();
    const member = await this.resolveMember(studioId, userId);

    const existing = await db.teamCollaborationAcknowledgement.findFirst({
      where: {
        studio_id: studioId,
        member_id: member.id,
        entity_type: entityType.toUpperCase(),
        entity_id: entityId,
      },
    });

    if (existing) {
      await db.teamCollaborationAcknowledgement.delete({
        where: { id: existing.id },
      });
      return { success: true, acknowledged: false, acknowledged_at: null };
    }

    const ack = await db.teamCollaborationAcknowledgement.create({
      data: {
        studio_id: studioId,
        member_id: member.id,
        entity_type: entityType.toUpperCase(),
        entity_id: entityId,
        created_at: new Date(),
      },
    });

    return { success: true, acknowledged: true, acknowledged_at: ack.created_at };
  }

  // -------------------------------------------------------------
  // 5. WORK HANDOFFS
  // -------------------------------------------------------------

  async createHandoff(
    studioId: string,
    userId: string,
    dto: ICreateHandoffDTO
  ): Promise<ITeamHandoffDTO> {
    const db = this.getDb();
    const member = await this.resolveMember(studioId, userId);

    if (dto.to_member_id === member.id) {
      throw new Error('Cannot hand off work to yourself');
    }

    const targetMember = await db.studioMembership.findFirst({
      where: { id: dto.to_member_id, studio_id: studioId },
      include: { user: true },
    });
    if (!targetMember || targetMember.status !== 'ACTIVE') {
      throw new Error('Target team member not found or is inactive');
    }
    if (dto.title !== undefined && !dto.title.trim()) {
      throw new Error('Handoff requires a non-empty title');
    }

    const cleanSummary = StudioTeamCollaborationService.sanitizeContent(dto.summary || dto.notes || dto.title || '');
    const cleanReason = StudioTeamCollaborationService.sanitizeContent(dto.reason || dto.title || 'Work handoff');

    if (!cleanSummary && !cleanReason) {
      throw new Error('Handoff requires a summary or reason');
    }

    const handoff = await db.teamWorkHandoff.create({
      data: {
        studio_id: studioId,
        from_member_id: member.id,
        to_member_id: targetMember.id,
        project_id: dto.project_id || null,
        task_id: dto.task_id || null,
        production_id: dto.production_id || null,
        client_id: dto.client_id || null,
        reason: cleanReason,
        summary: cleanSummary,
        status: WorkHandoffStatus.REQUESTED,
        created_at: new Date(),
      },
    });

    // Create activity
    await db.studioTeamActivity.create({
      data: {
        studio_id: studioId,
        member_id: targetMember.id,
        user_id: targetMember.user_id,
        activity_type: 'HANDOFF_REQUESTED',
        title: `Work handoff requested by ${member.user?.name || 'a teammate'}`,
        description: cleanSummary.substring(0, 120),
        metadata: { handoff_id: handoff.id, from_member_id: member.id },
      },
    });

    return {
      id: handoff.id,
      studio_id: handoff.studio_id,
      from_member_id: handoff.from_member_id,
      from_member_name: member.user?.name || 'Member',
      to_member_id: handoff.to_member_id,
      to_member_name: targetMember.user?.name || 'Member',
      project_id: handoff.project_id,
      task_id: handoff.task_id,
      production_id: handoff.production_id,
      client_id: handoff.client_id,
      reason: handoff.reason,
      summary: handoff.summary,
      status: handoff.status as WorkHandoffStatus,
      created_at: handoff.created_at,
    };
  }

  async listHandoffs(
    studioId: string,
    userId: string,
    filters: {
      status?: WorkHandoffStatus;
      to_member_id?: string;
      from_member_id?: string;
      project_id?: string;
      limit?: number;
    } = {}
  ): Promise<ITeamHandoffDTO[]> {
    const db = this.getDb();
    await this.resolveMember(studioId, userId);

    const where: any = { studio_id: studioId };
    if (filters.status) where.status = filters.status;
    if (filters.to_member_id) where.to_member_id = filters.to_member_id;
    if (filters.from_member_id) where.from_member_id = filters.from_member_id;
    if (filters.project_id) where.project_id = filters.project_id;

    const handoffs = await db.teamWorkHandoff.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: filters.limit || 50,
    });

    return Promise.all(
      handoffs.map(async (h: any) => {
        const [fromM, toM] = await Promise.all([
          db.studioMembership.findUnique({ where: { id: h.from_member_id }, include: { user: true } }),
          db.studioMembership.findUnique({ where: { id: h.to_member_id }, include: { user: true } }),
        ]);

        return {
          id: h.id,
          studio_id: h.studio_id,
          from_member_id: h.from_member_id,
          from_member_name: fromM?.user?.name || 'Member',
          to_member_id: h.to_member_id,
          to_member_name: toM?.user?.name || 'Member',
          project_id: h.project_id,
          task_id: h.task_id,
          production_id: h.production_id,
          client_id: h.client_id,
          reason: h.reason,
          summary: h.summary,
          status: h.status as WorkHandoffStatus,
          created_at: h.created_at,
          accepted_at: h.accepted_at,
          completed_at: h.completed_at,
        };
      })
    );
  }

  async acceptHandoff(studioId: string, userId: string, handoffId: string): Promise<ITeamHandoffDTO> {
    const db = this.getDb();
    const member = await this.resolveMember(studioId, userId);

    const handoff = await db.teamWorkHandoff.findFirst({
      where: { id: handoffId, studio_id: studioId },
    });
    if (!handoff) throw new Error('Work handoff request not found');

    const isOwnerOrAdmin = ['OWNER', 'ADMIN'].includes(member.role);
    if (handoff.to_member_id !== member.id && !isOwnerOrAdmin) {
      throw new Error('Unauthorized: only the designated recipient can accept this handoff');
    }

    if (handoff.status === WorkHandoffStatus.ACCEPTED) {
      // Idempotent return
      return this.getHandoff(studioId, userId, handoffId);
    }
    if (handoff.status !== WorkHandoffStatus.REQUESTED) {
      throw new Error(`Cannot accept handoff in status '${handoff.status}'`);
    }

    // Execute responsibility transfer if task/project/client is bound
    if (handoff.task_id && db.operationTask) {
      await db.operationTask.updateMany({
        where: { id: handoff.task_id, studio_id: studioId },
        data: { assigned_user_id: member.user_id },
      });
    }

    if (handoff.project_id && db.operationProject) {
      await db.operationProject.updateMany({
        where: { id: handoff.project_id, studio_id: studioId },
        data: { lead_id: member.user_id },
      });
    }

    if (handoff.client_id && db.client) {
      await db.client.updateMany({
        where: { id: handoff.client_id, studio_id: studioId },
        data: { account_manager_id: member.user_id },
      });
    }

    const updated = await db.teamWorkHandoff.update({
      where: { id: handoffId },
      data: {
        status: WorkHandoffStatus.ACCEPTED,
        accepted_at: new Date(),
      },
    });

    // Log Activity
    await db.studioTeamActivity.create({
      data: {
        studio_id: studioId,
        member_id: member.id,
        user_id: userId,
        activity_type: 'HANDOFF_ACCEPTED',
        title: `Work handoff accepted by ${member.user?.name || 'teammate'}`,
        description: handoff.summary,
        metadata: { handoff_id: handoff.id },
      },
    });

    return this.getHandoff(studioId, userId, updated.id);
  }

  async declineHandoff(
    studioId: string,
    userId: string,
    handoffId: string,
    reason?: string
  ): Promise<ITeamHandoffDTO> {
    const db = this.getDb();
    const member = await this.resolveMember(studioId, userId);

    const handoff = await db.teamWorkHandoff.findFirst({
      where: { id: handoffId, studio_id: studioId },
    });
    if (!handoff) throw new Error('Work handoff request not found');

    const isOwnerOrAdmin = ['OWNER', 'ADMIN'].includes(member.role);
    if (handoff.to_member_id !== member.id && !isOwnerOrAdmin) {
      throw new Error('Unauthorized to decline this handoff');
    }

    const updated = await db.teamWorkHandoff.update({
      where: { id: handoffId },
      data: {
        status: WorkHandoffStatus.DECLINED,
      },
    });

    await db.studioTeamActivity.create({
      data: {
        studio_id: studioId,
        member_id: member.id,
        user_id: userId,
        activity_type: 'HANDOFF_DECLINED',
        title: `Work handoff declined: ${reason || 'No reason specified'}`,
        metadata: { handoff_id: handoff.id },
      },
    });

    return this.getHandoff(studioId, userId, updated.id);
  }

  async getHandoff(studioId: string, userId: string, handoffId: string): Promise<ITeamHandoffDTO> {
    const db = this.getDb();
    await this.resolveMember(studioId, userId);

    const h = await db.teamWorkHandoff.findFirst({
      where: { id: handoffId, studio_id: studioId },
    });
    if (!h) throw new Error('Handoff not found');

    const [fromM, toM] = await Promise.all([
      db.studioMembership.findUnique({ where: { id: h.from_member_id }, include: { user: true } }),
      db.studioMembership.findUnique({ where: { id: h.to_member_id }, include: { user: true } }),
    ]);

    return {
      id: h.id,
      studio_id: h.studio_id,
      from_member_id: h.from_member_id,
      from_member_name: fromM?.user?.name || 'Member',
      to_member_id: h.to_member_id,
      to_member_name: toM?.user?.name || 'Member',
      project_id: h.project_id,
      task_id: h.task_id,
      production_id: h.production_id,
      client_id: h.client_id,
      reason: h.reason,
      summary: h.summary,
      status: h.status as WorkHandoffStatus,
      created_at: h.created_at,
      accepted_at: h.accepted_at,
      completed_at: h.completed_at,
    };
  }

  // -------------------------------------------------------------
  // 6. WORK BLOCKERS
  // -------------------------------------------------------------

  async createBlocker(
    studioId: string,
    userId: string,
    dto: ICreateBlockerDTO
  ): Promise<ITeamBlockerDTO> {
    const db = this.getDb();
    const member = await this.resolveMember(studioId, userId);

    const cleanTitle = StudioTeamCollaborationService.sanitizeContent(dto.title);
    const cleanDesc = StudioTeamCollaborationService.sanitizeContent(dto.description);

    const blocker = await db.teamWorkBlocker.create({
      data: {
        studio_id: studioId,
        reported_by_member_id: member.id,
        assigned_to_member_id: dto.assigned_to_member_id || null,
        project_id: dto.project_id || null,
        task_id: dto.task_id || null,
        production_id: dto.production_id || null,
        title: cleanTitle,
        description: cleanDesc,
        severity: dto.severity || WorkBlockerSeverity.MEDIUM,
        status: WorkBlockerStatus.OPEN,
        created_at: new Date(),
      },
    });

    // Create activity
    await db.studioTeamActivity.create({
      data: {
        studio_id: studioId,
        member_id: member.id,
        user_id: userId,
        activity_type: 'BLOCKER_CREATED',
        title: `[${blocker.severity}] Blocker reported: ${cleanTitle}`,
        description: cleanDesc.substring(0, 120),
        metadata: { blocker_id: blocker.id, severity: blocker.severity },
      },
    });

    return {
      id: blocker.id,
      studio_id: blocker.studio_id,
      reported_by_member_id: blocker.reported_by_member_id,
      reporter_name: member.user?.name || 'Member',
      assigned_to_member_id: blocker.assigned_to_member_id,
      project_id: blocker.project_id,
      task_id: blocker.task_id,
      production_id: blocker.production_id,
      title: blocker.title,
      description: blocker.description,
      severity: blocker.severity as WorkBlockerSeverity,
      status: blocker.status as WorkBlockerStatus,
      created_at: blocker.created_at,
    };
  }

  async listBlockers(
    studioId: string,
    userId: string,
    filters: {
      status?: WorkBlockerStatus;
      severity?: WorkBlockerSeverity;
      assigned_to?: string;
      project_id?: string;
      limit?: number;
    } = {}
  ): Promise<ITeamBlockerDTO[]> {
    const db = this.getDb();
    await this.resolveMember(studioId, userId);

    const where: any = { studio_id: studioId };
    if (filters.status) where.status = filters.status;
    if (filters.severity) where.severity = filters.severity;
    if (filters.assigned_to) where.assigned_to_member_id = filters.assigned_to;
    if (filters.project_id) where.project_id = filters.project_id;

    const blockers = await db.teamWorkBlocker.findMany({
      where,
      orderBy: [{ severity: 'desc' }, { created_at: 'desc' }],
      take: filters.limit || 50,
    });

    return Promise.all(
      blockers.map(async (b: any) => {
        const [reporter, assignee] = await Promise.all([
          db.studioMembership.findUnique({ where: { id: b.reported_by_member_id }, include: { user: true } }),
          b.assigned_to_member_id
            ? db.studioMembership.findUnique({ where: { id: b.assigned_to_member_id }, include: { user: true } })
            : null,
        ]);

        return {
          id: b.id,
          studio_id: b.studio_id,
          reported_by_member_id: b.reported_by_member_id,
          reporter_name: reporter?.user?.name || 'Member',
          assigned_to_member_id: b.assigned_to_member_id,
          assignee_name: assignee?.user?.name || null,
          project_id: b.project_id,
          task_id: b.task_id,
          production_id: b.production_id,
          title: b.title,
          description: b.description,
          severity: b.severity as WorkBlockerSeverity,
          status: b.status as WorkBlockerStatus,
          created_at: b.created_at,
          resolved_at: b.resolved_at,
          resolved_by_member_id: b.resolved_by_member_id,
        };
      })
    );
  }

  async resolveBlocker(studioId: string, userId: string, blockerId: string, resolutionNotes?: string): Promise<ITeamBlockerDTO> {
    const db = this.getDb();
    const member = await this.resolveMember(studioId, userId);

    const blocker = await db.teamWorkBlocker.findFirst({
      where: { id: blockerId, studio_id: studioId },
    });
    if (!blocker) throw new Error('Blocker not found');

    const cleanNotes = resolutionNotes ? StudioTeamCollaborationService.sanitizeContent(resolutionNotes) : undefined;

    const updated = await db.teamWorkBlocker.update({
      where: { id: blockerId },
      data: {
        status: WorkBlockerStatus.RESOLVED,
        resolved_at: new Date(),
        resolved_by_member_id: member.id,
        ...(cleanNotes ? { resolution_notes: cleanNotes } : {}),
      },
    });

    // Log Activity
    await db.studioTeamActivity.create({
      data: {
        studio_id: studioId,
        member_id: member.id,
        user_id: userId,
        activity_type: 'BLOCKER_RESOLVED',
        title: `Blocker resolved: ${blocker.title}`,
        description: cleanNotes ? cleanNotes.substring(0, 120) : undefined,
        metadata: { blocker_id: blocker.id },
      },
    });

    return {
      id: updated.id,
      studio_id: updated.studio_id,
      reported_by_member_id: updated.reported_by_member_id,
      reporter_name: member.user?.name || 'Member',
      assigned_to_member_id: updated.assigned_to_member_id,
      project_id: updated.project_id,
      task_id: updated.task_id,
      production_id: updated.production_id,
      title: updated.title,
      description: updated.description,
      severity: updated.severity as WorkBlockerSeverity,
      status: updated.status as WorkBlockerStatus,
      created_at: updated.created_at,
      resolved_at: updated.resolved_at,
      resolved_by_member_id: updated.resolved_by_member_id,
      resolved_by_name: member.user?.name || 'Member',
      resolution_notes: cleanNotes || (updated as any).resolution_notes,
    };
  }

  // -------------------------------------------------------------
  // 7. HELP REQUESTS
  // -------------------------------------------------------------

  async createHelpRequest(
    studioId: string,
    userId: string,
    dto: ICreateHelpRequestDTO
  ): Promise<ITeamHelpRequestDTO> {
    const db = this.getDb();
    const member = await this.resolveMember(studioId, userId);

    const cleanTitle = StudioTeamCollaborationService.sanitizeContent(dto.title);
    const cleanDesc = StudioTeamCollaborationService.sanitizeContent(dto.description);

    const req = await db.teamHelpRequest.create({
      data: {
        studio_id: studioId,
        requester_member_id: member.id,
        assigned_member_id: dto.assigned_member_id || null,
        project_id: dto.project_id || null,
        task_id: dto.task_id || null,
        category: dto.category || HelpRequestCategory.OTHER,
        title: cleanTitle,
        description: cleanDesc,
        priority: dto.priority || HelpRequestPriority.MEDIUM,
        status: dto.assigned_member_id ? HelpRequestStatus.ASSIGNED : HelpRequestStatus.OPEN,
        created_at: new Date(),
      },
    });

    await db.studioTeamActivity.create({
      data: {
        studio_id: studioId,
        member_id: member.id,
        user_id: userId,
        activity_type: 'HELP_REQUESTED',
        title: `Help requested: [${req.category}] ${cleanTitle}`,
        description: cleanDesc.substring(0, 120),
        metadata: { help_request_id: req.id, priority: req.priority },
      },
    });

    return {
      id: req.id,
      studio_id: req.studio_id,
      requester_member_id: req.requester_member_id,
      requester_name: member.user?.name || 'Member',
      assigned_member_id: req.assigned_member_id,
      project_id: req.project_id,
      task_id: req.task_id,
      category: req.category as HelpRequestCategory,
      title: req.title,
      description: req.description,
      priority: req.priority as HelpRequestPriority,
      status: req.status as HelpRequestStatus,
      created_at: req.created_at,
    };
  }

  async listHelpRequests(
    studioId: string,
    userId: string,
    filters: {
      status?: HelpRequestStatus;
      priority?: HelpRequestPriority;
      category?: HelpRequestCategory;
      assigned_to?: string;
      limit?: number;
    } = {}
  ): Promise<ITeamHelpRequestDTO[]> {
    const db = this.getDb();
    await this.resolveMember(studioId, userId);

    const where: any = { studio_id: studioId };
    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.category) where.category = filters.category;
    if (filters.assigned_to) where.assigned_member_id = filters.assigned_to;

    const requests = await db.teamHelpRequest.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { created_at: 'desc' }],
      take: filters.limit || 50,
    });

    return Promise.all(
      requests.map(async (r: any) => {
        const [reqM, assignM] = await Promise.all([
          db.studioMembership.findUnique({ where: { id: r.requester_member_id }, include: { user: true } }),
          r.assigned_member_id
            ? db.studioMembership.findUnique({ where: { id: r.assigned_member_id }, include: { user: true } })
            : null,
        ]);

        return {
          id: r.id,
          studio_id: r.studio_id,
          requester_member_id: r.requester_member_id,
          requester_name: reqM?.user?.name || 'Member',
          assigned_member_id: r.assigned_member_id,
          assignee_name: assignM?.user?.name || null,
          project_id: r.project_id,
          task_id: r.task_id,
          category: r.category as HelpRequestCategory,
          title: r.title,
          description: r.description,
          priority: r.priority as HelpRequestPriority,
          status: r.status as HelpRequestStatus,
          created_at: r.created_at,
          resolved_at: r.resolved_at,
        };
      })
    );
  }

  async resolveHelpRequest(
    studioId: string,
    userId: string,
    requestId: string
  ): Promise<ITeamHelpRequestDTO> {
    const db = this.getDb();
    const member = await this.resolveMember(studioId, userId);

    const req = await db.teamHelpRequest.findFirst({
      where: { id: requestId, studio_id: studioId },
    });
    if (!req) throw new Error('Help request not found');

    const updated = await db.teamHelpRequest.update({
      where: { id: requestId },
      data: {
        status: HelpRequestStatus.RESOLVED,
        resolved_at: new Date(),
      },
    });

    await db.studioTeamActivity.create({
      data: {
        studio_id: studioId,
        member_id: member.id,
        user_id: userId,
        activity_type: 'HELP_RESOLVED',
        title: `Help request resolved: ${req.title}`,
        metadata: { help_request_id: req.id },
      },
    });

    return {
      id: updated.id,
      studio_id: updated.studio_id,
      requester_member_id: updated.requester_member_id,
      requester_name: member.user?.name || 'Member',
      assigned_member_id: updated.assigned_member_id,
      project_id: updated.project_id,
      task_id: updated.task_id,
      category: updated.category as HelpRequestCategory,
      title: updated.title,
      description: updated.description,
      priority: updated.priority as HelpRequestPriority,
      status: updated.status as HelpRequestStatus,
      created_at: updated.created_at,
      resolved_at: updated.resolved_at,
    };
  }

  // -------------------------------------------------------------
  // 8. TEAM ATTENTION CENTER
  // -------------------------------------------------------------

  async getTeamAttention(studioId: string, userId: string): Promise<ITeamAttentionDTO> {
    return this.getAttentionCenter(studioId, userId);
  }

  async getAttentionCenter(studioId: string, userId: string): Promise<ITeamAttentionDTO> {
    const db = this.getDb();
    const member = await this.resolveMember(studioId, userId);

    // 1. Unread mentions
    const unreadMentions = await db.teamMessageMention.findMany({
      where: {
        studio_id: studioId,
        mentioned_member_id: member.id,
        read_at: null,
      },
      include: {
        message: {
          include: {
            thread: true,
          },
        },
      },
      take: 20,
    });

    // 2. Pending handoffs targeted to this member
    const pendingHandoffs = await db.teamWorkHandoff.findMany({
      where: {
        studio_id: studioId,
        to_member_id: member.id,
        status: WorkHandoffStatus.REQUESTED,
      },
      take: 20,
    });

    // 3. Open blockers assigned or critical in studio
    const openBlockers = await db.teamWorkBlocker.findMany({
      where: {
        studio_id: studioId,
        status: { in: [WorkBlockerStatus.OPEN, WorkBlockerStatus.ACKNOWLEDGED, WorkBlockerStatus.IN_PROGRESS] },
        OR: [{ assigned_to_member_id: member.id }, { severity: WorkBlockerSeverity.CRITICAL }],
      },
      take: 20,
    });

    // 4. Open help requests assigned to member
    const openHelp = await db.teamHelpRequest.findMany({
      where: {
        studio_id: studioId,
        assigned_member_id: member.id,
        status: { in: [HelpRequestStatus.OPEN, HelpRequestStatus.ASSIGNED, HelpRequestStatus.IN_PROGRESS] },
      },
      take: 20,
    });

    // Aggregate into prioritized list
    const items: ITeamAttentionItemDTO[] = [];

    // Mentions
    for (const m of unreadMentions) {
      items.push({
        id: `att-mention-${m.id}`,
        item_type: 'MENTION',
        priority: 'HIGH',
        title: 'You were mentioned in a conversation',
        summary: m.message?.body ? m.message.body.substring(0, 100) : 'Mention in collaboration thread',
        reference_id: m.id,
        thread_id: m.message?.thread_id,
        created_at: m.created_at,
        action_url: `/dashboard/team/threads/${m.message?.thread_id}`,
      });
    }

    // Handoffs
    for (const h of pendingHandoffs) {
      items.push({
        id: `att-handoff-${h.id}`,
        item_type: 'HANDOFF',
        priority: 'HIGH',
        title: 'Pending Work Handoff Request',
        summary: h.summary || h.reason,
        reference_id: h.id,
        project_id: h.project_id,
        created_at: h.created_at,
        action_url: `/dashboard/team/collaboration?tab=handoffs&id=${h.id}`,
      });
    }

    // Blockers
    for (const b of openBlockers) {
      items.push({
        id: `att-blocker-${b.id}`,
        item_type: 'BLOCKER',
        priority: b.severity === WorkBlockerSeverity.CRITICAL ? 'CRITICAL' : 'HIGH',
        title: `[${b.severity}] Blocker: ${b.title}`,
        summary: b.description.substring(0, 100),
        reference_id: b.id,
        project_id: b.project_id,
        created_at: b.created_at,
        action_url: `/dashboard/team/collaboration?tab=blockers&id=${b.id}`,
      });
    }

    // Help requests
    for (const hr of openHelp) {
      items.push({
        id: `att-help-${hr.id}`,
        item_type: 'HELP_REQUEST',
        priority: hr.priority === HelpRequestPriority.URGENT ? 'CRITICAL' : 'NORMAL',
        title: `Help Request: ${hr.title}`,
        summary: hr.description.substring(0, 100),
        reference_id: hr.id,
        project_id: hr.project_id,
        created_at: hr.created_at,
        action_url: `/dashboard/team/collaboration?tab=help&id=${hr.id}`,
      });
    }

    // Sort items by priority rank then date
    const rankMap: Record<string, number> = { CRITICAL: 4, HIGH: 3, NORMAL: 2, LOW: 1 };
    items.sort((a, b) => {
      const pDiff = (rankMap[b.priority] || 0) - (rankMap[a.priority] || 0);
      if (pDiff !== 0) return pDiff;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    const criticalCount = items.filter((i) => i.priority === 'CRITICAL').length;
    const highCount = items.filter((i) => i.priority === 'HIGH').length;
    const normalCount = items.filter((i) => i.priority === 'NORMAL').length;

    return {
      studio_id: studioId,
      member_id: member.id,
      total_attention_count: items.length,
      critical_count: criticalCount,
      high_count: highCount,
      normal_count: normalCount,
      items,
      mentions_count: unreadMentions.length,
      pending_handoffs_count: pendingHandoffs.length,
      open_blockers_count: openBlockers.length,
      open_help_requests_count: openHelp.length,
      unread_threads_count: 0,
      pending_handoffs: pendingHandoffs,
      open_blockers: openBlockers,
      unread_mentions: unreadMentions,
      urgent_help_requests: openHelp,
    };
  }

  // -------------------------------------------------------------
  // 9. COLLABORATION SEARCH
  // -------------------------------------------------------------

  async searchCollaboration(
    studioId: string,
    userId: string,
    filters: ICollaborationSearchFilterDTO
  ): Promise<ICollaborationSearchResultDTO> {
    const db = this.getDb();
    await this.resolveMember(studioId, userId);

    const limit = Math.min(Math.max(filters.limit || 20, 1), 50);
    const query = filters.query ? filters.query.trim() : '';

    const threadWhere: any = { studio_id: studioId };
    const msgWhere: any = { studio_id: studioId, deleted_at: null };
    const blockerWhere: any = { studio_id: studioId };
    const handoffWhere: any = { studio_id: studioId };
    const helpWhere: any = { studio_id: studioId };

    if (query) {
      threadWhere.title = { contains: query, mode: 'insensitive' };
      msgWhere.body = { contains: query, mode: 'insensitive' };
      blockerWhere.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ];
      handoffWhere.OR = [
        { summary: { contains: query, mode: 'insensitive' } },
        { reason: { contains: query, mode: 'insensitive' } },
      ];
      helpWhere.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ];
    }

    if (filters.project_id) {
      threadWhere.project_id = filters.project_id;
      blockerWhere.project_id = filters.project_id;
      handoffWhere.project_id = filters.project_id;
      helpWhere.project_id = filters.project_id;
    }

    const [threads, messages, blockers, handoffs, helpRequests] = await Promise.all([
      db.teamCollaborationThread.findMany({ where: threadWhere, take: limit, orderBy: { created_at: 'desc' } }),
      db.teamCollaborationMessage.findMany({ where: msgWhere, take: limit, orderBy: { created_at: 'desc' } }),
      db.teamWorkBlocker.findMany({ where: blockerWhere, take: limit, orderBy: { created_at: 'desc' } }),
      db.teamWorkHandoff.findMany({ where: handoffWhere, take: limit, orderBy: { created_at: 'desc' } }),
      db.teamHelpRequest.findMany({ where: helpWhere, take: limit, orderBy: { created_at: 'desc' } }),
    ]);

    const total = threads.length + messages.length + blockers.length + handoffs.length + helpRequests.length;

    return {
      threads: threads.map((t: any) => ({
        id: t.id,
        studio_id: t.studio_id,
        project_id: t.project_id,
        task_id: t.task_id,
        client_id: t.client_id,
        title: t.title,
        thread_type: t.thread_type,
        created_by_member_id: t.created_by_member_id,
        status: t.status,
        created_at: t.created_at,
        updated_at: t.updated_at,
        last_activity_at: t.last_activity_at,
      })),
      messages: messages.map((m: any) => ({
        id: m.id,
        thread_id: m.thread_id,
        studio_id: m.studio_id,
        author_member_id: m.author_member_id,
        body: m.body,
        message_type: m.message_type,
        created_at: m.created_at,
      })),
      blockers: blockers.map((b: any) => ({
        id: b.id,
        studio_id: b.studio_id,
        reported_by_member_id: b.reported_by_member_id,
        assigned_to_member_id: b.assigned_to_member_id,
        title: b.title,
        description: b.description,
        severity: b.severity,
        status: b.status,
        created_at: b.created_at,
      })),
      handoffs: handoffs.map((h: any) => ({
        id: h.id,
        studio_id: h.studio_id,
        from_member_id: h.from_member_id,
        to_member_id: h.to_member_id,
        reason: h.reason,
        summary: h.summary,
        status: h.status,
        created_at: h.created_at,
      })),
      help_requests: helpRequests.map((hr: any) => ({
        id: hr.id,
        studio_id: hr.studio_id,
        requester_member_id: hr.requester_member_id,
        assigned_member_id: hr.assigned_member_id,
        title: hr.title,
        description: hr.description,
        category: hr.category,
        priority: hr.priority,
        status: hr.status,
        created_at: hr.created_at,
      })),
      total_results: total,
      page: filters.page || 1,
      limit,
      has_more: total >= limit,
    };
  }

  // -------------------------------------------------------------
  // 10. ATTACHMENTS & DOWNLOADS
  // -------------------------------------------------------------

  async getAttachmentDownloadUrl(
    studioId: string,
    userId: string,
    attachmentId: string
  ): Promise<{ download_url: string; original_filename: string; mime_type: string; size_bytes: number }> {
    const db = this.getDb();
    await this.resolveMember(studioId, userId);

    const att = await db.teamCollaborationAttachment.findFirst({
      where: { id: attachmentId, studio_id: studioId },
    });
    if (!att) throw new Error('Attachment not found');

    const downloadUrl = `https://storage.pixmatch.internal/studio/${studioId}/collaboration/${att.storage_key}?sig=${Date.now()}`;

    return {
      download_url: downloadUrl,
      original_filename: att.original_filename,
      mime_type: att.mime_type,
      size_bytes: att.size_bytes,
    };
  }
}
