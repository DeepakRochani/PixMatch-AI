/**
 * Fulfillment Controller — PixMatch AI Phase 26
 * Handles HTTP requests for studio order management & public client delivery portal.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import {
  CreateFulfillmentProductDTO,
  UpdateFulfillmentProductDTO,
  CreateProductVariantDTO,
  CreateFulfillmentOrderFromProofingDTO,
  CreateManualFulfillmentOrderDTO,
  AddOrderItemDTO,
  UpdateOrderItemDTO,
  RecordFulfillmentPaymentDTO,
  CreateDigitalPackageDTO,
  CreatePhysicalDeliveryDTO,
  UpdatePhysicalDeliveryDTO,
  FulfillmentOrderStatus,
} from '@pixmatch/types';
import { FulfillmentProductService } from './fulfillment-product.service.js';
import { FulfillmentOrderService } from './fulfillment-order.service.js';
import { FulfillmentPaymentService } from './fulfillment-payment.service.js';
import { FulfillmentDigitalService } from './fulfillment-digital.service.js';
import { FulfillmentPhysicalService } from './fulfillment-physical.service.js';
import { FulfillmentAnalyticsService } from './fulfillment-analytics.service.js';

export class FulfillmentController {
  // =============================================================
  // PUBLIC CLIENT DELIVERY PORTAL ENDPOINTS
  // =============================================================

  public static async getPublicOrder(
    req: FastifyRequest<{ Params: { token: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { token } = req.params;
      const order = await FulfillmentOrderService.getOrderByToken(token);
      return reply.send({ success: true, data: order });
    } catch (err: any) {
      return reply.status(404).send({ success: false, error: err.message });
    }
  }

  public static async clientConfirmDelivery(
    req: FastifyRequest<{ Params: { token: string }; Body: { notes?: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { token } = req.params;
      const result = await FulfillmentOrderService.clientConfirmDelivery(token, req.body?.notes);
      return reply.send({ success: true, data: result });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  public static async downloadPublicItem(
    req: FastifyRequest<{
      Params: { token: string; type: 'package' | 'photo'; id: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { token, type, id } = req.params;
      const ip = req.ip || (req.headers['x-forwarded-for'] as string);
      const userAgent = req.headers['user-agent'];

      const result = await FulfillmentDigitalService.authorizeAndLogDownload(
        token,
        type === 'package' ? 'PACKAGE' : 'PHOTO',
        id,
        { ip_address: ip, user_agent: userAgent }
      );

      return reply.send({ success: true, data: result });
    } catch (err: any) {
      return reply.status(403).send({ success: false, error: err.message });
    }
  }

  // =============================================================
  // STUDIO PRODUCT CATALOG ENDPOINTS
  // =============================================================

  public static async listProducts(
    req: FastifyRequest<{ Params: { studioId: string }; Querystring: any }>,
    reply: FastifyReply
  ) {
    try {
      const { studioId } = req.params;
      const products = await FulfillmentProductService.listProducts(studioId, req.query);
      return reply.send({ success: true, data: products });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  public static async createProduct(
    req: FastifyRequest<{ Params: { studioId: string }; Body: CreateFulfillmentProductDTO }>,
    reply: FastifyReply
  ) {
    try {
      const { studioId } = req.params;
      const product = await FulfillmentProductService.createProduct(studioId, req.body);
      return reply.status(201).send({ success: true, data: product });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  public static async getProduct(
    req: FastifyRequest<{ Params: { studioId: string; productId: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { studioId, productId } = req.params;
      const product = await FulfillmentProductService.getProductById(studioId, productId);
      return reply.send({ success: true, data: product });
    } catch (err: any) {
      return reply.status(404).send({ success: false, error: err.message });
    }
  }

  public static async updateProduct(
    req: FastifyRequest<{ Params: { studioId: string; productId: string }; Body: UpdateFulfillmentProductDTO }>,
    reply: FastifyReply
  ) {
    try {
      const { studioId, productId } = req.params;
      const product = await FulfillmentProductService.updateProduct(studioId, productId, req.body);
      return reply.send({ success: true, data: product });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  public static async deleteProduct(
    req: FastifyRequest<{ Params: { studioId: string; productId: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { studioId, productId } = req.params;
      const result = await FulfillmentProductService.deleteProduct(studioId, productId);
      return reply.send({ success: true, data: result });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  public static async addProductVariant(
    req: FastifyRequest<{ Params: { studioId: string; productId: string }; Body: CreateProductVariantDTO }>,
    reply: FastifyReply
  ) {
    try {
      const { studioId, productId } = req.params;
      const variant = await FulfillmentProductService.addVariant(studioId, productId, req.body);
      return reply.status(201).send({ success: true, data: variant });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  public static async updateProductVariant(
    req: FastifyRequest<{ Params: { studioId: string; productId: string; variantId: string }; Body: Partial<CreateProductVariantDTO> }>,
    reply: FastifyReply
  ) {
    try {
      const { studioId, variantId } = req.params;
      const variant = await FulfillmentProductService.updateVariant(studioId, variantId, req.body);
      return reply.send({ success: true, data: variant });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  // =============================================================
  // STUDIO ORDER MANAGEMENT ENDPOINTS
  // =============================================================

  public static async listOrders(
    req: FastifyRequest<{ Params: { studioId: string }; Querystring: any }>,
    reply: FastifyReply
  ) {
    try {
      const { studioId } = req.params;
      const result = await FulfillmentOrderService.listOrders(studioId, req.query);
      return reply.send({ success: true, data: result.orders, total: result.total });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  public static async createOrderFromProofing(
    req: FastifyRequest<{ Params: { studioId: string }; Body: CreateFulfillmentOrderFromProofingDTO }>,
    reply: FastifyReply
  ) {
    try {
      const { studioId } = req.params;
      const userId = (req as any).user?.id;
      const order = await FulfillmentOrderService.createOrderFromProofing(studioId, req.body, userId);
      return reply.status(201).send({ success: true, data: order });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  public static async createManualOrder(
    req: FastifyRequest<{ Params: { studioId: string }; Body: CreateManualFulfillmentOrderDTO }>,
    reply: FastifyReply
  ) {
    try {
      const { studioId } = req.params;
      const userId = (req as any).user?.id;
      const order = await FulfillmentOrderService.createManualOrder(studioId, req.body, userId);
      return reply.status(201).send({ success: true, data: order });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  public static async getOrder(
    req: FastifyRequest<{ Params: { studioId: string; orderId: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { studioId, orderId } = req.params;
      const order = await FulfillmentOrderService.getOrderById(studioId, orderId);
      return reply.send({ success: true, data: order });
    } catch (err: any) {
      return reply.status(404).send({ success: false, error: err.message });
    }
  }

  public static async addOrderItem(
    req: FastifyRequest<{ Params: { studioId: string; orderId: string }; Body: AddOrderItemDTO }>,
    reply: FastifyReply
  ) {
    try {
      const { studioId, orderId } = req.params;
      const userId = (req as any).user?.id;
      const order = await FulfillmentOrderService.addOrderItem(studioId, orderId, req.body, userId);
      return reply.send({ success: true, data: order });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  public static async updateOrderItem(
    req: FastifyRequest<{ Params: { studioId: string; orderId: string; itemId: string }; Body: UpdateOrderItemDTO }>,
    reply: FastifyReply
  ) {
    try {
      const { studioId, orderId, itemId } = req.params;
      const userId = (req as any).user?.id;
      const order = await FulfillmentOrderService.updateOrderItem(studioId, orderId, itemId, req.body, userId);
      return reply.send({ success: true, data: order });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  public static async removeOrderItem(
    req: FastifyRequest<{ Params: { studioId: string; orderId: string; itemId: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { studioId, orderId, itemId } = req.params;
      const userId = (req as any).user?.id;
      const order = await FulfillmentOrderService.removeOrderItem(studioId, orderId, itemId, userId);
      return reply.send({ success: true, data: order });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  public static async updateOrderStatus(
    req: FastifyRequest<{ Params: { studioId: string; orderId: string }; Body: { status: FulfillmentOrderStatus; reason?: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { studioId, orderId } = req.params;
      const userId = (req as any).user?.id;
      const order = await FulfillmentOrderService.updateOrderStatus(studioId, orderId, req.body.status, req.body.reason, userId);
      return reply.send({ success: true, data: order });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  public static async cancelOrder(
    req: FastifyRequest<{ Params: { studioId: string; orderId: string }; Body: { reason?: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { studioId, orderId } = req.params;
      const userId = (req as any).user?.id;
      const order = await FulfillmentOrderService.cancelOrder(studioId, orderId, req.body?.reason, userId);
      return reply.send({ success: true, data: order });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  // =============================================================
  // STUDIO PAYMENT & REFUND ENDPOINTS
  // =============================================================

  public static async recordPayment(
    req: FastifyRequest<{ Params: { studioId: string; orderId: string }; Body: RecordFulfillmentPaymentDTO }>,
    reply: FastifyReply
  ) {
    try {
      const { studioId, orderId } = req.params;
      const userId = (req as any).user?.id;
      const result = await FulfillmentPaymentService.recordPayment(studioId, orderId, req.body, userId);
      return reply.send({ success: true, data: result });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  public static async recordRefund(
    req: FastifyRequest<{ Params: { studioId: string; orderId: string }; Body: { amount: number; reason?: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { studioId, orderId } = req.params;
      const userId = (req as any).user?.id;
      const order = await FulfillmentPaymentService.recordRefund(studioId, orderId, req.body.amount, req.body.reason, userId);
      return reply.send({ success: true, data: order });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  // =============================================================
  // STUDIO DIGITAL & PHYSICAL DELIVERY ENDPOINTS
  // =============================================================

  public static async createDigitalPackage(
    req: FastifyRequest<{ Params: { studioId: string; orderId: string }; Body: CreateDigitalPackageDTO }>,
    reply: FastifyReply
  ) {
    try {
      const { studioId, orderId } = req.params;
      const userId = (req as any).user?.id;
      const pkg = await FulfillmentDigitalService.createDigitalPackage(studioId, orderId, req.body, userId);
      return reply.status(201).send({ success: true, data: pkg });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  public static async createPhysicalDelivery(
    req: FastifyRequest<{ Params: { studioId: string; orderId: string }; Body: CreatePhysicalDeliveryDTO }>,
    reply: FastifyReply
  ) {
    try {
      const { studioId, orderId } = req.params;
      const userId = (req as any).user?.id;
      const delivery = await FulfillmentPhysicalService.createPhysicalDelivery(studioId, orderId, req.body, userId);
      return reply.status(201).send({ success: true, data: delivery });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  public static async updateDeliveryStatus(
    req: FastifyRequest<{ Params: { studioId: string; deliveryId: string }; Body: UpdatePhysicalDeliveryDTO }>,
    reply: FastifyReply
  ) {
    try {
      const { studioId, deliveryId } = req.params;
      const userId = (req as any).user?.id;
      const delivery = await FulfillmentPhysicalService.updateDeliveryStatus(studioId, deliveryId, req.body, userId);
      return reply.send({ success: true, data: delivery });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  // =============================================================
  // STUDIO ANALYTICS & AUDIT LOGS
  // =============================================================

  public static async getAnalyticsSummary(
    req: FastifyRequest<{ Params: { studioId: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { studioId } = req.params;
      const summary = await FulfillmentAnalyticsService.getStudioAnalyticsSummary(studioId);
      return reply.send({ success: true, data: summary });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }

  public static async getOrderAuditLogs(
    req: FastifyRequest<{ Params: { studioId: string; orderId: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { studioId, orderId } = req.params;
      const logs = await FulfillmentAnalyticsService.getOrderAuditLog(studioId, orderId);
      return reply.send({ success: true, data: logs });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message });
    }
  }
}
