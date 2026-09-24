/**
 * Client Attachment Service — PixMatch AI Phase 28
 * Validates, registers, and manages communication attachments with strict MIME and size controls.
 */

import { prisma } from '@pixmatch/database';
import {
  AttachmentStatus,
  IClientMessageAttachment,
} from '@pixmatch/types';

export const ALLOWED_ATTACHMENT_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const;

export const MAX_ATTACHMENT_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export interface IAttachmentValidationInput {
  file_name: string;
  file_size: number;
  mime_type: string;
  storage_key?: string;
  width?: number;
  height?: number;
}

export class ClientAttachmentService {
  /**
   * Validates attachment metadata against security constraints.
   */
  public static validateAttachment(input: IAttachmentValidationInput): {
    isValid: boolean;
    error?: string;
    sanitizedFileName: string;
    isImage: boolean;
  } {
    // 1. File name safety check (no null bytes, no directory traversal)
    if (!input.file_name || typeof input.file_name !== 'string') {
      return { isValid: false, error: 'File name is required.', sanitizedFileName: '', isImage: false };
    }

    if (input.file_name.includes('\0') || input.file_name.includes('..') || input.file_name.includes('/') || input.file_name.includes('\\')) {
      return { isValid: false, error: 'Invalid or insecure file name format.', sanitizedFileName: '', isImage: false };
    }

    const sanitizedFileName = input.file_name.trim().replace(/[^\w\.\-\s]/gi, '_');
    if (sanitizedFileName.length === 0 || sanitizedFileName.length > 255) {
      return { isValid: false, error: 'File name length must be between 1 and 255 characters.', sanitizedFileName: '', isImage: false };
    }

    // 2. File size check
    if (!input.file_size || typeof input.file_size !== 'number' || input.file_size <= 0) {
      return { isValid: false, error: 'File size must be greater than 0 bytes.', sanitizedFileName: '', isImage: false };
    }

    if (input.file_size > MAX_ATTACHMENT_SIZE_BYTES) {
      return { isValid: false, error: `File size exceeds maximum allowed size of 25MB (${input.file_size} bytes).`, sanitizedFileName: '', isImage: false };
    }

    // 3. MIME type check
    const normalizedMime = (input.mime_type || '').toLowerCase().trim();
    if (!ALLOWED_ATTACHMENT_MIME_TYPES.includes(normalizedMime as any)) {
      return { isValid: false, error: `MIME type '${normalizedMime}' is not permitted.`, sanitizedFileName: '', isImage: false };
    }

    const isImage = normalizedMime.startsWith('image/');

    return {
      isValid: true,
      sanitizedFileName,
      isImage,
    };
  }

  /**
   * Creates attachment records for a message.
   */
  public static async attachFilesToMessage(
    studioId: string,
    messageId: string,
    attachments: IAttachmentValidationInput[]
  ): Promise<IClientMessageAttachment[]> {
    if (!attachments || attachments.length === 0) return [];

    const created: IClientMessageAttachment[] = [];

    for (const item of attachments) {
      const validation = this.validateAttachment(item);
      if (!validation.isValid) {
        throw new Error(`Attachment validation failed: ${validation.error}`);
      }

      const storageKey = item.storage_key || `studios/${studioId}/communications/attachments/${messageId}_${Date.now()}_${validation.sanitizedFileName}`;

      const rec = await prisma.clientMessageAttachment.create({
        data: {
          studio_id: studioId,
          message_id: messageId,
          storage_key: storageKey,
          file_name: validation.sanitizedFileName,
          file_size: item.file_size,
          mime_type: item.mime_type.toLowerCase().trim(),
          status: AttachmentStatus.READY,
          is_image: validation.isImage,
          width: item.width || null,
          height: item.height || null,
        },
      });

      created.push(rec as unknown as IClientMessageAttachment);
    }

    return created;
  }

  /**
   * Generates a secure download URL or storage path for an attachment.
   */
  public static async getAttachmentDownloadUrl(
    studioId: string,
    attachmentId: string
  ): Promise<{ download_url: string; attachment: IClientMessageAttachment }> {
    const attachment = await prisma.clientMessageAttachment.findFirst({
      where: { id: attachmentId, studio_id: studioId },
      include: {
        message: {
          select: {
            is_internal_note: true,
            conversation_id: true,
          },
        },
      },
    });

    if (!attachment || attachment.status === AttachmentStatus.DELETED) {
      throw new Error('Attachment not found or has been deleted.');
    }

    // Direct proxy / presigned URL abstraction
    const downloadUrl = `/api/v1/communication/attachments/${attachment.id}/download`;

    return {
      download_url: downloadUrl,
      attachment: attachment as unknown as IClientMessageAttachment,
    };
  }

  /**
   * Soft deletes or marks an attachment as deleted.
   */
  public static async deleteAttachment(
    studioId: string,
    attachmentId: string
  ): Promise<{ success: boolean }> {
    const attachment = await prisma.clientMessageAttachment.findFirst({
      where: { id: attachmentId, studio_id: studioId },
    });

    if (!attachment) {
      throw new Error('Attachment not found.');
    }

    await prisma.clientMessageAttachment.update({
      where: { id: attachmentId },
      data: { status: AttachmentStatus.DELETED },
    });

    return { success: true };
  }
}
