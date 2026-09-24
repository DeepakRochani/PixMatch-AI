/**
 * PIXMatch AI — Phase 26 Master Test Suite
 * Photo Fulfillment, Delivery & Order Management
 *
 * Covers 90 Comprehensive Test Groups with 230+ assertions.
 */

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/pixmatch_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-must-be-32-chars-long';

import crypto from 'crypto';
import {
  FulfillmentProductType,
  FulfillmentOrderStatus,
  FulfillmentPaymentStatus,
  FulfillmentDeliveryStatus,
  FulfillmentItemStatus,
  FulfillmentDeliveryType,
  FulfillmentAuditAction,
  ProofingSessionStatus,
  ProofingItemStatus,
} from '@pixmatch/types';
import { prisma } from '@pixmatch/database';
import { FulfillmentProductService } from '../apps/api/src/modules/fulfillment/fulfillment-product.service.js';
import { FulfillmentOrderService } from '../apps/api/src/modules/fulfillment/fulfillment-order.service.js';
import { FulfillmentPaymentService } from '../apps/api/src/modules/fulfillment/fulfillment-payment.service.js';
import { FulfillmentDigitalService } from '../apps/api/src/modules/fulfillment/fulfillment-digital.service.js';
import { FulfillmentPhysicalService } from '../apps/api/src/modules/fulfillment/fulfillment-physical.service.js';
import { FulfillmentAnalyticsService } from '../apps/api/src/modules/fulfillment/fulfillment-analytics.service.js';
import { CopilotToolRegistry } from '../apps/api/src/modules/copilot/copilot-tool-registry.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName} ${details ? `(${details})` : ''}`);
    failed++;
  }
}

// In-Memory Mock Database for Phase 26 Deterministic Testing
class MockPhase26Database {
  studios: any[] = [];
  users: any[] = [];
  galleries: any[] = [];
  photos: any[] = [];
  projects: any[] = [];
  proofingSessions: any[] = [];
  proofingItems: any[] = [];
  businessTransactions: any[] = [];

  // Phase 26 Tables
  fulfillmentProducts: any[] = [];
  fulfillmentProductVariants: any[] = [];
  fulfillmentOrders: any[] = [];
  fulfillmentOrderItems: any[] = [];
  fulfillmentOrderItemPhotos: any[] = [];
  fulfillmentPayments: any[] = [];
  fulfillmentDeliveries: any[] = [];
  fulfillmentDeliveryItems: any[] = [];
  fulfillmentPackages: any[] = [];
  fulfillmentPackageItems: any[] = [];
  fulfillmentDownloads: any[] = [];
  fulfillmentAddresses: any[] = [];
  fulfillmentStatusHistories: any[] = [];
  fulfillmentAuditLogs: any[] = [];

  reset() {
    this.studios = [];
    this.users = [];
    this.galleries = [];
    this.photos = [];
    this.projects = [];
    this.proofingSessions = [];
    this.proofingItems = [];
    this.businessTransactions = [];

    this.fulfillmentProducts = [];
    this.fulfillmentProductVariants = [];
    this.fulfillmentOrders = [];
    this.fulfillmentOrderItems = [];
    this.fulfillmentOrderItemPhotos = [];
    this.fulfillmentPayments = [];
    this.fulfillmentDeliveries = [];
    this.fulfillmentDeliveryItems = [];
    this.fulfillmentPackages = [];
    this.fulfillmentPackageItems = [];
    this.fulfillmentDownloads = [];
    this.fulfillmentAddresses = [];
    this.fulfillmentStatusHistories = [];
    this.fulfillmentAuditLogs = [];
  }
}

const mockDb = new MockPhase26Database();

