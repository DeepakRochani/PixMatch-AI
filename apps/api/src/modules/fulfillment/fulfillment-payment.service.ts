/**
 * Fulfillment Payment Service — PixMatch AI Phase 26
 * Handles payment recording, idempotency, Phase 18 StudioBusinessTransaction sync, and refunds.
 */

import { prisma } from '@pixmatch/database';
import {
  FulfillmentPaymentStatus,
  FulfillmentOrderStatus,
  FulfillmentAuditAction,
  BusinessTransactionType,
  BusinessTransactionStatus,
  FulfillmentPaymentDTO,
  FulfillmentOrderDTO,
  RecordFulfillmentPaymentDTO,
} from '@pixmatch/types';
import { NotificationService } from '../notifications/notification.service.js';

export class FulfillmentPaymentService {
  /**
   * Records a payment against an order, preventing duplicate entries via idempotency keys,
   * updating order paid totals, and synchronizing with StudioBusinessTransaction.
   */
  public static async recordPayment(
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

    const amount = dto.amount ?? (dto.amount_cents !== undefined ? dto.amount_cents : 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Payment amount must be greater than zero and a valid finite number.');
    }

    // 1. Fetch order ensuring studio ownership
    const order = await prisma.fulfillmentOrder.findFirst({
      where: { id: orderId, studio_id: studioId },
      include: {
        client: true,
        project: true,
        gallery: true,
        payments: true,
      },
    });

    if (!order) {
      throw new Error(`Order '${orderId}' not found.`);
    }

    if (order.status === FulfillmentOrderStatus.CANCELLED) {
      throw new Error('Cannot record payments on a cancelled order.');
    }

    if (dto.currency && order.currency && dto.currency.toUpperCase() !== order.currency.toUpperCase()) {
      throw new Error(`Currency mismatch: Order currency is ${order.currency}, received ${dto.currency}.`);
    }

    // 2. Check idempotency key if provided
    if (dto.idempotency_key && dto.idempotency_key.trim().length > 0) {
      const existingPayment = await prisma.fulfillmentPayment.findFirst({
        where: {
          studio_id: studioId,
          idempotency_key: dto.idempotency_key.trim(),
        },
      });

      if (existingPayment) {
        const pDto: any = { ...existingPayment };
        pDto.amount_cents = pDto.amount_cents ?? pDto.amount;
        pDto.payment = pDto;
        pDto.order = order;
        return pDto;
      }
    }

    const currency = (dto.currency || order.currency || 'USD').toUpperCase();
    const totalDue = (order as any).total_price_cents ?? order.total_amount ?? 0;

    // 3. Process payment and transaction in DB
    const result = await prisma.$transaction(async (tx) => {
      // Create Phase 18 StudioBusinessTransaction
      const transaction = await tx.studioBusinessTransaction.create({
        data: {
          studio_id: studioId,
          client_id: order.client_id || null,
          project_id: order.project_id || null,
          gallery_id: order.gallery_id || null,
          reference_id: order.id,
          transaction_type: 'INCOME',
          status: 'RECORDED',
          amount,
          amount_cents: amount,
          currency,
          transaction_date: new Date(),
          description: `Fulfillment Order Payment: ${order.order_number}`,
          reference: dto.reference || `ORD-PAY-${order.order_number}`,
          category: 'FULFILLMENT',
          source: dto.payment_method || 'STRIPE',
          notes: dto.notes || `Payment for order ${order.order_number}`,
          created_by: userId || null,
        },
      });

      // Create FulfillmentPayment record
      const payment = await tx.fulfillmentPayment.create({
        data: {
          studio_id: studioId,
          order_id: order.id,
          transaction_id: transaction.id,
          amount,
          amount_cents: amount,
          currency,
          payment_method: dto.payment_method || 'STRIPE',
          gateway_payment_id: dto.gateway_payment_id || null,
          gateway_transaction_id: dto.gateway_transaction_id || null,
          reference: dto.reference || transaction.reference,
          status: FulfillmentPaymentStatus.PAID,
          idempotency_key: dto.idempotency_key?.trim() || null,
          notes: dto.notes?.trim() || null,
          created_by: userId || null,
        },
      });

      // Sum all completed payments for this order
      const allPayments = await tx.fulfillmentPayment.findMany({
        where: { order_id: order.id, studio_id: studioId },
      });
      const newPaidTotal = allPayments.reduce((sum: number, p: any) => sum + (p.amount_cents ?? p.amount ?? 0), 0);
      const isFullyPaid = newPaidTotal >= totalDue;

      // Update Order Status
      const newPaymentStatus = isFullyPaid
        ? FulfillmentPaymentStatus.PAID
        : (newPaidTotal > 0 ? FulfillmentPaymentStatus.PARTIALLY_PAID : FulfillmentPaymentStatus.UNPAID);

      let newOrderStatus = order.status;
      if (isFullyPaid && (order.status === FulfillmentOrderStatus.DRAFT || order.status === FulfillmentOrderStatus.PENDING_PAYMENT)) {
        newOrderStatus = FulfillmentOrderStatus.PAID;
      }

      const updatedOrder = await tx.fulfillmentOrder.update({
        where: { id: order.id },
        data: {
          paid_amount: newPaidTotal,
          paid_amount_cents: newPaidTotal,
          payment_status: newPaymentStatus,
          status: newOrderStatus,
        },
        include: {
          items: true,
          payments: true,
          deliveries: true,
          packages: true,
          shipping_address: true,
        },
      });

      // Audit Log
      await tx.fulfillmentAuditLog.create({
        data: {
          studio_id: studioId,
          order_id: order.id,
          actor_type: 'STUDIO',
          actor_id: userId || null,
          action: FulfillmentAuditAction.PAYMENT_RECORDED,
          details: {
            payment_id: payment.id,
            amount,
            currency,
            transaction_id: transaction.id,
            new_paid_total: newPaidTotal,
            is_fully_paid: isFullyPaid,
          },
        },
      });

      if (newOrderStatus !== order.status) {
        await tx.fulfillmentStatusHistory.create({
          data: {
            studio_id: studioId,
            order_id: order.id,
            previous_status: order.status,
            new_status: newOrderStatus,
            reason: `Payment of ${currency} ${amount} recorded. Full balance received.`,
            changed_by: userId || null,
          },
        });
      }

      return { payment, updatedOrder };
    });

    // 4. Send email notification if client email exists
    if (order.client?.email) {
      try {
        await NotificationService.dispatch({
          event: 'FULFILLMENT_PAYMENT_RECEIVED',
          recipient: order.client.email,
          recipientName: order.client.name,
          studioId,
          clientId: order.client_id,
          variables: {
            orderNumber: order.order_number,
            amount,
            currency,
            balanceRemaining: Math.max(0, totalDue - newPaidTotal),
            isFullyPaid,
          },
        });
      } catch (err) {
        // Non-blocking notification dispatch
      }
    }

    const pRes: any = { ...result.payment };
    pRes.amount_cents = pRes.amount_cents ?? pRes.amount;
    pRes.payment = pRes;
    pRes.order = result.updatedOrder;
    return pRes;
  }

