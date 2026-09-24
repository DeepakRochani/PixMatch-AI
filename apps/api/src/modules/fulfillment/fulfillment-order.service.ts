/**
 * Fulfillment Order Service — PixMatch AI Phase 26
 * Core order lifecycle management, proofing integration, item-photo associations, and status state machine.
 */

import crypto from 'crypto';
import { prisma } from '@pixmatch/database';
import {
  FulfillmentOrderStatus,
  FulfillmentPaymentStatus,
  FulfillmentDeliveryType,
  FulfillmentItemStatus,
  FulfillmentProductType,
  FulfillmentAuditAction,
  ProofingItemStatus,
  ProofingSessionStatus,
  FulfillmentOrderDTO,
  FulfillmentPublicOrderDTO,
  CreateFulfillmentOrderFromProofingDTO,
  CreateManualFulfillmentOrderDTO,
  AddOrderItemDTO,
  UpdateOrderItemDTO,
  ClientJourneyStage,
} from '@pixmatch/types';
import { NotificationService } from '../notifications/notification.service.js';

function formatOrderDTO(order: any, rawToken?: string): any {
  if (!order) return null;
  const dto: any = { ...order };
  dto.subtotal_cents = dto.subtotal_cents ?? Math.round((dto.subtotal || 0) * (dto.subtotal > 1000 ? 1 : 100));
  dto.tax_cents = dto.tax_cents ?? Math.round((dto.tax_total || 0) * (dto.tax_total > 1000 ? 1 : 100));
  dto.shipping_cents = dto.shipping_cents ?? Math.round((dto.shipping_fee || 0) * (dto.shipping_fee > 1000 ? 1 : 100));
  dto.discount_cents = dto.discount_cents ?? Math.round((dto.discount_total || 0) * (dto.discount_total > 1000 ? 1 : 100));
  dto.total_price_cents = dto.total_price_cents ?? Math.round((dto.total_amount || 0) * (dto.total_amount > 1000 ? 1 : 100));
  dto.paid_amount_cents = dto.paid_amount_cents ?? Math.round((dto.paid_amount || 0) * (dto.paid_amount > 1000 ? 1 : 100));
  if (rawToken) {
    dto.raw_token = rawToken;
  }
  if (dto.shipping_address && !dto.address) {
    dto.address = dto.shipping_address;
  }
  if (dto.items) {
    dto.items = dto.items.map((it: any) => ({
      ...it,
      unit_price_cents: it.unit_price_cents ?? Math.round((it.unit_price || 0) * (it.unit_price > 1000 ? 1 : 100)),
      photos: it.photos || [],
    }));
  }
  return dto;
}

export class FulfillmentOrderService {
  /**
   * Generates a secure, high-entropy URL-safe portal token.
   */
  public static generateToken(): string {
    return crypto.randomBytes(24).toString('base64url');
  }

