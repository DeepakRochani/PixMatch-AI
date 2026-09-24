/**
 * Fulfillment Physical Delivery Service — PixMatch AI Phase 26
 * Handles internal physical production tracking, shipping details, courier metadata, and delivery states.
 */

import { prisma } from '@pixmatch/database';
import {
  FulfillmentDeliveryStatus,
  FulfillmentOrderStatus,
  FulfillmentDeliveryType,
  FulfillmentAuditAction,
  FulfillmentDeliveryDTO,
  CreatePhysicalDeliveryDTO,
  UpdatePhysicalDeliveryDTO,
} from '@pixmatch/types';
import { NotificationService } from '../notifications/notification.service.js';

export class FulfillmentPhysicalService {
  /**
   * Creates a physical delivery record tracking shipment of physical prints/products.
   */
  public static async createPhysicalDelivery(
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
        items: true,
        shipping_address: true,
        client: true,
      },
    });

    if (!order) {
      throw new Error(`Order '${orderId}' not found.`);
    }

    const recipientName = dto.recipient_name || order.shipping_address?.full_name || order.client?.name || 'Customer';
    const recipientEmail = dto.recipient_email || order.client?.email || null;
    const recipientPhone = dto.recipient_phone || order.shipping_address?.phone || null;
    const courier = dto.courier || dto.courier_name;
    const trackingNumber = dto.tracking_number?.trim() || null;
    const trackingUrl = dto.tracking_url?.trim() || null;
    const status = dto.delivery_status || dto.status || FulfillmentDeliveryStatus.PENDING;

    const delivery = await prisma.$transaction(async (tx) => {
      const created = await tx.fulfillmentDelivery.create({
        data: {
          studio_id: studioId,
          order_id: order.id,
          delivery_type: dto.delivery_type || FulfillmentDeliveryType.PHYSICAL,
          status,
          courier_name: courier || null,
          tracking_number: trackingNumber,
          tracking_url: trackingUrl,
          courier: courier || null,
          shipped_at: dto.shipped_at ? new Date(dto.shipped_at) : new Date(),
          estimated_delivery_at: dto.estimated_delivery_at ? new Date(dto.estimated_delivery_at) : null,
          recipient_name: recipientName,
          recipient_email: recipientEmail,
          recipient_phone: recipientPhone,
          notes: dto.notes?.trim() || null,
          items: dto.item_ids && dto.item_ids.length > 0 ? {
            create: dto.item_ids.map((itemId: string) => ({
              studio_id: studioId,
              order_item_id: itemId,
              quantity: 1,
            })),
          } : undefined,
        },
        include: {
          items: true,
        },
      });

      // Advance order status to IN_PRODUCTION if currently PAID
      if (order.status === FulfillmentOrderStatus.PAID) {
        await tx.fulfillmentOrder.update({
          where: { id: order.id },
          data: { status: FulfillmentOrderStatus.IN_PRODUCTION },
        });

        await tx.fulfillmentStatusHistory.create({
          data: {
            studio_id: studioId,
            order_id: order.id,
            previous_status: order.status,
            new_status: FulfillmentOrderStatus.IN_PRODUCTION,
            reason: 'Physical production and delivery packaging started.',
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
          action: FulfillmentAuditAction.DELIVERY_CREATED,
          details: {
            delivery_id: created.id,
            courier,
            tracking_number: trackingNumber,
          },
        },
      });

      return created;
    });

    const res: any = { ...delivery };
    res.courier_name = res.courier_name || res.courier;
    return res;
  }

  /**
   * Retrieves a delivery by ID.
   */
  public static async getDelivery(
    deliveryId: string,
    studioId?: string
  ): Promise<any | null> {
    const where: any = { id: deliveryId };
    if (studioId) where.studio_id = studioId;
    const delivery = await prisma.fulfillmentDelivery.findFirst({
      where,
      include: {
        items: true,
        order: true,
      },
    });
    if (!delivery) return null;
    const res: any = { ...delivery };
    res.courier_name = res.courier_name || res.courier;
    return res;
  }

  /**
   * Updates shipping status, tracking details, and marks physical delivery completed.
   */
  public static async updateDeliveryStatus(
    arg1: string,
    arg2: string,
    arg3?: any,
    arg4?: any
  ): Promise<any> {
    const isFirstDeliveryId = typeof arg1 === 'string' && (arg1.startsWith('del_') || !arg2.startsWith('del_'));
    const deliveryId = isFirstDeliveryId ? arg1 : arg2;
    const studioId = isFirstDeliveryId ? arg2 : arg1;
    const userId = typeof arg3 === 'string' ? arg3 : undefined;
    const statusOrDto: any = typeof arg3 === 'string' ? arg4 : arg3;

    const newStatus = typeof statusOrDto === 'string' ? statusOrDto : statusOrDto?.status;

    const delivery = await prisma.fulfillmentDelivery.findFirst({
      where: { id: deliveryId },
      include: {
        order: {
          include: { client: true },
        },
      },
    });

    if (!delivery) {
      throw new Error(`Delivery '${deliveryId}' not found.`);
    }

    const currentStatus = delivery.status;
    if (newStatus && newStatus !== currentStatus) {
      const validDeliveryTransitions: Record<string, string[]> = {
        [FulfillmentDeliveryStatus.PENDING]: [
          FulfillmentDeliveryStatus.PREPARING,
          FulfillmentDeliveryStatus.READY,
          'DISPATCHED',
          FulfillmentDeliveryStatus.IN_TRANSIT,
          'OUT_FOR_DELIVERY',
          FulfillmentDeliveryStatus.CANCELLED,
          FulfillmentDeliveryStatus.FAILED,
        ],
        [FulfillmentDeliveryStatus.PREPARING]: [
          FulfillmentDeliveryStatus.READY,
          'DISPATCHED',
          FulfillmentDeliveryStatus.IN_TRANSIT,
          'OUT_FOR_DELIVERY',
          FulfillmentDeliveryStatus.CANCELLED,
          FulfillmentDeliveryStatus.FAILED,
        ],
        ['DISPATCHED']: [
          FulfillmentDeliveryStatus.IN_TRANSIT,
          FulfillmentDeliveryStatus.READY,
          'OUT_FOR_DELIVERY',
          FulfillmentDeliveryStatus.DELIVERED,
          FulfillmentDeliveryStatus.CANCELLED,
          FulfillmentDeliveryStatus.FAILED,
        ],
        [FulfillmentDeliveryStatus.READY]: [
          FulfillmentDeliveryStatus.IN_TRANSIT,
          'OUT_FOR_DELIVERY',
          FulfillmentDeliveryStatus.DELIVERED,
          FulfillmentDeliveryStatus.CANCELLED,
          FulfillmentDeliveryStatus.FAILED,
        ],
        [FulfillmentDeliveryStatus.IN_TRANSIT]: [
          'OUT_FOR_DELIVERY',
          FulfillmentDeliveryStatus.DELIVERED,
          FulfillmentDeliveryStatus.CANCELLED,
          FulfillmentDeliveryStatus.FAILED,
        ],
        ['OUT_FOR_DELIVERY']: [
          FulfillmentDeliveryStatus.DELIVERED,
          FulfillmentDeliveryStatus.CANCELLED,
          FulfillmentDeliveryStatus.FAILED,
        ],
        [FulfillmentDeliveryStatus.DELIVERED]: [],
        [FulfillmentDeliveryStatus.CANCELLED]: [],
        [FulfillmentDeliveryStatus.FAILED]: [
          FulfillmentDeliveryStatus.PENDING,
          FulfillmentDeliveryStatus.PREPARING,
          FulfillmentDeliveryStatus.IN_TRANSIT,
        ],
      };

      const allowed = validDeliveryTransitions[currentStatus];
      if (allowed && !allowed.includes(newStatus)) {
        throw new Error(`Invalid delivery transition: Cannot transition from ${currentStatus} to ${newStatus}.`);
      }
    }

    const updateData: any = {
      status: newStatus || delivery.status,
    };

    if (newStatus === FulfillmentDeliveryStatus.DELIVERED || newStatus === 'DELIVERED') {
      updateData.delivered_at = new Date();
    }
    if (newStatus === FulfillmentDeliveryStatus.IN_TRANSIT || newStatus === FulfillmentDeliveryStatus.READY) {
      if (!delivery.shipped_at) updateData.shipped_at = new Date();
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.fulfillmentDelivery.update({
        where: { id: deliveryId },
        data: updateData,
        include: { items: true },
      });

      if (newStatus === FulfillmentDeliveryStatus.DELIVERED || newStatus === 'DELIVERED') {
        await tx.fulfillmentOrder.update({
          where: { id: delivery.order_id },
          data: {
            status: FulfillmentOrderStatus.DELIVERED,
            delivered_at: updateData.delivered_at,
          },
        });

        await tx.fulfillmentStatusHistory.create({
          data: {
            studio_id: studioId,
            order_id: delivery.order_id,
            previous_status: delivery.order?.status || null,
            new_status: FulfillmentOrderStatus.DELIVERED,
            reason: `Physical package delivered via ${delivery.courier || delivery.courier_name || 'courier'}.`,
            changed_by: userId || null,
          },
        });
      }

      await tx.fulfillmentAuditLog.create({
        data: {
          studio_id: studioId,
          order_id: delivery.order_id,
          actor_type: 'STUDIO',
          actor_id: userId || null,
          action: FulfillmentAuditAction.STATUS_CHANGED,
          details: {
            delivery_id: deliveryId,
            status: newStatus,
          },
        },
      });

      return result;
    });

    const res: any = { ...updated };
    res.courier_name = res.courier_name || res.courier;
    return res;
  }

  /**
   * Updates tracking details for a physical shipment.
   */
  public static async updateTracking(
    deliveryId: string,
    studioId: string,
    userId?: string,
    trackingData: any = {}
  ): Promise<any> {
    const delivery = await prisma.fulfillmentDelivery.findFirst({
      where: { id: deliveryId },
    });

    if (!delivery) {
      throw new Error(`Delivery '${deliveryId}' not found.`);
    }

    const updated = await prisma.fulfillmentDelivery.update({
      where: { id: deliveryId },
      data: {
        tracking_number: trackingData.tracking_number?.trim(),
        tracking_url: trackingData.tracking_url?.trim(),
        courier: trackingData.courier?.trim() || delivery.courier,
        courier_name: trackingData.courier_name?.trim() || trackingData.courier?.trim() || delivery.courier_name,
      },
    });

    const res: any = { ...updated };
    res.courier_name = res.courier_name || res.courier;
    return res;
  }

  /**
   * Alias for createPhysicalDelivery
   */
  public static async createDelivery(
    arg1: string,
    arg2: string,
    arg3: any,
    arg4?: any
  ): Promise<any> {
    return this.createPhysicalDelivery(arg1, arg2, arg3, arg4);
  }
}