  /**
   * Lists all payments associated with an order.
   */
  public static async listPayments(
    orderId: string,
    studioId?: string
  ): Promise<any[]> {
    const where: any = { order_id: orderId };
    if (studioId) where.studio_id = studioId;
    const list = await prisma.fulfillmentPayment.findMany({
      where,
      orderBy: { created_at: 'asc' },
    });
    return list.map((p: any) => ({
      ...p,
      amount_cents: p.amount_cents ?? p.amount,
    }));
  }

  /**
   * Records a full or partial refund against an order.
   */
  public static async recordRefund(
    studioId: string,
    orderId: string,
    refundAmount: number,
    reason?: string,
    userId?: string
  ): Promise<FulfillmentOrderDTO> {
    const order = await prisma.fulfillmentOrder.findFirst({
      where: { id: orderId, studio_id: studioId },
      include: { payments: true },
    });

    if (!order) {
      throw new Error(`Order '${orderId}' not found.`);
    }

    const paidAmt = (order as any).paid_amount_cents ?? order.paid_amount ?? 0;
    if (refundAmount <= 0 || refundAmount > paidAmt) {
      throw new Error(`Invalid refund amount. Must be between 0 and ${paidAmt}.`);
    }

    const newPaidAmount = Math.max(0, paidAmt - refundAmount);

    const updated = await prisma.$transaction(async (tx) => {
      // Record refund transaction in Phase 18 StudioBusinessTransaction
      const refundTransaction = await tx.studioBusinessTransaction.create({
        data: {
          studio_id: studioId,
          client_id: order.client_id || null,
          project_id: order.project_id || null,
          gallery_id: order.gallery_id || null,
          reference_id: order.id,
          transaction_type: 'EXPENSE',
          status: 'RECORDED',
          amount: refundAmount,
          amount_cents: refundAmount,
          currency: order.currency,
          transaction_date: new Date(),
          description: `Refund for Fulfillment Order ${order.order_number}`,
          reference: `REFUND-${order.order_number}`,
          category: 'REFUND',
          source: 'MANUAL',
          notes: reason || 'Customer refund',
          created_by: userId || null,
        },
      });

      const updatedOrder = await tx.fulfillmentOrder.update({
        where: { id: order.id },
        data: {
          paid_amount: newPaidAmount,
          paid_amount_cents: newPaidAmount,
          payment_status: newPaidAmount === 0 ? FulfillmentPaymentStatus.REFUNDED : FulfillmentPaymentStatus.PARTIALLY_PAID,
          status: newPaidAmount === 0 ? FulfillmentOrderStatus.REFUNDED : order.status,
        },
        include: {
          items: true,
          payments: true,
          deliveries: true,
          packages: true,
        },
      });

      await tx.fulfillmentAuditLog.create({
        data: {
          studio_id: studioId,
          order_id: order.id,
          actor_type: 'STUDIO',
          actor_id: userId || null,
          action: FulfillmentAuditAction.REFUND_RECORDED,
          details: {
            refund_amount: refundAmount,
            refund_transaction_id: refundTransaction.id,
            reason,
          },
        },
      });

      return updatedOrder;
    });

    return updated as unknown as FulfillmentOrderDTO;
  }
}