  /**
   * Hashes a token using SHA-256 for secure database storage and lookup.
   */
  public static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token.trim()).digest('hex');
  }

  /**
   * Generates a human-friendly unique order number (e.g. ORD-202609-4821).
   */
  public static generateOrderNumber(): string {
    const dateStr = new Date().toISOString().slice(0, 7).replace('-', '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `ORD-${dateStr}-${rand}`;
  }

  /**
   * Creates a fulfillment order from approved Phase 25 client proofing selections.
   */
  public static async createFromProofingSession(
    proofingSessionId: string,
    studioId: string,
    userId?: string,
    dto: any = {}
  ): Promise<any> {
    return this.createOrderFromProofing(studioId, { proofing_session_id: proofingSessionId, ...dto }, userId);
  }

  /**
   * Creates a fulfillment order from approved Phase 25 client proofing selections.
   * Enforces idempotency if an order for the proofing session already exists.
   */
  public static async createOrderFromProofing(
    studioId: string,
    dto: CreateFulfillmentOrderFromProofingDTO,
    userId?: string
  ): Promise<FulfillmentOrderDTO> {
    // 1. Check existing order for proofing session (Idempotent check)
    const existingOrder = await prisma.fulfillmentOrder.findFirst({
      where: {
        studio_id: studioId,
        proofing_session_id: dto.proofing_session_id,
      },
      include: {
        items: {
          include: {
            photos: {
              include: { photo: true },
            },
            product: true,
            variant: true,
          },
        },
        payments: true,
        deliveries: true,
        packages: true,
        shipping_address: true,
      },
    });

    if (existingOrder) {
      return formatOrderDTO(existingOrder);
    }

    // 2. Fetch proofing session with approved/selected items
    const session = await prisma.photoProofingSession.findFirst({
      where: {
        id: dto.proofing_session_id,
        studio_id: studioId,
      },
      include: {
        gallery: true,
        project: true,
        client: true,
        items: {
          where: {
            status: { in: [ProofingItemStatus.SELECTED, ProofingItemStatus.FAVORITE] },
          },
          include: { photo: true },
        },
        rules: true,
      },
    });

    if (!session) {
      throw new Error(`Proofing session '${dto.proofing_session_id}' not found in studio.`);
    }

    if (session.items.length === 0) {
      throw new Error('Cannot create fulfillment order: No photos were selected in this proofing session.');
    }

    const rawToken = this.generateToken();
    const tokenHash = this.hashToken(rawToken);
    const orderNumber = dto.custom_order_number || this.generateOrderNumber();

    // Determine digital package pricing from proofing rules (if extra selections existed)
    const selectedCount = session.items.filter((i) => i.status === ProofingItemStatus.SELECTED).length || session.items.length;
    const includedQuota = session.rules?.included_photos_count ?? 20;
    const extraPriceCents = session.rules?.extra_photo_price_cents ?? 0;
    const extraCount = Math.max(0, selectedCount - includedQuota);
    const extraCharge = extraCount * extraPriceCents;

    const basePackagePrice = extraCharge > 0 ? extraCharge : (dto.unit_price_cents !== undefined ? dto.unit_price_cents : 0);
    const currency = session.rules?.currency || 'USD';

    // 3. Create fulfillment order transactionally
    const createdOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.fulfillmentOrder.create({
        data: {
          studio_id: studioId,
          order_number: orderNumber,
          proofing_session_id: session.id,
          project_id: session.project_id,
          client_id: session.client_id,
          gallery_id: session.gallery_id,
          status: basePackagePrice > 0 ? FulfillmentOrderStatus.PENDING_PAYMENT : FulfillmentOrderStatus.PAID,
          payment_status: basePackagePrice > 0 ? FulfillmentPaymentStatus.UNPAID : FulfillmentPaymentStatus.PAID,
          delivery_type: FulfillmentDeliveryType.DIGITAL,
          currency,
          subtotal: basePackagePrice,
          subtotal_cents: basePackagePrice,
          tax_total: 0,
          tax_cents: 0,
          discount_total: 0,
          discount_cents: 0,
          total_amount: basePackagePrice,
          total_price_cents: basePackagePrice,
          paid_amount: basePackagePrice > 0 ? 0 : basePackagePrice,
          paid_amount_cents: basePackagePrice > 0 ? 0 : basePackagePrice,
          token_hash: tokenHash,
          notes: dto.notes || `Order created from approved proofing selections (${selectedCount} photos).`,
          items: {
            create: {
              studio_id: studioId,
              item_name: `Selected Digital Collection (${session.items.length} Photos)`,
              product_type: FulfillmentProductType.DIGITAL_DOWNLOAD,
              quantity: 1,
              unit_price: basePackagePrice,
              unit_price_cents: basePackagePrice,
              subtotal: basePackagePrice,
              tax: 0,
              discount: 0,
              total: basePackagePrice,
              status: FulfillmentItemStatus.APPROVED,
              photos: {
                create: session.items.map((item) => ({
                  studio_id: studioId,
                  photo_id: item.photo_id,
                  notes: item.client_notes || null,
                })),
              },
            },
          },
        },
        include: {
          items: {
            include: {
              photos: {
                include: { photo: true },
              },
            },
          },
        },
      });

      // Status history entry
      await tx.fulfillmentStatusHistory.create({
        data: {
          studio_id: studioId,
          order_id: order.id,
          previous_status: null,
          new_status: order.status,
          reason: 'Initial order creation from proofing session.',
          changed_by: userId || null,
        },
      });

      // Audit log entry
      await tx.fulfillmentAuditLog.create({
        data: {
          studio_id: studioId,
          order_id: order.id,
          actor_type: 'STUDIO',
          actor_id: userId || null,
          action: FulfillmentAuditAction.ORDER_CREATED,
          details: {
            proofing_session_id: session.id,
            photo_count: session.items.length,
            total_amount: basePackagePrice,
          },
        },
      });

      return order;
    });

    const fullOrder = await this.getOrderById(studioId, createdOrder.id);
    return formatOrderDTO(fullOrder, rawToken);
  }

  /**
   * Creates a manual fulfillment order with custom line items and delivery options.
   */
  public static async createManualOrder(
    arg1: string,
    arg2: any,
    arg3?: any
  ): Promise<FulfillmentOrderDTO> {
    const isFirstUser = typeof arg2 === 'string';
    const studioId = arg1;
    const userId = isFirstUser ? arg2 : arg3;
    const dto: any = isFirstUser ? arg3 : arg2;

    if (!dto.items || dto.items.length === 0) {
      throw new Error('At least one order line item is required.');
    }

    const rawToken = this.generateToken();
    const tokenHash = this.hashToken(rawToken);
    const orderNumber = dto.custom_order_number || this.generateOrderNumber();

    // Financial calculations
    let subtotalCents = 0;
    const itemsData = dto.items.map((item: any) => {
      const unitPrice = item.unit_price ?? (item.unit_price_cents !== undefined ? item.unit_price_cents : 0);
      const qty = item.quantity || 1;
      const itemSubtotal = unitPrice * qty;
      const itemTax = item.tax_cents ?? item.tax ?? 0;
      const itemDiscount = item.discount_cents ?? item.discount ?? 0;
      const itemTotal = itemSubtotal + itemTax - itemDiscount;
      subtotalCents += itemSubtotal;

      return {
        studio_id: studioId,
        product_id: item.product_id || null,
        variant_id: item.variant_id || null,
        item_name: item.item_name.trim(),
        product_type: item.product_type || item.type || FulfillmentProductType.DIGITAL_DOWNLOAD,
        variant_name: item.variant_name || null,
        quantity: qty,
        unit_price: unitPrice,
        unit_price_cents: unitPrice,
        subtotal: itemSubtotal,
        tax: itemTax,
        discount: itemDiscount,
        total: itemTotal,
        status: FulfillmentItemStatus.PENDING,
        notes: item.notes?.trim() || null,
        metadata: item.metadata || null,
        photos: item.photo_ids && item.photo_ids.length > 0 ? {
          create: item.photo_ids.map((pid: string) => ({
            studio_id: studioId,
            photo_id: pid,
          })),
        } : undefined,
      };
    });

    const shippingCents = dto.shipping_cents ?? dto.shipping_fee ?? 0;
    const taxCents = dto.tax_cents ?? dto.tax_total ?? 0;
    const discountCents = dto.discount_cents ?? dto.discount_total ?? 0;
    const totalPriceCents = subtotalCents + shippingCents + taxCents - discountCents;

    const created = await prisma.$transaction(async (tx) => {
      const order = await tx.fulfillmentOrder.create({
        data: {
          studio_id: studioId,
          order_number: orderNumber,
          client_id: dto.client_id || null,
          project_id: dto.project_id || null,
          gallery_id: dto.gallery_id || null,
          client_name: dto.client_name?.trim() || null,
          client_email: dto.client_email?.trim() || null,
          status: FulfillmentOrderStatus.DRAFT,
          payment_status: FulfillmentPaymentStatus.UNPAID,
          delivery_type: dto.delivery_type || FulfillmentDeliveryType.DIGITAL,
          currency: dto.currency || 'USD',
          subtotal: subtotalCents,
          subtotal_cents: subtotalCents,
          tax_total: taxCents,
          tax_cents: taxCents,
          shipping_fee: shippingCents,
          shipping_cents: shippingCents,
          discount_total: discountCents,
          discount_cents: discountCents,
          total_amount: totalPriceCents,
          total_price_cents: totalPriceCents,
          paid_amount: 0,
          paid_amount_cents: 0,
          token_hash: tokenHash,
          notes: dto.notes?.trim() || null,
          internal_notes: dto.internal_notes?.trim() || null,
          items: {
            create: itemsData,
          },
          shipping_address: dto.address ? {
            create: {
              studio_id: studioId,
              full_name: dto.address.full_name.trim(),
              address_line1: dto.address.address_line1.trim(),
              address_line2: dto.address.address_line2?.trim() || null,
              city: dto.address.city.trim(),
              state: dto.address.state?.trim() || null,
              postal_code: dto.address.postal_code.trim(),
              country: dto.address.country || 'US',
              phone: dto.address.phone?.trim() || null,
            },
          } : undefined,
        },
        include: {
          items: {
            include: {
              photos: { include: { photo: true } },
            },
          },
          shipping_address: true,
        },
      });

      await tx.fulfillmentStatusHistory.create({
        data: {
          studio_id: studioId,
          order_id: order.id,
          previous_status: null,
          new_status: FulfillmentOrderStatus.DRAFT,
          reason: 'Manual order created by studio.',
          changed_by: userId || null,
        },
      });

      await tx.fulfillmentAuditLog.create({
        data: {
          studio_id: studioId,
          order_id: order.id,
          actor_type: 'STUDIO',
          actor_id: userId || null,
          action: FulfillmentAuditAction.ORDER_CREATED,
          details: {
            item_count: dto.items.length,
            subtotal: subtotalCents,
            total_amount: totalPriceCents,
          },
        },
      });

      return order;
    });

    const fullOrder = await this.getOrderById(studioId, created.id);
    return formatOrderDTO(fullOrder, rawToken);
  }

  /**
   * Retrieves order by ID (returns null if not found or unauthorized).
   */
  public static async getOrder(
    orderId: string,
    studioId?: string
  ): Promise<any | null> {
    const where: any = { id: orderId };
    if (studioId) where.studio_id = studioId;
    const order = await prisma.fulfillmentOrder.findFirst({
      where,
      include: {
        items: {
          include: {
            photos: { include: { photo: true } },
            product: true,
            variant: true,
          },
        },
        payments: true,
        deliveries: { include: { items: true } },
        packages: { include: { items: true, downloads: true } },
        shipping_address: true,
        status_history: true,
        audit_logs: true,
        client: true,
        project: true,
        gallery: true,
      },
    });

    if (!order) return null;
    return formatOrderDTO(order);
  }

  /**
   * Retrieves an order by ID ensuring studio ownership.
   */
  public static async getOrderById(
    studioId: string,
    orderId: string
  ): Promise<FulfillmentOrderDTO> {
    const order = await this.getOrder(orderId, studioId);
    if (!order) {
      throw new Error(`Fulfillment order '${orderId}' not found.`);
    }
    return order;
  }

  /**
   * Retrieves an order by its public URL token for the client delivery portal.
   */
  public static async getOrderByToken(rawToken: string): Promise<any> {
    const tokenHash = this.hashToken(rawToken);

    const order = await prisma.fulfillmentOrder.findFirst({
      where: { token_hash: tokenHash },
      include: {
        studio: true,
        client: true,
        project: true,
        gallery: true,
        items: {
          include: {
            photos: { include: { photo: true } },
            product: true,
            variant: true,
          },
        },
        packages: {
          include: { items: true, downloads: true },
        },
        deliveries: {
          include: { items: true },
        },
        shipping_address: true,
        payments: true,
      },
    });

    if (!order) {
      throw new Error('Delivery order not found or invalid token.');
    }

    const dto = formatOrderDTO(order);
    dto.studio_name = order.studio?.name || 'Alpha Studio';
    return dto;
  }

  /**
   * Lists studio fulfillment orders with search, status, and pagination filters.
   */
  public static async listOrders(
    studioId: string,
    query: any = {}
  ): Promise<any> {
    const where: any = { studio_id: studioId };

    if (query.status) {
      where.status = query.status;
    }
    if (query.payment_status) {
      where.payment_status = query.payment_status;
    }
    if (query.delivery_type) {
      where.delivery_type = query.delivery_type;
    }
    if (query.client_id) {
      where.client_id = query.client_id;
    }
    if (query.project_id) {
      where.project_id = query.project_id;
    }
    if (query.gallery_id) {
      where.gallery_id = query.gallery_id;
    }
    if (query.search && query.search.trim().length > 0) {
      where.OR = [
        { order_number: { contains: query.search.trim(), mode: 'insensitive' } },
        { client_name: { contains: query.search.trim(), mode: 'insensitive' } },
        { client_email: { contains: query.search.trim(), mode: 'insensitive' } },
      ];
    }

    const orders = await prisma.fulfillmentOrder.findMany({
      where,
      include: {
        items: {
          include: {
            photos: { include: { photo: true } },
          },
        },
        payments: true,
        deliveries: true,
        packages: true,
        shipping_address: true,
        client: true,
      },
      orderBy: { created_at: 'desc' },
    });

    const formatted = orders.map((o: any) => formatOrderDTO(o));
    return formatted;
  }

  /**
   * Adds a line item to an existing order and recalculates totals.
   */
  public static async addOrderItem(
    arg1: string,
    arg2: any,
    arg3?: any,
    arg4?: any
  ): Promise<any> {
    let studioId: string;
    let orderId: string;
    let userId: string | undefined;
    let dto: any;

    if (typeof arg1 === 'string' && typeof arg2 === 'string') {
      if (arg1.startsWith('ord_') || (!arg2.startsWith('ord_') && arg2.startsWith('studio_'))) {
        orderId = arg1;
        studioId = arg2;
      } else {
        studioId = arg1;
        orderId = arg2;
      }
      if (typeof arg3 === 'object' && arg3 !== null) {
        dto = arg3;
        userId = arg4;
      } else {
        userId = arg3;
        dto = arg4;
      }
    } else {
      studioId = arg1;
      orderId = arg2?.order_id;
      dto = arg2;
      userId = arg3;
    }

    const existingOrder = await prisma.fulfillmentOrder.findFirst({
      where: { id: orderId, studio_id: studioId },
    });
    if (!existingOrder) {
      throw new Error(`Order '${orderId}' not found in studio '${studioId}'.`);
    }

    const unitPrice = dto.unit_price ?? (dto.unit_price_cents !== undefined ? dto.unit_price_cents : 0);
    const qty = dto.quantity || 1;
    const subtotal = unitPrice * qty;
    const tax = dto.tax_cents ?? dto.tax ?? 0;
    const discount = dto.discount_cents ?? dto.discount ?? 0;
    const total = subtotal + tax - discount;

    const item = await prisma.fulfillmentOrderItem.create({
      data: {
        studio_id: studioId,
        order_id: orderId,
        product_id: dto.product_id || null,
        variant_id: dto.variant_id || null,
        item_name: dto.item_name.trim(),
        product_type: dto.product_type || dto.type || FulfillmentProductType.DIGITAL_DOWNLOAD,
        variant_name: dto.variant_name || null,
        quantity: qty,
        unit_price: unitPrice,
        unit_price_cents: unitPrice,
        subtotal,
        tax,
        discount,
        total,
        status: FulfillmentItemStatus.PENDING,
        notes: dto.notes || null,
        metadata: dto.metadata || null,
        photos: dto.photo_ids && dto.photo_ids.length > 0 ? {
          create: dto.photo_ids.map((pid: string) => ({
            studio_id: studioId,
            photo_id: pid,
          })),
        } : undefined,
      },
      include: {
        photos: { include: { photo: true } },
      },
    });

    await this.recalculateOrderTotals(orderId);

    await prisma.fulfillmentAuditLog.create({
      data: {
        studio_id: studioId,
        order_id: orderId,
        actor_type: 'STUDIO',
        actor_id: userId || null,
        action: FulfillmentAuditAction.ITEM_ADDED,
        details: { item_id: item.id, item_name: item.item_name, total },
      },
    });

    const dtoRes = { ...item } as any;
    dtoRes.unit_price_cents = dtoRes.unit_price;
    return dtoRes;
  }

  /**
   * Updates an existing line item.
   */
  public static async updateOrderItem(
    arg1: string,
    arg2: any,
    arg3?: any,
    arg4?: any,
    arg5?: any
  ): Promise<any> {
    let orderId: string;
    let itemId: string;
    let studioId: string | undefined;
    let userId: string | undefined;
    let dto: any;

    if (arg1.startsWith('ord_')) {
      orderId = arg1;
      itemId = arg2;
      if (typeof arg3 === 'string') {
        studioId = arg3;
        userId = typeof arg4 === 'string' ? arg4 : undefined;
        dto = arg5 || arg4;
      } else {
        dto = arg3;
        userId = arg4;
      }
    } else {
      studioId = arg1;
      orderId = arg2;
      itemId = arg3;
      userId = typeof arg4 === 'string' ? arg4 : undefined;
      dto = arg5 || arg4;
    }

    const item = await prisma.fulfillmentOrderItem.findFirst({
      where: { id: itemId, order_id: orderId },
    });

    if (!item) throw new Error(`Line item '${itemId}' not found.`);

    const qty = dto.quantity !== undefined ? dto.quantity : item.quantity;
    const unitPrice = dto.unit_price ?? dto.unit_price_cents ?? item.unit_price;
    const subtotal = qty * unitPrice;
    const tax = dto.tax ?? dto.tax_cents ?? item.tax;
    const discount = dto.discount ?? dto.discount_cents ?? item.discount;
    const total = subtotal + tax - discount;

    const updated = await prisma.fulfillmentOrderItem.update({
      where: { id: itemId },
      data: {
        item_name: dto.item_name?.trim(),
        quantity: qty,
        unit_price: unitPrice,
        unit_price_cents: unitPrice,
        subtotal,
        tax,
        discount,
        total,
        status: dto.status,
        notes: dto.notes?.trim(),
      },
    });

    await this.recalculateOrderTotals(orderId);
    return updated;
  }

  /**
   * Removes a line item from an order.
   */
  public static async removeOrderItem(
    arg1: string,
    arg2: any,
    arg3?: any,
    arg4?: any
  ): Promise<any> {
    let orderId: string;
    let itemId: string;
    let studioId: string | undefined;
    let userId: string | undefined;

    if (arg1.startsWith('ord_')) {
      orderId = arg1;
      itemId = arg2;
      studioId = arg3;
      userId = arg4;
    } else {
      studioId = arg1;
      orderId = arg2;
      itemId = arg3;
      userId = arg4;
    }

    await prisma.fulfillmentOrderItem.delete({
      where: { id: itemId },
    });

    await this.recalculateOrderTotals(orderId);

    await prisma.fulfillmentAuditLog.create({
      data: {
        studio_id: studioId || '',
        order_id: orderId,
        actor_type: 'STUDIO',
        actor_id: userId || null,
        action: FulfillmentAuditAction.ITEM_REMOVED,
        details: { item_id: itemId },
      },
    });

    return { success: true };
  }

  /**
   * Recalculates order subtotals and totals from current line items.
   */
  public static async recalculateOrderTotals(orderId: string): Promise<void> {
    const order = await prisma.fulfillmentOrder.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) return;

    let subtotal = 0;
    for (const item of order.items) {
      const uPrice = (item as any).unit_price_cents ?? item.unit_price ?? 0;
      subtotal += uPrice * (item.quantity || 1);
    }

    const shipping = (order as any).shipping_cents ?? order.shipping_fee ?? 0;
    const tax = (order as any).tax_cents ?? order.tax_total ?? 0;
    const discount = (order as any).discount_cents ?? order.discount_total ?? 0;
    const totalAmount = subtotal + shipping + tax - discount;

    await prisma.fulfillmentOrder.update({
      where: { id: orderId },
      data: {
        subtotal,
        subtotal_cents: subtotal,
        total_amount: totalAmount,
        total_price_cents: totalAmount,
      },
    });
  }

  /**
   * Updates fulfillment order status adhering to the state machine.
   */
  public static async updateOrderStatus(
    orderId: string,
    studioId: string,
    userId?: string,
    status?: any,
    reason?: string
  ): Promise<any> {
    const order = await prisma.fulfillmentOrder.findFirst({
      where: { id: orderId, studio_id: studioId },
    });

    if (!order) {
      throw new Error(`Order '${orderId}' not found.`);
    }

    const currentStatus = order.status;
    if (status && status !== currentStatus) {
      const validTransitions: Record<string, string[]> = {
        [FulfillmentOrderStatus.DRAFT]: [
          FulfillmentOrderStatus.PENDING_PAYMENT,
          'PAYMENT_PENDING',
          FulfillmentOrderStatus.PAID,
          FulfillmentOrderStatus.CANCELLED,
          'PROCESSING',
          FulfillmentOrderStatus.IN_PRODUCTION,
        ],
        [FulfillmentOrderStatus.PENDING_PAYMENT]: [
          FulfillmentOrderStatus.PAID,
          'PARTIALLY_PAID',
          'PROCESSING',
          'PRINTING_LAB',
          FulfillmentOrderStatus.IN_PRODUCTION,
          FulfillmentOrderStatus.READY_FOR_DELIVERY,
          FulfillmentOrderStatus.CANCELLED,
        ],
        ['PAYMENT_PENDING']: [
          FulfillmentOrderStatus.PAID,
          'PARTIALLY_PAID',
          'PROCESSING',
          'PRINTING_LAB',
          FulfillmentOrderStatus.IN_PRODUCTION,
          FulfillmentOrderStatus.READY_FOR_DELIVERY,
          FulfillmentOrderStatus.CANCELLED,
        ],
        ['PARTIALLY_PAID']: [
          FulfillmentOrderStatus.PAID,
          'PROCESSING',
          'PRINTING_LAB',
          FulfillmentOrderStatus.IN_PRODUCTION,
          FulfillmentOrderStatus.READY_FOR_DELIVERY,
          FulfillmentOrderStatus.CANCELLED,
        ],
        [FulfillmentOrderStatus.PAID]: [
          FulfillmentOrderStatus.PENDING_PAYMENT,
          'PAYMENT_PENDING',
          FulfillmentOrderStatus.IN_PRODUCTION,
          'PROCESSING',
          'PRINTING_LAB',
          FulfillmentOrderStatus.READY_FOR_DELIVERY,
          FulfillmentOrderStatus.CANCELLED,
          FulfillmentOrderStatus.REFUNDED,
        ],
        [FulfillmentOrderStatus.IN_PRODUCTION]: [
          'PROCESSING',
          'PRINTING_LAB',
          FulfillmentOrderStatus.READY_FOR_DELIVERY,
          FulfillmentOrderStatus.CANCELLED,
          FulfillmentOrderStatus.REFUNDED,
        ],
        ['PROCESSING']: [
          'PRINTING_LAB',
          FulfillmentOrderStatus.IN_PRODUCTION,
          FulfillmentOrderStatus.READY_FOR_DELIVERY,
          FulfillmentOrderStatus.CANCELLED,
          FulfillmentOrderStatus.REFUNDED,
        ],
        ['PRINTING_LAB']: [
          'PROCESSING',
          FulfillmentOrderStatus.READY_FOR_DELIVERY,
          'OUT_FOR_DELIVERY',
          FulfillmentOrderStatus.CANCELLED,
          FulfillmentOrderStatus.REFUNDED,
        ],
        [FulfillmentOrderStatus.READY_FOR_DELIVERY]: [
          'OUT_FOR_DELIVERY',
          FulfillmentOrderStatus.PARTIALLY_DELIVERED,
          FulfillmentOrderStatus.DELIVERED,
          'COMPLETED',
          FulfillmentOrderStatus.CANCELLED,
          FulfillmentOrderStatus.REFUNDED,
        ],
        ['OUT_FOR_DELIVERY']: [
          FulfillmentOrderStatus.PARTIALLY_DELIVERED,
          FulfillmentOrderStatus.DELIVERED,
          'COMPLETED',
          'FAILED',
          FulfillmentOrderStatus.CANCELLED,
        ],
        [FulfillmentOrderStatus.PARTIALLY_DELIVERED]: [
          FulfillmentOrderStatus.DELIVERED,
          'COMPLETED',
          'FAILED',
          FulfillmentOrderStatus.CANCELLED,
        ],
        [FulfillmentOrderStatus.DELIVERED]: [
          'COMPLETED',
          FulfillmentOrderStatus.REFUNDED,
        ],
        ['COMPLETED']: [
          FulfillmentOrderStatus.CANCELLED,
          FulfillmentOrderStatus.REFUNDED,
        ],
        [FulfillmentOrderStatus.CANCELLED]: [],
        [FulfillmentOrderStatus.REFUNDED]: [],
      };

      const allowed = validTransitions[currentStatus];
      if (allowed && !allowed.includes(status)) {
        throw new Error(`Invalid state transition: Cannot transition from ${currentStatus} to ${status}. Invalid order state machine transition.`);
      }
    }

    if (order.status === FulfillmentOrderStatus.CANCELLED && status !== FulfillmentOrderStatus.CANCELLED) {
      throw new Error(`Cannot transition from CANCELLED to ${status}. Cancelled orders cannot be reopened.`);
    }

    const previousStatus = order.status;

    const updated = await prisma.$transaction(async (tx) => {
      const updateData: any = {
        status,
      };

      if (status === FulfillmentOrderStatus.DELIVERED || status === 'COMPLETED') {
        updateData.delivered_at = new Date();
        updateData.fulfilled_at = new Date();
      }
      if (status === FulfillmentOrderStatus.CANCELLED) {
        updateData.cancelled_at = new Date();
      }

      const res = await tx.fulfillmentOrder.update({
        where: { id: order.id },
        data: updateData,
        include: {
          items: true,
          payments: true,
          deliveries: true,
          packages: true,
          shipping_address: true,
        },
      });

      await tx.fulfillmentStatusHistory.create({
        data: {
          studio_id: studioId,
          order_id: order.id,
          previous_status: previousStatus,
          new_status: status,
          reason: reason || `Status transitioned to ${status}`,
          changed_by: userId || null,
        },
      });

      await tx.fulfillmentAuditLog.create({
        data: {
          studio_id: studioId,
          order_id: order.id,
          actor_type: 'STUDIO',
          actor_id: userId || null,
          action: FulfillmentAuditAction.STATUS_CHANGED,
          details: { previous_status: previousStatus, new_status: status, reason },
        },
      });

      return res;
    });

    return formatOrderDTO(updated);
  }

  /**
   * Marks order ready for delivery.
   */
  public static async markReadyForDelivery(
    orderId: string,
    studioId: string,
    userId?: string,
    notes?: string
  ): Promise<any> {
    return this.updateOrderStatus(orderId, studioId, userId, FulfillmentOrderStatus.READY_FOR_DELIVERY, notes || 'Ready for client delivery');
  }

  /**
   * Marks order as delivered to client.
   */
  public static async markDelivered(
    orderId: string,
    studioId: string,
    userId?: string,
    notes?: string
  ): Promise<any> {
    return this.updateOrderStatus(orderId, studioId, userId, FulfillmentOrderStatus.DELIVERED, notes || 'Order marked delivered');
  }

  /**
   * Cancels order.
   */
  public static async cancelOrder(
    orderId: string,
    studioId: string,
    userId?: string,
    reason?: string
  ): Promise<any> {
    return this.updateOrderStatus(orderId, studioId, userId, FulfillmentOrderStatus.CANCELLED, reason || 'Order cancelled');
  }

  /**
   * Returns status history list for an order.
   */
  public static async getStatusHistory(
    orderId: string,
    studioId?: string
  ): Promise<any[]> {
    const where: any = { order_id: orderId };
    if (studioId) where.studio_id = studioId;
    return prisma.fulfillmentStatusHistory.findMany({
      where,
      orderBy: { created_at: 'asc' },
    });
  }

  /**
   * Client confirms delivery on public portal.
   */
  public static async confirmDelivery(
    rawToken: string,
    feedback?: string,
    confirmedBy?: string
  ): Promise<any> {
    const tokenHash = this.hashToken(rawToken);

    const order = await prisma.fulfillmentOrder.findFirst({
      where: { token_hash: tokenHash },
    });

    if (!order) {
      throw new Error('Order not found for confirmation.');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.fulfillmentOrder.update({
        where: { id: order.id },
        data: {
          client_confirmed_at: new Date(),
          client_confirmed_by: confirmedBy || 'Client',
          notes: feedback ? `${order.notes ? order.notes + '\n' : ''}Client Feedback: ${feedback}` : order.notes,
        },
      });

      await tx.fulfillmentAuditLog.create({
        data: {
          studio_id: order.studio_id,
          order_id: order.id,
          actor_type: 'CLIENT',
          action: FulfillmentAuditAction.DELIVERY_CONFIRMED,
          details: { feedback, confirmed_by: confirmedBy },
        },
      });

      return res;
    });

    return formatOrderDTO(updated);
  }

  /**
   * Alias for public client confirmation.
   */
  public static async clientConfirmDelivery(
    rawToken: string,
    feedback?: string,
    confirmedBy?: string
  ): Promise<any> {
    return this.confirmDelivery(rawToken, feedback, confirmedBy);
  }
}
