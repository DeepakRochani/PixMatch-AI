/**
 * Fulfillment Digital Delivery Service — PixMatch AI Phase 26
 * Manages digital download packages, short-lived signed URLs, download limits, and telemetry.
 */

import crypto from 'crypto';
import { prisma } from '@pixmatch/database';
import {
  FulfillmentOrderStatus,
  FulfillmentPaymentStatus,
  FulfillmentAuditAction,
  FulfillmentPackageDTO,
  CreateDigitalPackageDTO,
  ClientJourneyStage,
} from '@pixmatch/types';
import { NotificationService } from '../notifications/notification.service.js';

export class FulfillmentDigitalService {
  /**
   * Hashes a token or secret using SHA-256.
   */
  public static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token.trim()).digest('hex');
  }

  /**
   * Sanitizes a filename, preventing directory traversal attacks (../, ..\),
   * null bytes, control characters, unicode direction overrides, and restricts length.
   */
  public static sanitizeFilename(raw: string): string {
    if (!raw) return 'download.zip';
    // Remove directory traversal sequences: ../, ..\, /..\
    let safe = raw.replace(/\.\.[\/\\]+/g, '').replace(/[\/\\]+/g, '_');
    // Remove null bytes and control characters (ASCII 0-31 and 127)
    safe = safe.replace(/[\x00-\x1f\x7f]/g, '');
    // Remove dangerous Unicode characters / bidirection overrides
    safe = safe.replace(/[\u0000-\u001f\u007f-\u009f\u202e\u202d]/g, '');
    // Trim leading/trailing dots and spaces
    safe = safe.trim().replace(/^\.+|\.+$/g, '');
    // Truncate to 255 chars
    if (safe.length > 255) {
      const extIndex = safe.lastIndexOf('.');
      if (extIndex !== -1 && safe.length - extIndex <= 10) {
        const ext = safe.substring(extIndex);
        safe = safe.substring(0, 255 - ext.length) + ext;
      } else {
        safe = safe.substring(0, 255);
      }
    }
    return safe || 'download.zip';
  }

  /**
   * Generates a signed, short-lived URL with token authentication and expiration.
   */
  public static generateSignedUrl(
    storageKey: string,
    orderToken: string,
    expiresInSeconds: number = 86400
  ): string {
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const hmac = crypto.createHmac('sha256', process.env.JWT_SECRET || 'pixmatch-digital-signing-secret');
    hmac.update(`${storageKey}:${orderToken}:${expiresAt}`);
    const signature = hmac.digest('hex').substring(0, 32);

    return `/api/v1/public/fulfillment/${orderToken}/file?key=${encodeURIComponent(storageKey)}&exp=${expiresAt}&sig=${signature}`;
  }

  /**
   * Validates a signed URL signature and expiration.
   */
  public static verifySignedUrl(
    storageKey: string,
    orderToken: string,
    expiresAtStr: string,
    signature: string
  ): boolean {
    if (!signature || !expiresAtStr || !storageKey || !orderToken) {
      return false;
    }

    const expiresAt = parseInt(expiresAtStr, 10);
    if (isNaN(expiresAt) || Math.floor(Date.now() / 1000) > expiresAt) {
      return false;
    }

    const hmac = crypto.createHmac('sha256', process.env.JWT_SECRET || 'pixmatch-digital-signing-secret');
    hmac.update(`${storageKey}:${orderToken}:${expiresAt}`);
    const expectedSig = hmac.digest('hex').substring(0, 32);

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(sigBuf, expBuf);
  }

  /**
   * Creates a downloadable digital delivery package for an order.
   */
  public static async createDigitalPackage(
    arg1: string,
    arg2: string,
    arg3: any,
    arg4?: any
  ): Promise<any> {
    const isFirstOrderId = arg1.startsWith('ord_') || (!arg2.startsWith('ord_') && !arg1.startsWith('studio_'));
    const orderId = isFirstOrderId ? arg1 : arg2;
    const studioId = isFirstOrderId ? arg2 : arg1;
    const userId = isFirstOrderId ? arg3 : arg4;
    const dto: any = isFirstOrderId ? arg4 : arg3;

    const order = await prisma.fulfillmentOrder.findFirst({
      where: { id: orderId, studio_id: studioId },
      include: {
        items: {
          include: {
            photos: { include: { photo: true } },
          },
        },
        client: true,
      },
    });

    if (!order) {
      throw new Error(`Order '${orderId}' not found.`);
    }

    // Determine photos to bundle
    let photoIds: string[] = [];
    if (dto.photo_ids !== undefined) {
      if (!Array.isArray(dto.photo_ids) || dto.photo_ids.length === 0) {
        throw new Error('At least one photo is required to create a digital package.');
      }
      photoIds = Array.from(new Set(dto.photo_ids.filter(Boolean)));
    } else {
      for (const item of order.items) {
        for (const p of item.photos) {
          if (!photoIds.includes(p.photo_id)) {
            photoIds.push(p.photo_id);
          }
        }
      }
    }

    if (photoIds.length === 0) {
      throw new Error('At least one photo is required to create a digital package.');
    }

    const expiresInHours = dto.expires_in_hours || 720;
    const expiresAt = dto.expires_at ? new Date(dto.expires_at) : new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
    const downloadRawToken = crypto.randomBytes(24).toString('base64url');
    const downloadTokenHash = this.hashToken(downloadRawToken);
    const sanitizedPkgName = this.sanitizeFilename(dto.name || 'package').replace(/\.zip$/i, '');
    const storageKey = `studios/${studioId}/orders/${orderId}/packages/${sanitizedPkgName.replace(/\s+/g, '_')}.zip`;
    const signedUrl = this.generateSignedUrl(storageKey, order.token_hash || downloadRawToken, expiresInHours * 3600);

    const estimatedSizeBytes = BigInt((photoIds.length || 1) * 4.5 * 1024 * 1024);

    const pkg = await prisma.$transaction(async (tx) => {
      const createdPkg = await tx.fulfillmentPackage.create({
        data: {
          studio_id: studioId,
          order_id: order.id,
          name: (dto.name || 'Digital Delivery Package').trim(),
          format: 'ZIP',
          download_token_hash: downloadTokenHash,
          signed_url: signedUrl,
          storage_key: storageKey,
          file_size: estimatedSizeBytes,
          photo_count: photoIds.length,
          max_downloads: dto.max_downloads !== undefined ? dto.max_downloads : 10,
          download_count: 0,
          expires_at: expiresAt,
          is_ready: true,
          items: photoIds.length > 0 ? {
            create: photoIds.map((pid) => ({
              studio_id: studioId,
              photo_id: pid,
            })),
          } : undefined,
        },
        include: {
          items: { include: { photo: true } },
        },
      });

      // Update order status if currently in draft/paid
      if (order.status === FulfillmentOrderStatus.PAID || order.status === FulfillmentOrderStatus.IN_PRODUCTION) {
        await tx.fulfillmentOrder.update({
          where: { id: order.id },
          data: { status: FulfillmentOrderStatus.READY_FOR_DELIVERY },
        });

        await tx.fulfillmentStatusHistory.create({
          data: {
            studio_id: studioId,
            order_id: order.id,
            previous_status: order.status,
            new_status: FulfillmentOrderStatus.READY_FOR_DELIVERY,
            reason: 'Digital delivery package ready for client download.',
            changed_by: userId || null,
          },
        });
      }

      await tx.fulfillmentAuditLog.create({
        data: {
          studio_id: studioId,
          order_id: order.id,
          actor_type: 'STUDIO',
          actor_id: userId || null,
          action: FulfillmentAuditAction.PACKAGE_CREATED,
          details: {
            package_id: createdPkg.id,
            name: dto.name,
            photo_count: photoIds.length,
            expires_at: expiresAt,
          },
        },
      });

      return createdPkg;
    });

    // Notify client if available
    if (order.client?.email) {
      try {
        await NotificationService.dispatch({
          event: 'FULFILLMENT_DOWNLOAD_AVAILABLE',
          recipient: order.client.email,
          recipientName: order.client.name,
          studioId,
          clientId: order.client_id,
          variables: {
            orderNumber: order.order_number,
            packageName: dto.name,
            photoCount: photoIds.length,
            downloadUrl: `${process.env.APP_URL || 'http://localhost:3000'}/portal/order/${order.token_hash}`,
          },
        });
      } catch (err) {
        // Non-blocking notification
      }
    }

    return pkg;
  }

  /**
   * Retrieves a package by ID.
   */
  public static async getPackage(
    packageId: string,
    studioId?: string
  ): Promise<any | null> {
    const pkg = await prisma.fulfillmentPackage.findUnique({
      where: { id: packageId },
      include: {
        items: true,
        downloads: true,
        order: true,
      },
    });
    return pkg;
  }

  /**
   * Generates a signed download URL for a package with expiration and limit checks.
   */
  public static async generateSignedDownloadUrl(
    packageId: string,
    studioId?: string,
    expirySeconds: number = 86400
  ): Promise<{ download_url: string; expires_at: string; signature: string }> {
    const pkg = await prisma.fulfillmentPackage.findUnique({
      where: { id: packageId },
      include: { order: true },
    });

    if (!pkg) {
      throw new Error(`Package '${packageId}' not found.`);
    }

    if (pkg.expires_at && new Date() > new Date(pkg.expires_at)) {
      throw new Error('Digital package has expired.');
    }

    if (pkg.max_downloads !== null && pkg.max_downloads !== undefined && pkg.download_count >= pkg.max_downloads) {
      throw new Error('Maximum download limit reached for this package.');
    }

    const order = pkg.order || (await prisma.fulfillmentOrder.findUnique({ where: { id: pkg.order_id } }));
    if (order) {
      const isPaid = order.payment_status === FulfillmentPaymentStatus.PAID || (order as any).paid_amount_cents >= (order as any).total_price_cents;
      const hasTotal = ((order as any).total_price_cents ?? order.total_amount) > 0;
      if (!isPaid && hasTotal) {
        throw new Error('Payment is required before downloading files.');
      }
    }

    const expiresAt = Math.floor(Date.now() / 1000) + expirySeconds;
    const hmac = crypto.createHmac('sha256', process.env.JWT_SECRET || 'pixmatch-digital-signing-secret');
    hmac.update(`${pkg.id}:${expiresAt}`);
    const signature = hmac.digest('hex').substring(0, 32);

    const downloadUrl = `/api/v1/public/fulfillment/download/${pkg.id}?expires=${expiresAt}&sig=${signature}`;
    return {
      download_url: downloadUrl,
      expires_at: new Date(expiresAt * 1000).toISOString(),
      signature,
    };
  }

  /**
   * Records download telemetry and increments package download count.
   */
  public static async recordDownload(
    packageId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<any> {
    const ip = ipAddress || '127.0.0.1';
    const ipHash = crypto.createHash('sha256').update(ip).digest('hex');

    const pkg = await prisma.fulfillmentPackage.findUnique({
      where: { id: packageId },
    });

    if (!pkg) {
      throw new Error(`Package '${packageId}' not found.`);
    }

    await prisma.fulfillmentPackage.update({
      where: { id: packageId },
      data: {
        download_count: (pkg.download_count || 0) + 1,
      },
    });

    const downloadLog = await prisma.fulfillmentDownload.create({
      data: {
        package_id: packageId,
        order_id: pkg.order_id,
        studio_id: pkg.studio_id || 'studio_default',
        ip_hash: ipHash,
        ip_address: ip,
        user_agent: userAgent || 'Unknown User Agent',
        status: 'COMPLETED',
      },
    });

    return downloadLog;
  }

  /**
   * Authorizes and registers a download request from the public client delivery portal.
   */
  public static async authorizeAndLogDownload(
    orderRawToken: string,
    targetType: 'PACKAGE' | 'PHOTO',
    targetId: string,
    metadata: { ip_address?: string; user_agent?: string } = {}
  ): Promise<{ authorized: boolean; download_url: string; file_name: string }> {
    const tokenHash = this.hashToken(orderRawToken);

    const order = await prisma.fulfillmentOrder.findFirst({
      where: { token_hash: tokenHash },
      include: {
        packages: { where: { is_ready: true } },
        items: {
          include: {
            photos: { include: { photo: true } },
          },
        },
      },
    });

    if (!order) {
      throw new Error('Invalid order access token.');
    }

    if (order.payment_status !== FulfillmentPaymentStatus.PAID && order.total_amount > 0) {
      throw new Error('Cannot download files: Order is not yet fully paid.');
    }

    if (targetType === 'PACKAGE') {
      const pkg = order.packages.find((p) => p.id === targetId);
      if (!pkg) {
        throw new Error(`Digital package '${targetId}' not found in order.`);
      }

      if (pkg.expires_at && new Date() > new Date(pkg.expires_at)) {
        throw new Error('This download package has expired. Please request a new package.');
      }

      if (pkg.max_downloads && pkg.download_count >= pkg.max_downloads) {
        throw new Error('Download limit exceeded for this package.');
      }

      // Record download telemetry and increment count
      await prisma.$transaction(async (tx) => {
        await tx.fulfillmentPackage.update({
          where: { id: pkg.id },
          data: { download_count: { increment: 1 } },
        });

        await tx.fulfillmentDownload.create({
          data: {
            studio_id: order.studio_id,
            order_id: order.id,
            package_id: pkg.id,
            photo_id: null,
            ip_address: metadata.ip_address || null,
            user_agent: metadata.user_agent || null,
            status: 'COMPLETED',
          },
        });

        await tx.fulfillmentAuditLog.create({
          data: {
            studio_id: order.studio_id,
            order_id: order.id,
            actor_type: 'CLIENT',
            action: FulfillmentAuditAction.DOWNLOAD_COMPLETED,
            details: {
              package_id: pkg.id,
              package_name: pkg.name,
              download_count: pkg.download_count + 1,
            },
            ip_address: metadata.ip_address || null,
          },
        });
      });

      // Update ClientJourneyState
      if (order.client_id) {
        try {
          await prisma.clientJourneyState.updateMany({
            where: { client_id: order.client_id, studio_id: order.studio_id },
            data: { stage: ClientJourneyStage.DOWNLOADING, last_activity_at: new Date() },
          });
        } catch (e) {
          // Non-fatal
        }
      }

      return {
        authorized: true,
        download_url: pkg.signed_url || `/storage/downloads/${pkg.id}.zip`,
        file_name: this.sanitizeFilename(`${pkg.name.replace(/\s+/g, '_')}.zip`),
      };
    } else {
      // Single photo download
      let targetPhoto: any = null;
      for (const item of order.items) {
        const found = item.photos.find((p) => p.photo_id === targetId);
        if (found) {
          targetPhoto = found.photo;
          break;
        }
      }

      if (!targetPhoto) {
        throw new Error(`Photo '${targetId}' not authorized for download in this order.`);
      }

      await prisma.$transaction(async (tx) => {
        await tx.fulfillmentDownload.create({
          data: {
            studio_id: order.studio_id,
            order_id: order.id,
            package_id: null,
            photo_id: targetPhoto.id,
            ip_address: metadata.ip_address || null,
            user_agent: metadata.user_agent || null,
            status: 'COMPLETED',
          },
        });

        await tx.fulfillmentAuditLog.create({
          data: {
            studio_id: order.studio_id,
            order_id: order.id,
            actor_type: 'CLIENT',
            action: FulfillmentAuditAction.DOWNLOAD_COMPLETED,
            details: {
              photo_id: targetPhoto.id,
              file_name: targetPhoto.file_name,
            },
            ip_address: metadata.ip_address || null,
          },
        });
      });

      return {
        authorized: true,
        download_url: targetPhoto.original_url || targetPhoto.storage_path,
        file_name: targetPhoto.file_name || 'photo.jpg',
      };
    }
  }
}