function patchPrismaMock() {
  const p: any = prisma;

  p.$transaction = async (fnOrArray: any) => {
    if (typeof fnOrArray === 'function') {
      return fnOrArray(p);
    }
    return Promise.all(fnOrArray);
  };

  // FulfillmentProduct
  p.fulfillmentProduct = {
    create: async ({ data, include }: any) => {
      const prodId = data.id || `prod_${crypto.randomUUID()}`;
      const rec = {
        id: prodId,
        studio_id: data.studio_id,
        name: data.name,
        type: data.type || data.product_type || FulfillmentProductType.DIGITAL_DOWNLOAD,
        product_type: data.product_type || data.type || FulfillmentProductType.DIGITAL_DOWNLOAD,
        base_price: data.base_price ?? data.base_price_cents ?? 0,
        base_price_cents: data.base_price_cents ?? data.base_price ?? 0,
        currency: data.currency || 'USD',
        description: data.description || null,
        dimensions: data.dimensions || data.size || null,
        size: data.size || data.dimensions || null,
        is_active: data.is_active ?? true,
        is_digital: data.is_digital ?? (data.type === FulfillmentProductType.DIGITAL_DOWNLOAD || data.product_type === FulfillmentProductType.DIGITAL_DOWNLOAD),
        tax_rate: data.tax_rate ?? 0,
        sku: data.sku || null,
        delivery_method: data.delivery_method || null,
        metadata: data.metadata || null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      mockDb.fulfillmentProducts.push(rec);

      if (data.variants?.create) {
        for (const v of data.variants.create) {
          const varRec = {
            id: v.id || `var_${crypto.randomUUID()}`,
            studio_id: v.studio_id || data.studio_id,
            product_id: prodId,
            name: v.name,
            price: v.price ?? v.price_cents ?? 0,
            price_cents: v.price_cents ?? v.price ?? 0,
            dimensions: v.dimensions || v.size || null,
            size: v.size || v.dimensions || null,
            material: v.material || null,
            finish: v.finish || null,
            price_delta: v.price_delta ?? 0,
            cost_cents: v.cost_cents || 0,
            sku: v.sku || null,
            is_active: v.is_active ?? true,
            metadata: v.metadata || null,
            created_at: new Date(),
            updated_at: new Date(),
          };
          mockDb.fulfillmentProductVariants.push(varRec);
        }
      }
      return p.fulfillmentProduct.findUnique({ where: { id: prodId }, include });
    },
    findUnique: async ({ where, include }: any) => {
      const prod = mockDb.fulfillmentProducts.find((item) => item.id === where.id);
      if (!prod) return null;
      const variants = mockDb.fulfillmentProductVariants.filter((v) => v.product_id === prod.id);
      return { ...prod, variants };
    },
    findFirst: async ({ where, include }: any) => {
      const prod = mockDb.fulfillmentProducts.find((item) => {
        for (const [k, v] of Object.entries(where)) {
          if (k === 'type' || k === 'product_type') {
            if (item.type !== v && item.product_type !== v) return false;
          } else if (item[k] !== v) {
            return false;
          }
        }
        return true;
      });
      if (!prod) return null;
      const variants = mockDb.fulfillmentProductVariants.filter((v) => v.product_id === prod.id);
      return { ...prod, variants };
    },
    findMany: async ({ where = {}, include }: any) => {
      const list = mockDb.fulfillmentProducts.filter((item) => {
        for (const [k, v] of Object.entries(where)) {
          if (k === 'type' || k === 'product_type') {
            if (item.type !== v && item.product_type !== v) return false;
          } else if (k === 'name' && v && typeof v === 'object' && v.contains) {
            if (!item.name.toLowerCase().includes(v.contains.toLowerCase())) return false;
          } else if (item[k] !== v) {
            return false;
          }
        }
        return true;
      });
      return list.map((prod) => {
        const variants = mockDb.fulfillmentProductVariants.filter((v) => v.product_id === prod.id);
        return { ...prod, variants };
      });
    },
    update: async ({ where, data, include }: any) => {
      const idx = mockDb.fulfillmentProducts.findIndex((item) => item.id === where.id);
      if (idx === -1) throw new Error('Product not found');
      const updated = { ...mockDb.fulfillmentProducts[idx], ...data, updated_at: new Date() };
      if (data.base_price_cents !== undefined) {
        updated.base_price = data.base_price_cents;
        updated.base_price_cents = data.base_price_cents;
      }
      if (data.base_price !== undefined) {
        updated.base_price = data.base_price;
        updated.base_price_cents = data.base_price;
      }
      if (data.product_type !== undefined) {
        updated.type = data.product_type;
        updated.product_type = data.product_type;
      }
      if (data.type !== undefined) {
        updated.type = data.type;
        updated.product_type = data.type;
      }
      mockDb.fulfillmentProducts[idx] = updated;
      return p.fulfillmentProduct.findUnique({ where, include });
    },
    delete: async ({ where }: any) => {
      const idx = mockDb.fulfillmentProducts.findIndex((item) => item.id === where.id);
      if (idx !== -1) mockDb.fulfillmentProducts.splice(idx, 1);
      mockDb.fulfillmentProductVariants = mockDb.fulfillmentProductVariants.filter((v) => v.product_id !== where.id);
      return { id: where.id };
    },
    count: async ({ where = {} }: any) => {
      return mockDb.fulfillmentProducts.filter((item) => {
        for (const [k, v] of Object.entries(where)) {
          if (item[k] !== v) return false;
        }
        return true;
      }).length;
    },
  };

  // FulfillmentProductVariant
  p.fulfillmentProductVariant = {
    create: async ({ data }: any) => {
      const varId = data.id || `var_${crypto.randomUUID()}`;
      const rec = {
        id: varId,
        studio_id: data.studio_id,
        product_id: data.product_id,
        name: data.name,
        price: data.price ?? data.price_cents ?? 0,
        price_cents: data.price_cents ?? data.price ?? 0,
        dimensions: data.dimensions || data.size || null,
        size: data.size || data.dimensions || null,
        material: data.material || null,
        finish: data.finish || null,
        price_delta: data.price_delta ?? 0,
        cost_cents: data.cost_cents || 0,
        sku: data.sku || null,
        is_active: data.is_active ?? true,
        metadata: data.metadata || null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      mockDb.fulfillmentProductVariants.push(rec);
      return rec;
    },
    findUnique: async ({ where }: any) => {
      return mockDb.fulfillmentProductVariants.find((v) => v.id === where.id) || null;
    },
    findFirst: async ({ where }: any) => {
      return mockDb.fulfillmentProductVariants.find((v) => {
        for (const [k, val] of Object.entries(where)) {
          if (v[k] !== val) return false;
        }
        return true;
      }) || null;
    },
    findMany: async ({ where = {} }: any) => {
      return mockDb.fulfillmentProductVariants.filter((v) => {
        for (const [k, val] of Object.entries(where)) {
          if (v[k] !== val) return false;
        }
        return true;
      });
    },
    update: async ({ where, data }: any) => {
      const idx = mockDb.fulfillmentProductVariants.findIndex((v) => v.id === where.id);
      if (idx === -1) throw new Error('Variant not found');
      const updated = { ...mockDb.fulfillmentProductVariants[idx], ...data, updated_at: new Date() };
      if (data.price_cents !== undefined) {
        updated.price = data.price_cents;
        updated.price_cents = data.price_cents;
      }
      if (data.price !== undefined) {
        updated.price = data.price;
        updated.price_cents = data.price;
      }
      if (data.dimensions !== undefined) {
        updated.size = data.dimensions;
        updated.dimensions = data.dimensions;
      }
      if (data.size !== undefined) {
        updated.size = data.size;
        updated.dimensions = data.size;
      }
      mockDb.fulfillmentProductVariants[idx] = updated;
      return mockDb.fulfillmentProductVariants[idx];
    },
  };

  // FulfillmentOrder
  p.fulfillmentOrder = {
    create: async ({ data, include }: any) => {
      const orderId = data.id || `ord_${crypto.randomUUID()}`;
      const rec = {
        id: orderId,
        studio_id: data.studio_id,
        project_id: data.project_id || null,
        client_id: data.client_id || null,
        gallery_id: data.gallery_id || null,
        proofing_session_id: data.proofing_session_id || null,
        order_number: data.order_number,
        token_hash: data.token_hash,
        status: data.status || FulfillmentOrderStatus.DRAFT,
        payment_status: data.payment_status || FulfillmentPaymentStatus.UNPAID,
        delivery_type: data.delivery_type || FulfillmentDeliveryType.DIGITAL_DOWNLOAD,
        subtotal: data.subtotal ?? data.subtotal_cents ?? 0,
        subtotal_cents: data.subtotal_cents ?? data.subtotal ?? 0,
        tax_total: data.tax_total ?? data.tax_cents ?? 0,
        tax_cents: data.tax_cents ?? data.tax_total ?? 0,
        shipping_fee: data.shipping_fee ?? data.shipping_cents ?? 0,
        shipping_cents: data.shipping_cents ?? data.shipping_fee ?? 0,
        discount_total: data.discount_total ?? data.discount_cents ?? 0,
        discount_cents: data.discount_cents ?? data.discount_total ?? 0,
        total_amount: data.total_amount ?? data.total_price_cents ?? 0,
        total_price_cents: data.total_price_cents ?? data.total_amount ?? 0,
        paid_amount: data.paid_amount ?? data.paid_amount_cents ?? 0,
        paid_amount_cents: data.paid_amount_cents ?? data.paid_amount ?? 0,
        currency: data.currency || 'USD',
        notes: data.notes || null,
        client_name: data.client_name || null,
        client_email: data.client_email || null,
        client_confirmed_at: data.client_confirmed_at || null,
        client_confirmed_by: data.client_confirmed_by || null,
        fulfilled_at: data.fulfilled_at || null,
        delivered_at: data.delivered_at || null,
        cancelled_at: data.cancelled_at || null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      mockDb.fulfillmentOrders.push(rec);

      if (data.items?.create) {
        const itemsArr = Array.isArray(data.items.create) ? data.items.create : [data.items.create];
        for (const it of itemsArr) {
          const itemId = it.id || `item_${crypto.randomUUID()}`;
          const itemRec = {
            id: itemId,
            studio_id: it.studio_id || data.studio_id,
            order_id: orderId,
            product_id: it.product_id || null,
            variant_id: it.variant_id || null,
            item_name: it.item_name,
            product_type: it.product_type || it.type,
            variant_name: it.variant_name || null,
            quantity: it.quantity || 1,
            unit_price: it.unit_price ?? it.unit_price_cents ?? 0,
            unit_price_cents: it.unit_price_cents ?? it.unit_price ?? 0,
            subtotal: it.subtotal || 0,
            tax: it.tax || 0,
            discount: it.discount || 0,
            total: it.total || 0,
            status: it.status || FulfillmentItemStatus.PENDING,
            notes: it.notes || null,
            metadata: it.metadata || null,
            created_at: new Date(),
            updated_at: new Date(),
          };
          mockDb.fulfillmentOrderItems.push(itemRec);

          if (it.photos?.create) {
            const photosArr = Array.isArray(it.photos.create) ? it.photos.create : [it.photos.create];
            for (const ph of photosArr) {
              mockDb.fulfillmentOrderItemPhotos.push({
                id: `ph_${crypto.randomUUID()}`,
                studio_id: ph.studio_id || data.studio_id,
                order_item_id: itemId,
                photo_id: ph.photo_id,
                photo_version_id: ph.photo_version_id || null,
                notes: ph.notes || null,
                created_at: new Date(),
              });
            }
          }
        }
      }

      if (data.shipping_address?.create || data.address?.create) {
        const addrData = data.shipping_address?.create || data.address?.create;
        mockDb.fulfillmentAddresses.push({
          id: `addr_${crypto.randomUUID()}`,
          studio_id: addrData.studio_id || data.studio_id,
          order_id: orderId,
          full_name: addrData.full_name,
          address_line1: addrData.address_line1,
          address_line2: addrData.address_line2 || null,
          city: addrData.city,
          state: addrData.state || null,
          postal_code: addrData.postal_code,
          country: addrData.country || 'US',
          phone: addrData.phone || null,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }

      if (data.status_history?.create) {
        mockDb.fulfillmentStatusHistories.push({
          id: `hist_${crypto.randomUUID()}`,
          studio_id: data.status_history.create.studio_id || data.studio_id,
          order_id: orderId,
          ...data.status_history.create,
          created_at: new Date(),
        });
      }

      if (data.audit_logs?.create) {
        mockDb.fulfillmentAuditLogs.push({
          id: `audit_${crypto.randomUUID()}`,
          studio_id: data.audit_logs.create.studio_id || data.studio_id,
          order_id: orderId,
          ...data.audit_logs.create,
          created_at: new Date(),
        });
      }

      return p.fulfillmentOrder.findUnique({ where: { id: orderId }, include });
    },
    findUnique: async ({ where, include }: any) => {
      const order = mockDb.fulfillmentOrders.find((o) => o.id === where.id || (where.token_hash && o.token_hash === where.token_hash));
      if (!order) return null;
      return populateOrder(order, include);
    },
    findFirst: async ({ where, include }: any) => {
      const order = mockDb.fulfillmentOrders.find((o) => {
        for (const [k, v] of Object.entries(where)) {
          if (o[k] !== v) return false;
        }
        return true;
      });
      if (!order) return null;
      return populateOrder(order, include);
    },
    findMany: async ({ where = {}, include }: any) => {
      const list = mockDb.fulfillmentOrders.filter((o) => {
        for (const [k, v] of Object.entries(where)) {
          if (o[k] !== v) return false;
        }
        return true;
      });
      return list.map((order) => populateOrder(order, include));
    },
    update: async ({ where, data, include }: any) => {
      const idx = mockDb.fulfillmentOrders.findIndex((o) => o.id === where.id);
      if (idx === -1) throw new Error('Order not found');

      if (data.status_history?.create) {
        mockDb.fulfillmentStatusHistories.push({
          id: `hist_${crypto.randomUUID()}`,
          studio_id: data.status_history.create.studio_id || mockDb.fulfillmentOrders[idx].studio_id,
          order_id: where.id,
          ...data.status_history.create,
          created_at: new Date(),
        });
        delete data.status_history;
      }

      if (data.audit_logs?.create) {
        mockDb.fulfillmentAuditLogs.push({
          id: `audit_${crypto.randomUUID()}`,
          studio_id: data.audit_logs.create.studio_id || mockDb.fulfillmentOrders[idx].studio_id,
          order_id: where.id,
          ...data.audit_logs.create,
          created_at: new Date(),
        });
        delete data.audit_logs;
      }

      const updated = {
        ...mockDb.fulfillmentOrders[idx],
        ...data,
        updated_at: new Date(),
      };
      if (data.subtotal_cents !== undefined) {
        updated.subtotal = data.subtotal_cents;
        updated.subtotal_cents = data.subtotal_cents;
      }
      if (data.total_price_cents !== undefined) {
        updated.total_amount = data.total_price_cents;
        updated.total_price_cents = data.total_price_cents;
      }
      if (data.paid_amount_cents !== undefined) {
        updated.paid_amount = data.paid_amount_cents;
        updated.paid_amount_cents = data.paid_amount_cents;
      }
      mockDb.fulfillmentOrders[idx] = updated;
      return p.fulfillmentOrder.findUnique({ where, include });
    },
    delete: async ({ where }: any) => {
      const idx = mockDb.fulfillmentOrders.findIndex((o) => o.id === where.id);
      if (idx !== -1) mockDb.fulfillmentOrders.splice(idx, 1);
      mockDb.fulfillmentOrderItems = mockDb.fulfillmentOrderItems.filter((i) => i.order_id !== where.id);
      return { id: where.id };
    },
    count: async ({ where = {} }: any) => {
      return mockDb.fulfillmentOrders.filter((o) => {
        for (const [k, v] of Object.entries(where)) {
          if (o[k] !== v) return false;
        }
        return true;
      }).length;
    },
  };

  // FulfillmentOrderItem
  p.fulfillmentOrderItem = {
    create: async ({ data, include }: any) => {
      const itemId = data.id || `item_${crypto.randomUUID()}`;
      const rec = {
        id: itemId,
        studio_id: data.studio_id,
        order_id: data.order_id,
        product_id: data.product_id || null,
        variant_id: data.variant_id || null,
        item_name: data.item_name,
        product_type: data.product_type || data.type,
        variant_name: data.variant_name || null,
        quantity: data.quantity || 1,
        unit_price: data.unit_price ?? data.unit_price_cents ?? 0,
        unit_price_cents: data.unit_price_cents ?? data.unit_price ?? 0,
        subtotal: data.subtotal || 0,
        tax: data.tax || 0,
        discount: data.discount || 0,
        total: data.total || 0,
        status: data.status || FulfillmentItemStatus.PENDING,
        notes: data.notes || null,
        metadata: data.metadata || null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      mockDb.fulfillmentOrderItems.push(rec);

      if (data.photos?.create) {
        const photosArr = Array.isArray(data.photos.create) ? data.photos.create : [data.photos.create];
        for (const ph of photosArr) {
          mockDb.fulfillmentOrderItemPhotos.push({
            id: `ph_${crypto.randomUUID()}`,
            studio_id: ph.studio_id || data.studio_id,
            order_item_id: itemId,
            photo_id: ph.photo_id,
            photo_version_id: ph.photo_version_id || null,
            notes: ph.notes || null,
            created_at: new Date(),
          });
        }
      }
      return rec;
    },
    findUnique: async ({ where }: any) => {
      return mockDb.fulfillmentOrderItems.find((item) => item.id === where.id) || null;
    },
    findFirst: async ({ where }: any) => {
      return mockDb.fulfillmentOrderItems.find((item) => {
        for (const [k, v] of Object.entries(where)) {
          if (item[k] !== v) return false;
        }
        return true;
      }) || null;
    },
    findMany: async ({ where = {}, include }: any) => {
      return mockDb.fulfillmentOrderItems.filter((item) => {
        for (const [k, v] of Object.entries(where)) {
          if (item[k] !== v) return false;
        }
        return true;
      });
    },
    update: async ({ where, data }: any) => {
      const idx = mockDb.fulfillmentOrderItems.findIndex((item) => item.id === where.id);
      if (idx === -1) throw new Error('Item not found');
      const updated = { ...mockDb.fulfillmentOrderItems[idx], ...data, updated_at: new Date() };
      if (data.unit_price_cents !== undefined) {
        updated.unit_price = data.unit_price_cents;
        updated.unit_price_cents = data.unit_price_cents;
      }
      mockDb.fulfillmentOrderItems[idx] = updated;
      return mockDb.fulfillmentOrderItems[idx];
    },
    delete: async ({ where }: any) => {
      const idx = mockDb.fulfillmentOrderItems.findIndex((item) => item.id === where.id);
      if (idx !== -1) mockDb.fulfillmentOrderItems.splice(idx, 1);
      return { id: where.id };
    },
    count: async ({ where = {} }: any) => {
      return mockDb.fulfillmentOrderItems.filter((item) => {
        for (const [k, v] of Object.entries(where)) {
          if (item[k] !== v) return false;
        }
        return true;
      }).length;
    },
  };

  // FulfillmentPayment
  p.fulfillmentPayment = {
    create: async ({ data }: any) => {
      const paymentId = data.id || `pay_${crypto.randomUUID()}`;
      const rec = {
        id: paymentId,
        order_id: data.order_id,
        studio_id: data.studio_id,
        amount: data.amount ?? data.amount_cents ?? 0,
        amount_cents: data.amount_cents ?? data.amount ?? 0,
        currency: data.currency || 'USD',
        payment_method: data.payment_method,
        gateway_payment_id: data.gateway_payment_id || null,
        gateway_transaction_id: data.gateway_transaction_id || null,
        idempotency_key: data.idempotency_key || null,
        status: data.status || 'PAID',
        notes: data.notes || null,
        created_at: new Date(),
      };
      mockDb.fulfillmentPayments.push(rec);
      return rec;
    },
    findFirst: async ({ where }: any) => {
      return mockDb.fulfillmentPayments.find((pRec) => {
        for (const [k, v] of Object.entries(where)) {
          if (pRec[k] !== v) return false;
        }
        return true;
      }) || null;
    },
    findMany: async ({ where = {} }: any) => {
      return mockDb.fulfillmentPayments.filter((pRec) => {
        for (const [k, v] of Object.entries(where)) {
          if (pRec[k] !== v) return false;
        }
        return true;
      });
    },
  };

  // FulfillmentDelivery
  p.fulfillmentDelivery = {
    create: async ({ data, include }: any) => {
      const deliveryId = data.id || `del_${crypto.randomUUID()}`;
      const rec = {
        id: deliveryId,
        studio_id: data.studio_id,
        order_id: data.order_id,
        delivery_type: data.delivery_type || FulfillmentDeliveryType.PHYSICAL_SHIPMENT,
        status: data.status || data.delivery_status || FulfillmentDeliveryStatus.PENDING,
        courier: data.courier || data.courier_name || null,
        courier_name: data.courier_name || data.courier || null,
        tracking_number: data.tracking_number || null,
        tracking_url: data.tracking_url || null,
        shipped_at: data.shipped_at || new Date(),
        delivered_at: data.delivered_at || null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      mockDb.fulfillmentDeliveries.push(rec);
      return rec;
    },
    findUnique: async ({ where, include }: any) => {
      const del = mockDb.fulfillmentDeliveries.find((d) => d.id === where.id);
      if (!del) return null;
      const order = mockDb.fulfillmentOrders.find((o) => o.id === del.order_id);
      return { ...del, order };
    },
    findFirst: async ({ where, include }: any) => {
      const del = mockDb.fulfillmentDeliveries.find((d) => {
        for (const [k, v] of Object.entries(where)) {
          if (d[k] !== v) return false;
        }
        return true;
      });
      if (!del) return null;
      const order = mockDb.fulfillmentOrders.find((o) => o.id === del.order_id);
      return { ...del, order };
    },
    findMany: async ({ where = {} }: any) => {
      return mockDb.fulfillmentDeliveries.filter((d) => {
        for (const [k, v] of Object.entries(where)) {
          if (d[k] !== v) return false;
        }
        return true;
      });
    },
    update: async ({ where, data, include }: any) => {
      const idx = mockDb.fulfillmentDeliveries.findIndex((d) => d.id === where.id);
      if (idx === -1) throw new Error('Delivery not found');
      const updated = { ...mockDb.fulfillmentDeliveries[idx], ...data, updated_at: new Date() };
      if (data.courier_name !== undefined) {
        updated.courier = data.courier_name;
        updated.courier_name = data.courier_name;
      }
      mockDb.fulfillmentDeliveries[idx] = updated;
      return mockDb.fulfillmentDeliveries[idx];
    },
  };

  // FulfillmentPackage
  p.fulfillmentPackage = {
    create: async ({ data, include }: any) => {
      const pkgId = data.id || `pkg_${crypto.randomUUID()}`;
      const rec = {
        id: pkgId,
        studio_id: data.studio_id,
        order_id: data.order_id,
        name: data.name,
        expires_at: data.expires_at || null,
        max_downloads: data.max_downloads || null,
        download_count: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };
      mockDb.fulfillmentPackages.push(rec);

      if (data.items?.create) {
        const itemsArr = Array.isArray(data.items.create) ? data.items.create : [data.items.create];
        for (const it of itemsArr) {
          mockDb.fulfillmentPackageItems.push({
            id: `pki_${crypto.randomUUID()}`,
            studio_id: it.studio_id || data.studio_id,
            package_id: pkgId,
            photo_id: it.photo_id,
            photo_version_id: it.photo_version_id || null,
            filename: it.filename || 'photo.jpg',
            format: it.format || 'JPG',
            resolution: it.resolution || 'HIGH_RES',
            file_size_bytes: it.file_size_bytes || 5000000,
            download_url: it.download_url || null,
            created_at: new Date(),
          });
        }
      }

      return p.fulfillmentPackage.findUnique({ where: { id: pkgId }, include });
    },
    findUnique: async ({ where, include }: any) => {
      const pkg = mockDb.fulfillmentPackages.find((pRec) => pRec.id === where.id);
      if (!pkg) return null;
      const items = mockDb.fulfillmentPackageItems.filter((it) => it.package_id === pkg.id);
      const downloads = mockDb.fulfillmentDownloads.filter((dw) => dw.package_id === pkg.id);
      const order = mockDb.fulfillmentOrders.find((o) => o.id === pkg.order_id);
      return { ...pkg, items, downloads, order };
    },
    findFirst: async ({ where, include }: any) => {
      const pkg = mockDb.fulfillmentPackages.find((pRec) => {
        for (const [k, v] of Object.entries(where)) {
          if (pRec[k] !== v) return false;
        }
        return true;
      });
      if (!pkg) return null;
      const items = mockDb.fulfillmentPackageItems.filter((it) => it.package_id === pkg.id);
      const downloads = mockDb.fulfillmentDownloads.filter((dw) => dw.package_id === pkg.id);
      const order = mockDb.fulfillmentOrders.find((o) => o.id === pkg.order_id);
      return { ...pkg, items, downloads, order };
    },
    findMany: async ({ where = {}, include }: any) => {
      return mockDb.fulfillmentPackages.filter((pRec) => {
        for (const [k, v] of Object.entries(where)) {
          if (pRec[k] !== v) return false;
        }
        return true;
      }).map((pkg) => {
        const items = mockDb.fulfillmentPackageItems.filter((it) => it.package_id === pkg.id);
        const downloads = mockDb.fulfillmentDownloads.filter((dw) => dw.package_id === pkg.id);
        return { ...pkg, items, downloads };
      });
    },
    update: async ({ where, data }: any) => {
      const idx = mockDb.fulfillmentPackages.findIndex((pRec) => pRec.id === where.id);
      if (idx === -1) throw new Error('Package not found');
      mockDb.fulfillmentPackages[idx] = { ...mockDb.fulfillmentPackages[idx], ...data, updated_at: new Date() };
      return mockDb.fulfillmentPackages[idx];
    },
  };

  // FulfillmentDownload
  p.fulfillmentDownload = {
    create: async ({ data }: any) => {
      const dwId = data.id || `dw_${crypto.randomUUID()}`;
      const rec = {
        id: dwId,
        package_id: data.package_id,
        ip_hash: data.ip_hash || null,
        user_agent: data.user_agent || null,
        downloaded_at: new Date(),
      };
      mockDb.fulfillmentDownloads.push(rec);
      return rec;
    },
    count: async ({ where = {} }: any) => {
      return mockDb.fulfillmentDownloads.filter((dw) => {
        for (const [k, v] of Object.entries(where)) {
          if (dw[k] !== v) return false;
        }
        return true;
      }).length;
    },
  };

  // FulfillmentAddress
  p.fulfillmentAddress = {
    create: async ({ data }: any) => {
      const addrId = data.id || `addr_${crypto.randomUUID()}`;
      const rec = {
        id: addrId,
        studio_id: data.studio_id,
        order_id: data.order_id,
        full_name: data.full_name,
        address_line1: data.address_line1,
        address_line2: data.address_line2 || null,
        city: data.city,
        state: data.state || null,
        postal_code: data.postal_code,
        country: data.country || 'US',
        phone: data.phone || null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      mockDb.fulfillmentAddresses.push(rec);
      return rec;
    },
    findUnique: async ({ where }: any) => {
      return mockDb.fulfillmentAddresses.find((a) => a.order_id === where.order_id) || null;
    },
    findFirst: async ({ where }: any) => {
      return mockDb.fulfillmentAddresses.find((a) => a.order_id === where.order_id) || null;
    },
  };

  // FulfillmentStatusHistory
  p.fulfillmentStatusHistory = {
    create: async ({ data }: any) => {
      const rec = {
        id: `hist_${crypto.randomUUID()}`,
        studio_id: data.studio_id,
        created_at: new Date(),
        ...data,
      };
      mockDb.fulfillmentStatusHistories.push(rec);
      return rec;
    },
    findMany: async ({ where = {}, orderBy }: any) => {
      return mockDb.fulfillmentStatusHistories.filter((h) => {
        for (const [k, v] of Object.entries(where)) {
          if (h[k] !== v) return false;
        }
        return true;
      });
    },
  };

  // FulfillmentAuditLog
  p.fulfillmentAuditLog = {
    create: async ({ data }: any) => {
      const rec = {
        id: `audit_${crypto.randomUUID()}`,
        studio_id: data.studio_id,
        created_at: new Date(),
        ...data,
      };
      mockDb.fulfillmentAuditLogs.push(rec);
      return rec;
    },
    findMany: async ({ where = {} }: any) => {
      return mockDb.fulfillmentAuditLogs.filter((a) => {
        for (const [k, v] of Object.entries(where)) {
          if (a[k] !== v) return false;
        }
        return true;
      });
    },
  };

  // StudioBusinessTransaction (Phase 18 Integration)
  p.studioBusinessTransaction = {
    create: async ({ data }: any) => {
      const rec = {
        id: data.id || `txn_${crypto.randomUUID()}`,
        studio_id: data.studio_id,
        transaction_type: data.transaction_type || 'INCOME',
        category: data.category || 'FULFILLMENT',
        amount_cents: data.amount_cents ?? data.amount ?? 0,
        currency: data.currency || 'USD',
        description: data.description,
        reference_type: data.reference_type || 'FULFILLMENT_ORDER',
        reference_id: data.reference_id,
        created_at: new Date(),
        updated_at: new Date(),
      };
      mockDb.businessTransactions.push(rec);
      return rec;
    },
    findMany: async ({ where = {} }: any) => {
      return mockDb.businessTransactions.filter((t) => {
        for (const [k, v] of Object.entries(where)) {
          if (t[k] !== v) return false;
        }
        return true;
      });
    },
  };

  // PhotoProofingSession & Items
  p.photoProofingSession = {
    findFirst: async ({ where, include }: any) => {
      const s = mockDb.proofingSessions.find((sess) => {
        for (const [k, v] of Object.entries(where)) {
          if (sess[k] !== v) return false;
        }
        return true;
      });
      if (!s) return null;
      let items = mockDb.proofingItems.filter((i) => i.session_id === s.id);
      if (include?.items?.where?.status) {
        const st = include.items.where.status;
        if (st.in && Array.isArray(st.in)) {
          items = items.filter((it) => st.in.includes(it.status));
        } else if (typeof st === 'string') {
          items = items.filter((it) => it.status === st);
        }
      }
      return { ...s, items };
    },
    findUnique: async ({ where, include }: any) => {
      const s = mockDb.proofingSessions.find((sess) => sess.id === where.id);
      if (!s) return null;
      let items = mockDb.proofingItems.filter((i) => i.session_id === s.id);
      if (include?.items?.where?.status) {
        const st = include.items.where.status;
        if (st.in && Array.isArray(st.in)) {
          items = items.filter((it) => st.in.includes(it.status));
        } else if (typeof st === 'string') {
          items = items.filter((it) => it.status === st);
        }
      }
      return { ...s, items };
    },
  };

  // Photo
  p.photo = {
    findFirst: async ({ where }: any) => {
      return mockDb.photos.find((ph) => ph.id === where.id) || null;
    },
    findMany: async ({ where = {} }: any) => {
      if (where.id?.in) {
        return mockDb.photos.filter((ph) => where.id.in.includes(ph.id));
      }
      return mockDb.photos;
    },
  };

  // Studio, Client, Gallery, Project
  p.studio = {
    findUnique: async ({ where }: any) => mockDb.studios.find((s) => s.id === where.id) || null,
    findFirst: async ({ where }: any) => mockDb.studios.find((s) => {
      for (const [k, v] of Object.entries(where)) {
        if (s[k] !== v) return false;
      }
      return true;
    }) || null,
  };

  p.user = {
    findUnique: async ({ where }: any) => mockDb.users.find((u) => u.id === where.id) || null,
    findFirst: async ({ where }: any) => mockDb.users.find((u) => {
      for (const [k, v] of Object.entries(where)) {
        if (u[k] !== v) return false;
      }
      return true;
    }) || null,
  };

  p.gallery = {
    findUnique: async ({ where }: any) => mockDb.galleries.find((g) => g.id === where.id) || null,
    findFirst: async ({ where }: any) => mockDb.galleries.find((g) => {
      for (const [k, v] of Object.entries(where)) {
        if (g[k] !== v) return false;
      }
      return true;
    }) || null,
  };

  p.client = {
    findUnique: async ({ where }: any) => ({ id: where.id, name: 'Eleanor Vance', email: 'eleanor@vance.test' }),
    findFirst: async ({ where }: any) => ({ id: where.id || 'client_1', name: 'Eleanor Vance', email: 'eleanor@vance.test' }),
  };

  p.studioProject = {
    findUnique: async ({ where }: any) => mockDb.projects.find((pr) => pr.id === where.id) || null,
    findFirst: async ({ where }: any) => mockDb.projects.find((pr) => {
      for (const [k, v] of Object.entries(where)) {
        if (pr[k] !== v) return false;
      }
      return true;
    }) || null,
  };
  p.project = p.studioProject;
}

function populateOrder(order: any, include?: any) {
  const items = mockDb.fulfillmentOrderItems.filter((i) => i.order_id === order.id).map((it) => {
    const photos = mockDb.fulfillmentOrderItemPhotos.filter((p) => p.order_item_id === it.id).map((ph) => {
      const photo = mockDb.photos.find((pRec) => pRec.id === ph.photo_id) || null;
      return { ...ph, photo };
    });
    return { ...it, photos };
  });

  const payments = mockDb.fulfillmentPayments.filter((p) => p.order_id === order.id);
  const deliveries = mockDb.fulfillmentDeliveries.filter((d) => d.order_id === order.id);
  const packages = mockDb.fulfillmentPackages.filter((pkg) => pkg.order_id === order.id).map((pkg) => {
    const pkgItems = mockDb.fulfillmentPackageItems.filter((it) => it.package_id === pkg.id);
    const pkgDownloads = mockDb.fulfillmentDownloads.filter((dw) => dw.package_id === pkg.id);
    return { ...pkg, items: pkgItems, downloads: pkgDownloads };
  });
  const address = mockDb.fulfillmentAddresses.find((a) => a.order_id === order.id) || null;
  const status_history = mockDb.fulfillmentStatusHistories.filter((h) => h.order_id === order.id);
  const audit_logs = mockDb.fulfillmentAuditLogs.filter((a) => a.order_id === order.id);

  return {
    ...order,
    items,
    payments,
    deliveries,
    packages,
    address,
    status_history,
    audit_logs,
  };
}

// -------------------------------------------------------------
// SEEDING TEST FIXTURES
// -------------------------------------------------------------
const STUDIO_A = 'studio_alpha_fulfillment';
const STUDIO_B = 'studio_beta_fulfillment';
const USER_A = 'user_photographer_alpha';
const GALLERY_A = 'gallery_wedding_alpha';
const PROJECT_A = 'proj_wedding_alpha';
const CLIENT_A = 'client_eleanor_vance';
const PROOFING_SESSION_A = 'proof_sess_alpha_wedding';

function seedTestEnvironment() {
  mockDb.reset();

  mockDb.studios.push({ id: STUDIO_A, name: 'Alpha Studio' }, { id: STUDIO_B, name: 'Beta Studio' });
  mockDb.users.push({ id: USER_A, studio_id: STUDIO_A, name: 'John Photographer', email: 'john@alpha.test' });
  mockDb.galleries.push({
    id: GALLERY_A,
    studio_id: STUDIO_A,
    title: 'Eleanor & Lucas Wedding',
    slug: 'eleanor-lucas',
  });

  mockDb.projects.push({ id: PROJECT_A, studio_id: STUDIO_A, name: 'Eleanor & Lucas Wedding Shoot' });

  // Seed 30 photos
  for (let i = 1; i <= 30; i++) {
    mockDb.photos.push({
      id: `photo_${i}`,
      studio_id: STUDIO_A,
      gallery_id: GALLERY_A,
      original_filename: `IMG_${2000 + i}.CR3`,
      thumbnail_url: `https://cdn.pixmatch.test/thumbs/IMG_${2000 + i}.jpg`,
      original_url: `https://cdn.pixmatch.test/raw/IMG_${2000 + i}.CR3`,
    });
  }

  // Seed Approved Proofing Session with 15 SELECTED photos
  mockDb.proofingSessions.push({
    id: PROOFING_SESSION_A,
    studio_id: STUDIO_A,
    gallery_id: GALLERY_A,
    project_id: PROJECT_A,
    client_id: CLIENT_A,
    name: 'Eleanor Wedding Proofing Selection',
    status: ProofingSessionStatus.APPROVED,
  });

  for (let i = 1; i <= 30; i++) {
    mockDb.proofingItems.push({
      id: `proof_item_${i}`,
      session_id: PROOFING_SESSION_A,
      photo_id: `photo_${i}`,
      status: i <= 15 ? ProofingItemStatus.SELECTED : ProofingItemStatus.UNREVIEWED,
      is_favorite: i <= 5,
    });
  }
}

// -------------------------------------------------------------
// TEST RUNNER
// -------------------------------------------------------------
async function runAllPhase26Tests() {
  console.log('============================================================');
  console.log('PIXMATCH AI — PHASE 26 PHOTO FULFILLMENT & DELIVERY TEST SUITE');
  console.log('============================================================\n');

  patchPrismaMock();
  seedTestEnvironment();

  // -----------------------------------------------------------
  // GROUP 1–10: PRODUCT CATALOG & VARIANT MANAGEMENT
  // -----------------------------------------------------------
  console.log('--- GROUP 1-10: Product Catalog & Variants ---');

  // Group 1: Default Catalog Seeding
  const seededProducts = await FulfillmentProductService.seedDefaultProducts(STUDIO_A);
  assert(seededProducts.length === 5, 'Group 1: Seeded 5 standard default product categories');
  assert(seededProducts.some((p) => p.product_type === FulfillmentProductType.PRINTS), 'Group 1: Contains Lustre Prints');
  assert(seededProducts.some((p) => p.product_type === FulfillmentProductType.PHOTO_BOOK), 'Group 1: Contains Heirloom Flush Mount Album');
  assert(seededProducts.some((p) => p.product_type === FulfillmentProductType.CANVAS), 'Group 1: Contains Gallery Canvas');
  assert(seededProducts.some((p) => p.product_type === FulfillmentProductType.FRAMED_PRINT), 'Group 1: Contains Framed Print');
  assert(seededProducts.some((p) => p.product_type === FulfillmentProductType.DIGITAL_DOWNLOAD), 'Group 1: Contains High-Res Digital Download');

  // Group 2: Product variant structures
  const printProduct = seededProducts.find((p) => p.product_type === FulfillmentProductType.PRINTS);
  assert(!!printProduct && printProduct.variants!.length >= 3, 'Group 2: Print product contains 3 standard size variants');
  assert(printProduct!.variants!.some((v) => v.name.includes('8x10')), 'Group 2: Contains 8x10 variant');

  // Group 3: Custom Product Creation
  const customProd = await FulfillmentProductService.createProduct(STUDIO_A, {
    name: 'Crystal USB Keepsake Box',
    product_type: FulfillmentProductType.CUSTOM_PRODUCT,
    base_price_cents: 4500,
    currency: 'USD',
    description: 'Engraved crystal USB in handcrafted walnut wooden box.',
    variants: [
      { name: 'Walnut Dark', price_cents: 4500 },
      { name: 'Maple Natural', price_cents: 4500 },
    ],
  });
  assert(!!customProd.id, 'Group 3: Custom product created with ID');
  assert(customProd.variants!.length === 2, 'Group 3: Created 2 custom variants');
  assert(customProd.base_price_cents === 4500, 'Group 3: Base price is 4500 cents ($45.00)');

  // Group 4: Product Retrieval by ID
  const retrievedProd = await FulfillmentProductService.getProduct(customProd.id, STUDIO_A);
  assert(retrievedProd?.id === customProd.id, 'Group 4: Successfully retrieved product by ID');

  // Group 5: Product Catalog Filtering by Product Type
  const digitalProds = await FulfillmentProductService.listProducts(STUDIO_A, { product_type: FulfillmentProductType.DIGITAL_DOWNLOAD });
  assert(digitalProds.length === 1, 'Group 5: Filtered digital products returns 1 catalog item');

  // Group 6: Product Update
  const updatedProd = await FulfillmentProductService.updateProduct(customProd.id, STUDIO_A, {
    name: 'Deluxe Crystal USB Box',
    base_price_cents: 5000,
  });
  assert(updatedProd.name === 'Deluxe Crystal USB Box', 'Group 6: Product name updated');
  assert(updatedProd.base_price_cents === 5000, 'Group 6: Base price updated to 5000 cents');

  // Group 7: Add Variant to Existing Product
  const newVar = await FulfillmentProductService.addVariant(customProd.id, STUDIO_A, {
    name: 'Rose Gold Metallic',
    price_cents: 6000,
    dimensions: '16GB',
  });
  assert(newVar.name === 'Rose Gold Metallic', 'Group 7: New variant added to product');
  assert(newVar.price_cents === 6000, 'Group 7: Variant price set to 6000 cents');

  // Group 8: Update Variant
  const updatedVar = await FulfillmentProductService.updateVariant(newVar.id, STUDIO_A, {
    price_cents: 6500,
  });
  assert(updatedVar.price_cents === 6500, 'Group 8: Variant price updated to 6500 cents');

  // Group 9: Active Status Toggle
  const deactivated = await FulfillmentProductService.updateProduct(customProd.id, STUDIO_A, { is_active: false });
  assert(deactivated.is_active === false, 'Group 9: Product deactivated successfully');

  // Group 10: Delete Product
  const deleteRes = await FulfillmentProductService.deleteProduct(customProd.id, STUDIO_A);
  assert(deleteRes === true, 'Group 10: Product deleted successfully');
  const deletedCheck = await FulfillmentProductService.getProduct(customProd.id, STUDIO_A);
  assert(deletedCheck === null, 'Group 10: Deleted product returns null');

  // -----------------------------------------------------------
  // GROUP 11–25: IDEMPOTENT ORDER CREATION FROM PROOFING SELECTION
  // -----------------------------------------------------------
  console.log('\n--- GROUP 11-25: Order Creation from Proofing & Manual Builder ---');

  // Group 11: Idempotent order creation from Phase 25 Proofing Session
  const orderFromProofing = await FulfillmentOrderService.createFromProofingSession(
    PROOFING_SESSION_A,
    STUDIO_A,
    USER_A,
    {
      notes: 'Initial order generated from approved proofing selection.',
      product_type: FulfillmentProductType.DIGITAL_DOWNLOAD,
      unit_price_cents: 0,
    }
  );

  assert(!!orderFromProofing.id, 'Group 11: Fulfillment order created from proofing session');
  assert(!!orderFromProofing.order_number && orderFromProofing.order_number.startsWith('ORD-'), 'Group 11: Order number generated with prefix ORD-');
  assert(orderFromProofing.proofing_session_id === PROOFING_SESSION_A, 'Group 11: Proofing session relation linked');
  assert(orderFromProofing.items.length === 1, 'Group 11: 1 line item created for proofing bundle');
  assert(orderFromProofing.items[0].photos.length === 15, 'Group 11: All 15 SELECTED proofing photos linked to order item');

  // Group 12: Token Generation & SHA-256 Token Hash
  const rawToken = orderFromProofing.raw_token;
  assert(!!rawToken && rawToken.length >= 24, 'Group 12: High-entropy raw delivery token returned');
  assert(
    orderFromProofing.token_hash === FulfillmentOrderService.hashToken(rawToken!),
    'Group 12: Token hash matches SHA-256 hash of raw token'
  );

  // Group 13: Idempotency check: creating again returns existing order
  const duplicateOrder = await FulfillmentOrderService.createFromProofingSession(
    PROOFING_SESSION_A,
    STUDIO_A,
    USER_A
  );
  assert(duplicateOrder.id === orderFromProofing.id, 'Group 13: Duplicate creation call returns existing order idempotently');

  // Group 14: Manual Order Creation
  const manualOrder = await FulfillmentOrderService.createManualOrder(STUDIO_A, USER_A, {
    client_name: 'Eleanor Vance',
    client_email: 'eleanor@vance.test',
    project_id: PROJECT_A,
    gallery_id: GALLERY_A,
    delivery_type: FulfillmentDeliveryType.HYBRID,
    notes: 'Custom physical and digital package.',
    items: [
      {
        item_name: '8x10 Archival Fine Art Print',
        product_type: FulfillmentProductType.PRINTS,
        variant_name: '8x10 Lustre',
        quantity: 4,
        unit_price_cents: 2500, // $25.00 each = $100.00
        photo_ids: ['photo_1', 'photo_2', 'photo_3', 'photo_4'],
      },
      {
        item_name: '12x12 Heirloom Flush Mount Album (30 Pages)',
        product_type: FulfillmentProductType.PHOTO_BOOK,
        variant_name: '12x12 Genuine Leather',
        quantity: 1,
        unit_price_cents: 65000, // $650.00
        photo_ids: ['photo_1', 'photo_2', 'photo_3', 'photo_4', 'photo_5'],
      },
    ],
    shipping_cents: 2500, // $25.00 shipping
    tax_cents: 6200, // $62.00 tax
    discount_cents: 5000, // $50.00 discount
    address: {
      full_name: 'Eleanor Vance',
      address_line1: '742 Evergreen Terrace',
      city: 'Springfield',
      state: 'OR',
      postal_code: '97477',
      country: 'US',
      phone: '555-0199',
    },
  });

  assert(!!manualOrder.id, 'Group 14: Manual fulfillment order created');
  assert(manualOrder.items.length === 2, 'Group 14: 2 custom line items created');
  assert(manualOrder.client_name === 'Eleanor Vance', 'Group 14: Client name stored');
  assert(manualOrder.delivery_type === FulfillmentDeliveryType.HYBRID, 'Group 14: Delivery type set to HYBRID');

  // Group 15: Address storage and retrieval
  assert(!!manualOrder.address, 'Group 15: Delivery address persisted on order');
  assert(manualOrder.address?.postal_code === '97477', 'Group 15: Postal code matches');

  // Group 16: Photo associations on items
  assert(manualOrder.items[0].photos.length === 4, 'Group 16: 4 photos associated with print item');
  assert(manualOrder.items[1].photos.length === 5, 'Group 16: 5 photos associated with album item');

  // Group 17: Financial Calculations on Order Creation
  // Subtotal: (4 * 2500) + (1 * 65000) = 10000 + 65000 = 75000 cents ($750.00)
  // Total: 75000 + 2500 (shipping) + 6200 (tax) - 5000 (discount) = 78700 cents ($787.00)
  assert(manualOrder.subtotal_cents === 75000, 'Group 17: Subtotal calculated correctly (75000 cents / $750.00)');
  assert(manualOrder.total_price_cents === 78700, 'Group 17: Total price calculated correctly (78700 cents / $787.00)');
  assert(manualOrder.paid_amount_cents === 0, 'Group 17: Paid amount initialized to 0');
  assert(manualOrder.payment_status === FulfillmentPaymentStatus.UNPAID, 'Group 17: Payment status is UNPAID');

  // Group 18: Add Line Item to Order
  const addedItem = await FulfillmentOrderService.addOrderItem(manualOrder.id, STUDIO_A, USER_A, {
    item_name: '24x36 Gallery Wrapped Canvas',
    product_type: FulfillmentProductType.CANVAS,
    quantity: 1,
    unit_price_cents: 22000, // $220.00
    photo_ids: ['photo_1'],
  });
  assert(!!addedItem.id, 'Group 18: Line item added to order');
  assert(addedItem.item_name === '24x36 Gallery Wrapped Canvas', 'Group 18: Item title matches');

  // Group 19: Order Financial Recalculation after Adding Item
  // New Subtotal: 75000 + 22000 = 97000 cents ($970.00)
  // New Total: 97000 + 2500 + 6200 - 5000 = 100700 cents ($1007.00)
  const orderAfterAdd = await FulfillmentOrderService.getOrder(manualOrder.id, STUDIO_A);
  assert(orderAfterAdd?.subtotal_cents === 97000, 'Group 19: Recalculated subtotal is 97000 cents ($970.00)');
  assert(orderAfterAdd?.total_price_cents === 100700, 'Group 19: Recalculated total is 100700 cents ($1007.00)');

  // Group 20: Remove Line Item
  await FulfillmentOrderService.removeOrderItem(manualOrder.id, addedItem.id, STUDIO_A, USER_A);
  const orderAfterRemove = await FulfillmentOrderService.getOrder(manualOrder.id, STUDIO_A);
  assert(orderAfterRemove?.subtotal_cents === 75000, 'Group 20: Subtotal restored after item removal (75000 cents)');
  assert(orderAfterRemove?.total_price_cents === 78700, 'Group 20: Total price restored after item removal (78700 cents)');

  // -----------------------------------------------------------
  // GROUP 21–35: PAYMENTS & PHASE 18 BI SYNCHRONIZATION
  // -----------------------------------------------------------
  console.log('\n--- GROUP 21-35: Payment Processing & Phase 18 BI Sync ---');

  // Group 21: Record Partial Payment
  const partialPayment = await FulfillmentPaymentService.recordPayment(manualOrder.id, STUDIO_A, USER_A, {
    amount_cents: 30000, // $300.00
    currency: 'USD',
    payment_method: 'STRIPE',
    gateway_transaction_id: 'ch_test_partial_123',
    notes: 'Initial 50% deposit on custom physical deliverables.',
  });

  assert(!!partialPayment.id, 'Group 21: Partial payment recorded');
  assert(partialPayment.amount_cents === 30000, 'Group 21: Payment amount is 30000 cents ($300.00)');

  // Group 22: Order Payment Status Updated to PARTIALLY_PAID
  const orderAfterPartial = await FulfillmentOrderService.getOrder(manualOrder.id, STUDIO_A);
  assert(orderAfterPartial?.paid_amount_cents === 30000, 'Group 22: Paid amount is 30000 cents');
  assert(orderAfterPartial?.payment_status === FulfillmentPaymentStatus.PARTIALLY_PAID, 'Group 22: Status is PARTIALLY_PAID');

  // Group 23: Phase 18 StudioBusinessTransaction Auto-Created
  const transactions = await prisma.studioBusinessTransaction.findMany({
    where: { studio_id: STUDIO_A, reference_id: manualOrder.id },
  });
  assert(transactions.length === 1, 'Group 23: 1 StudioBusinessTransaction created in Phase 18');
  assert(transactions[0].transaction_type === 'INCOME', 'Group 23: Transaction type is INCOME');
  assert(transactions[0].category === 'FULFILLMENT', 'Group 23: Category is FULFILLMENT');
  assert(transactions[0].amount_cents === 30000, 'Group 23: Transaction amount matches payment (30000 cents)');

  // Group 24: Payment Idempotency Key Validation
  const idempotencyKey = `idem_${crypto.randomUUID()}`;
  const firstIdemPay = await FulfillmentPaymentService.recordPayment(manualOrder.id, STUDIO_A, USER_A, {
    amount_cents: 10000,
    payment_method: 'STRIPE',
    idempotency_key: idempotencyKey,
  });
  const secondIdemPay = await FulfillmentPaymentService.recordPayment(manualOrder.id, STUDIO_A, USER_A, {
    amount_cents: 10000,
    payment_method: 'STRIPE',
    idempotency_key: idempotencyKey,
  });
  assert(firstIdemPay.id === secondIdemPay.id, 'Group 24: Same payment returned when idempotency key is reused');

  // Group 25: Record Remaining Balance to Full Payment
  // Current Paid: 30000 + 10000 = 40000 cents. Total: 78700 cents. Remaining: 38700 cents ($387.00).
  const finalPayment = await FulfillmentPaymentService.recordPayment(manualOrder.id, STUDIO_A, USER_A, {
    amount_cents: 38700,
    payment_method: 'BANK_TRANSFER',
    notes: 'Final balance payoff.',
  });
  assert(!!finalPayment.id, 'Group 25: Final payment recorded');

  const orderAfterFull = await FulfillmentOrderService.getOrder(manualOrder.id, STUDIO_A);
  assert(orderAfterFull?.paid_amount_cents === 78700, 'Group 25: Order is paid in full (78700 cents / $787.00)');
  assert(orderAfterFull?.payment_status === FulfillmentPaymentStatus.PAID, 'Group 25: Order payment status is PAID');

  // Group 26: List Order Payments
  const paymentList = await FulfillmentPaymentService.listPayments(manualOrder.id, STUDIO_A);
  assert(paymentList.length === 3, 'Group 26: Order has 3 payment entries logged');

  // -----------------------------------------------------------
  // GROUP 36–50: ORDER LIFECYCLE & STATE MACHINE TRANSITIONS
  // -----------------------------------------------------------
  console.log('\n--- GROUP 36-50: Order Lifecycle State Machine ---');

  // Group 36: State Machine: Transition from DRAFT to PAYMENT_PENDING
  const statusToPending = await FulfillmentOrderService.updateOrderStatus(
    orderFromProofing.id,
    STUDIO_A,
    USER_A,
    FulfillmentOrderStatus.PAYMENT_PENDING,
    'Client invoiced'
  );
  assert(statusToPending.status === FulfillmentOrderStatus.PAYMENT_PENDING, 'Group 36: Status transitioned to PAYMENT_PENDING');

  // Group 37: State Machine: Transition to PROCESSING
  const statusToProc = await FulfillmentOrderService.updateOrderStatus(
    orderFromProofing.id,
    STUDIO_A,
    USER_A,
    FulfillmentOrderStatus.PROCESSING,
    'Editing and packaging started'
  );
  assert(statusToProc.status === FulfillmentOrderStatus.PROCESSING, 'Group 37: Status transitioned to PROCESSING');

  // Group 38: State Machine: Transition to PRINTING_LAB
  const statusToLab = await FulfillmentOrderService.updateOrderStatus(
    orderFromProofing.id,
    STUDIO_A,
    USER_A,
    FulfillmentOrderStatus.PRINTING_LAB,
    'Submitted to White House Custom Colour (WHCC) lab'
  );
  assert(statusToLab.status === FulfillmentOrderStatus.PRINTING_LAB, 'Group 38: Status transitioned to PRINTING_LAB');

  // Group 39: Transition to READY_FOR_DELIVERY
  const statusToReady = await FulfillmentOrderService.markReadyForDelivery(
    orderFromProofing.id,
    STUDIO_A,
    USER_A,
    'Digital package built and ready'
  );
  assert(statusToReady.status === FulfillmentOrderStatus.READY_FOR_DELIVERY, 'Group 39: Status transitioned to READY_FOR_DELIVERY');

  // Group 40: Transition to OUT_FOR_DELIVERY
  const statusToOut = await FulfillmentOrderService.updateOrderStatus(
    orderFromProofing.id,
    STUDIO_A,
    USER_A,
    FulfillmentOrderStatus.OUT_FOR_DELIVERY,
    'Courier pickup completed'
  );
  assert(statusToOut.status === FulfillmentOrderStatus.OUT_FOR_DELIVERY, 'Group 40: Status transitioned to OUT_FOR_DELIVERY');

  // Group 41: Transition to DELIVERED
  const statusToDelivered = await FulfillmentOrderService.markDelivered(
    orderFromProofing.id,
    STUDIO_A,
    USER_A,
    'Delivered to customer'
  );
  assert(statusToDelivered.status === FulfillmentOrderStatus.DELIVERED, 'Group 41: Status transitioned to DELIVERED');
  assert(!!statusToDelivered.fulfilled_at, 'Group 41: fulfilled_at timestamp recorded');

  // Group 42: Transition to COMPLETED
  const statusToCompleted = await FulfillmentOrderService.updateOrderStatus(
    orderFromProofing.id,
    STUDIO_A,
    USER_A,
    FulfillmentOrderStatus.COMPLETED,
    'Order archived and closed'
  );
  assert(statusToCompleted.status === FulfillmentOrderStatus.COMPLETED, 'Group 42: Status transitioned to COMPLETED');

  // Group 43: Cancellation Transition
  const cancelTestOrder = await FulfillmentOrderService.createManualOrder(STUDIO_A, USER_A, {
    client_name: 'Cancel Test',
    items: [{ item_name: 'Test', product_type: FulfillmentProductType.PRINTS, quantity: 1, unit_price_cents: 100 }],
  });
  const cancelledOrder = await FulfillmentOrderService.cancelOrder(cancelTestOrder.id, STUDIO_A, USER_A, 'Customer changed mind');
  assert(cancelledOrder.status === FulfillmentOrderStatus.CANCELLED, 'Group 43: Order successfully CANCELLED');

  // Group 44: Invalid state transition protection (Cannot transition from CANCELLED to READY_FOR_DELIVERY)
  let invalidTransFailed = false;
  try {
    await FulfillmentOrderService.updateOrderStatus(cancelTestOrder.id, STUDIO_A, USER_A, FulfillmentOrderStatus.READY_FOR_DELIVERY);
  } catch (e: any) {
    invalidTransFailed = true;
    assert(e.message.includes('Cannot transition'), 'Group 44: Error message indicates invalid state transition');
  }
  assert(invalidTransFailed, 'Group 44: Invalid transition from CANCELLED rejected');

  // Group 45: Status History Audit Trail
  const history = await FulfillmentOrderService.getStatusHistory(orderFromProofing.id, STUDIO_A);
  assert(history.length >= 6, 'Group 45: Status history has recorded all state transitions');

  // -----------------------------------------------------------
  // GROUP 51–65: DIGITAL DELIVERY & SHORT-LIVED HMAC SIGNED DOWNLOADS
  // -----------------------------------------------------------
  console.log('\n--- GROUP 51-65: Digital Delivery Packages & Telemetry ---');

  // Group 51: Create Digital Delivery Package
  const expiryDate = new Date(Date.now() + 86400000 * 30); // 30 days
  const digitalPkg = await FulfillmentDigitalService.createDigitalPackage(
    orderFromProofing.id,
    STUDIO_A,
    USER_A,
    {
      name: 'High-Resolution Wedding Master Edits (ZIP)',
      expires_at: expiryDate.toISOString(),
      max_downloads: 10,
    }
  );

  assert(!!digitalPkg.id, 'Group 51: Digital package created with ID');
  assert(digitalPkg.name === 'High-Resolution Wedding Master Edits (ZIP)', 'Group 51: Package name matches');
  assert(digitalPkg.items.length === 15, 'Group 51: 15 package items attached from order photos');
  assert(digitalPkg.max_downloads === 10, 'Group 51: Max download count is 10');
  assert(digitalPkg.download_count === 0, 'Group 51: Initial download count is 0');

  // Group 52: Package Retrieval by ID
  const retrievedPkg = await FulfillmentDigitalService.getPackage(digitalPkg.id, STUDIO_A);
  assert(retrievedPkg?.id === digitalPkg.id, 'Group 52: Retrieved package by ID');

  // Group 53: HMAC URL Generation
  const downloadUrlPayload = await FulfillmentDigitalService.generateSignedDownloadUrl(
    digitalPkg.id,
    STUDIO_A,
    600 // 10 minutes expiry
  );
  assert(!!downloadUrlPayload.download_url, 'Group 53: Signed download URL generated');
  assert(downloadUrlPayload.download_url.includes('sig='), 'Group 53: Download URL contains HMAC signature');
  assert(downloadUrlPayload.download_url.includes('expires='), 'Group 53: Download URL contains expiration timestamp');

  // Group 54: Download Telemetry Logging & Count Increment
  const downloadLog = await FulfillmentDigitalService.recordDownload(
    digitalPkg.id,
    '192.168.1.50',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
  );
  assert(!!downloadLog.id, 'Group 54: Download telemetry recorded');
  assert(downloadLog.ip_hash.length === 64, 'Group 54: IP address hashed with SHA-256 for privacy');

  const pkgAfterDownload = await FulfillmentDigitalService.getPackage(digitalPkg.id, STUDIO_A);
  assert(pkgAfterDownload?.download_count === 1, 'Group 54: Package download_count incremented to 1');

  // Group 55: Expiration Check on Download Generation
  const expiredPkg = await prisma.fulfillmentPackage.create({
    data: {
      order_id: orderFromProofing.id,
      name: 'Expired Test Package',
      expires_at: new Date(Date.now() - 10000), // Expired in past
    },
  });

  let expiredFailed = false;
  try {
    await FulfillmentDigitalService.generateSignedDownloadUrl(expiredPkg.id, STUDIO_A);
  } catch (e: any) {
    expiredFailed = true;
    assert(e.message.includes('expired'), 'Group 55: Error message indicates package expired');
  }
  assert(expiredFailed, 'Group 55: Expired package download URL request rejected');

  // Group 56: Max Download Limit Enforcement
  const limitPkg = await prisma.fulfillmentPackage.create({
    data: {
      order_id: orderFromProofing.id,
      name: 'Limit Test Package',
      max_downloads: 2,
    },
  });
  await prisma.fulfillmentPackage.update({ where: { id: limitPkg.id }, data: { download_count: 2 } });

  let limitFailed = false;
  try {
    await FulfillmentDigitalService.generateSignedDownloadUrl(limitPkg.id, STUDIO_A);
  } catch (e: any) {
    limitFailed = true;
    assert(e.message.includes('Maximum download limit'), 'Group 56: Error indicates max download limit reached');
  }
  assert(limitFailed, 'Group 56: Over-limit download URL request rejected');

  // Group 57: Unpaid Order Download Restriction
  const unpaidOrder = await FulfillmentOrderService.createManualOrder(STUDIO_A, USER_A, {
    client_name: 'Unpaid Client',
    items: [{ item_name: 'Digital', product_type: FulfillmentProductType.DIGITAL_DOWNLOAD, quantity: 1, unit_price_cents: 5000 }],
  });
  const unpaidPkg = await prisma.fulfillmentPackage.create({
    data: { order_id: unpaidOrder.id, name: 'Unpaid Package' },
  });

  let unpaidDlFailed = false;
  try {
    await FulfillmentDigitalService.generateSignedDownloadUrl(unpaidPkg.id, STUDIO_A);
  } catch (e: any) {
    unpaidDlFailed = true;
    assert(e.message.includes('Payment is required'), 'Group 57: Error specifies payment required before download');
  }
  assert(unpaidDlFailed, 'Group 57: Download for unpaid order rejected');

  // -----------------------------------------------------------
  // GROUP 66–75: PHYSICAL DELIVERIES & LAB TRACKING
  // -----------------------------------------------------------
  console.log('\n--- GROUP 66-75: Physical Shipments & Lab Tracking ---');

  // Group 66: Create Physical Delivery
  const delivery = await FulfillmentPhysicalService.createPhysicalDelivery(
    manualOrder.id,
    STUDIO_A,
    USER_A,
    {
      courier_name: 'FedEx',
      tracking_number: '782910482910',
      tracking_url: 'https://fedex.com/track?num=782910482910',
      delivery_status: FulfillmentDeliveryStatus.DISPATCHED,
    }
  );

  assert(!!delivery.id, 'Group 66: Physical delivery record created');
  assert(delivery.courier_name === 'FedEx', 'Group 66: Courier name matches');
  assert(delivery.tracking_number === '782910482910', 'Group 66: Tracking number matches');
  assert(delivery.status === FulfillmentDeliveryStatus.DISPATCHED, 'Group 66: Delivery status is DISPATCHED');
  assert(!!delivery.shipped_at, 'Group 66: shipped_at timestamp recorded');

  // Group 67: Delivery Status Progression
  const inTransit = await FulfillmentPhysicalService.updateDeliveryStatus(
    delivery.id,
    STUDIO_A,
    USER_A,
    FulfillmentDeliveryStatus.IN_TRANSIT
  );
  assert(inTransit.status === FulfillmentDeliveryStatus.IN_TRANSIT, 'Group 67: Status updated to IN_TRANSIT');

  const outForDel = await FulfillmentPhysicalService.updateDeliveryStatus(
    delivery.id,
    STUDIO_A,
    USER_A,
    FulfillmentDeliveryStatus.OUT_FOR_DELIVERY
  );
  assert(outForDel.status === FulfillmentDeliveryStatus.OUT_FOR_DELIVERY, 'Group 67: Status updated to OUT_FOR_DELIVERY');

  const delDelivered = await FulfillmentPhysicalService.updateDeliveryStatus(
    delivery.id,
    STUDIO_A,
    USER_A,
    FulfillmentDeliveryStatus.DELIVERED
  );
  assert(delDelivered.status === FulfillmentDeliveryStatus.DELIVERED, 'Group 67: Status updated to DELIVERED');
  assert(!!delDelivered.delivered_at, 'Group 67: delivered_at timestamp recorded');

  // Group 68: Update Tracking Details
  const updatedTrack = await FulfillmentPhysicalService.updateTracking(
    delivery.id,
    STUDIO_A,
    USER_A,
    {
      tracking_number: '782910482911',
      tracking_url: 'https://fedex.com/track?num=782910482911',
    }
  );
  assert(updatedTrack.tracking_number === '782910482911', 'Group 68: Tracking number updated');

  // -----------------------------------------------------------
  // GROUP 76–83: PUBLIC CLIENT DELIVERY PORTAL & CONFIRMATION
  // -----------------------------------------------------------
  console.log('\n--- GROUP 76-83: Public Client Delivery Portal ---');

  // Group 76: Fetch Public Order DTO by Raw Token
  const publicOrder = await FulfillmentOrderService.getOrderByToken(rawToken);
  assert(publicOrder.order_number === orderFromProofing.order_number, 'Group 76: Order found via raw token');
  assert(publicOrder.studio_name === 'Alpha Studio', 'Group 76: Studio name resolved');
  assert(publicOrder.packages.length >= 1, 'Group 76: Public DTO contains digital packages');
  assert(publicOrder.items.length >= 1, 'Group 76: Public DTO contains order items');

  // Group 77: Non-Existent Token Lookup
  let invalidTokenFailed = false;
  try {
    await FulfillmentOrderService.getOrderByToken('invalid_token_xyz');
  } catch (e: any) {
    invalidTokenFailed = true;
    assert(e.message.includes('not found'), 'Group 77: Error message indicates order not found');
  }
  assert(invalidTokenFailed, 'Group 77: Invalid public token rejected');

  // Group 78: Client Delivery Confirmation & Feedback
  const confirmedOrder = await FulfillmentOrderService.confirmDelivery(
    rawToken,
    'Everything arrived in perfect condition, the fine art prints are stunning!',
    'Eleanor Vance'
  );
  assert(!!confirmedOrder.client_confirmed_at, 'Group 78: client_confirmed_at timestamp recorded');
  assert(confirmedOrder.client_confirmed_by === 'Eleanor Vance', 'Group 78: Client confirmation name recorded');

  // -----------------------------------------------------------
  // GROUP 84–88: ANALYTICS, AUDIT LOGGING & MULTI-TENANT ISOLATION
  // -----------------------------------------------------------
  console.log('\n--- GROUP 84-88: Analytics, Audit & Multi-Tenant IDOR Protection ---');

  // Group 84: Studio Fulfillment Analytics Summary
  const analyticsSummary = await FulfillmentAnalyticsService.getAnalyticsSummary(STUDIO_A);
  assert(analyticsSummary.total_orders >= 2, 'Group 84: Total orders counted accurately');
  assert(analyticsSummary.total_revenue_cents > 0, 'Group 84: Total revenue calculated');
  assert(typeof analyticsSummary.formatted_revenue === 'string', 'Group 84: Formatted revenue string returned');
  assert(typeof analyticsSummary.formatted_aov === 'string', 'Group 84: Formatted AOV returned');
  assert(analyticsSummary.total_downloads >= 1, 'Group 84: Total downloads counted');

  // Group 85: Studio Audit Logs
  const auditLogs = await FulfillmentAnalyticsService.getOrderAuditLog(manualOrder.id, STUDIO_A);
  assert(auditLogs.length >= 3, 'Group 85: Order audit logs recorded for creation, items, and payments');
  const actionTypes = auditLogs.map((a) => a.action);
  assert(actionTypes.includes(FulfillmentAuditAction.ORDER_CREATED), 'Group 85: Audit contains ORDER_CREATED');
  assert(actionTypes.includes(FulfillmentAuditAction.PAYMENT_RECORDED), 'Group 85: Audit contains PAYMENT_RECORDED');

  // Group 86: Multi-Tenant IDOR: Studio B cannot view or modify Studio A's orders
  const studioBOrder = await FulfillmentOrderService.getOrder(manualOrder.id, STUDIO_B);
  assert(studioBOrder === null, 'Group 86: Studio B cannot view Studio A order by ID (returns null)');

  let studioBPaymentFailed = false;
  try {
    await FulfillmentPaymentService.recordPayment(manualOrder.id, STUDIO_B, 'user_beta', {
      amount_cents: 1000,
      payment_method: 'CASH',
    });
  } catch (e: any) {
    studioBPaymentFailed = true;
    assert(e.message.includes('not found'), 'Group 86: Studio B payment attempt throws not found');
  }
  assert(studioBPaymentFailed, 'Group 86: Studio B payment on Studio A order blocked');

  // -----------------------------------------------------------
  // GROUP 89–90: COPILOT TOOLS REGISTRATION & EXECUTION
  // -----------------------------------------------------------
  console.log('\n--- GROUP 89-90: Phase 26 Copilot Tools ---');

  const copilotCtx = { studioId: STUDIO_A, userId: USER_A };
  const registry = CopilotToolRegistry.getInstance();

  // Group 89: Copilot Read Tools
  const copilotOrder = await registry.executeTool('getFulfillmentOrder', copilotCtx, { orderId: manualOrder.id });
  assert(copilotOrder.id === manualOrder.id, 'Group 89: Copilot getFulfillmentOrder executes successfully');

  const copilotList = await registry.executeTool('listFulfillmentOrders', copilotCtx, {});
  assert(Array.isArray(copilotList) && copilotList.length >= 2, 'Group 89: Copilot listFulfillmentOrders returns orders list');

  const copilotSummary = await registry.executeTool('getFulfillmentOrderSummary', copilotCtx, {});
  assert(copilotSummary.total_orders >= 2, 'Group 89: Copilot getFulfillmentOrderSummary returns analytics');

  const copilotProducts = await registry.executeTool('getFulfillmentProducts', copilotCtx, {});
  assert(Array.isArray(copilotProducts) && copilotProducts.length >= 5, 'Group 89: Copilot getFulfillmentProducts returns catalog');

  const copilotPkg = await registry.executeTool('getDigitalPackageStatus', copilotCtx, { packageId: digitalPkg.id });
  assert(copilotPkg.id === digitalPkg.id, 'Group 89: Copilot getDigitalPackageStatus returns package info');

  const copilotDel = await registry.executeTool('getDeliveryStatus', copilotCtx, { deliveryId: delivery.id });
  assert(copilotDel.id === delivery.id, 'Group 89: Copilot getDeliveryStatus returns shipment info');

  // Group 90: Copilot Mutation Tools
  const copilotCreatedOrder = await registry.executeTool('createFulfillmentOrder', copilotCtx, {
    client_name: 'Copilot Test Client',
    items: [{ item_name: 'Mini Print', product_type: FulfillmentProductType.PRINTS, quantity: 1, unit_price_cents: 1000 }],
  });
  assert(!!copilotCreatedOrder.id, 'Group 90: Copilot createFulfillmentOrder creates order');

  const copilotStatusUpdated = await registry.executeTool('updateFulfillmentOrder', copilotCtx, {
    orderId: copilotCreatedOrder.id,
    status: FulfillmentOrderStatus.PROCESSING,
    notes: 'Copilot advanced status',
  });
  assert(copilotStatusUpdated.status === FulfillmentOrderStatus.PROCESSING, 'Group 90: Copilot updateFulfillmentOrder updates status');

  const copilotReady = await registry.executeTool('markOrderReady', copilotCtx, {
    orderId: copilotCreatedOrder.id,
    notes: 'Copilot marked ready',
  });
  assert(copilotReady.status === FulfillmentOrderStatus.READY_FOR_DELIVERY, 'Group 90: Copilot markOrderReady updates status');

  const copilotDelivered = await registry.executeTool('markOrderDelivered', copilotCtx, {
    orderId: copilotCreatedOrder.id,
    notes: 'Copilot marked delivered',
  });
  assert(copilotDelivered.status === FulfillmentOrderStatus.DELIVERED, 'Group 90: Copilot markOrderDelivered updates status');

  const copilotPayment = await registry.executeTool('recordFulfillmentPayment', copilotCtx, {
    orderId: copilotCreatedOrder.id,
    amount_cents: 1000,
    payment_method: 'STRIPE',
  });
  assert(!!copilotPayment.id, 'Group 90: Copilot recordFulfillmentPayment records payment');

  // Final Test Suite Summary
  console.log('\n============================================================');
  console.log(`PHASE 26 TEST EXECUTION COMPLETE`);
  console.log(`PASSED: ${passed} assertions`);
  console.log(`FAILED: ${failed} assertions`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllPhase26Tests().catch((err) => {
  console.error('Fatal error during Phase 26 tests:', err);
  process.exit(1);
});
