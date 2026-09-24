/**
 * Fulfillment Routes — PixMatch AI Phase 26
 * Registers Fastify endpoints for public client delivery portal and authenticated studio fulfillment management.
 */

import { FastifyInstance } from 'fastify';
import { authenticate } from '../../middlewares/auth.js';
import { FulfillmentController } from './fulfillment.controller.js';

export async function fulfillmentRoutes(app: FastifyInstance) {
  // -------------------------------------------------------------
  // PUBLIC CLIENT DELIVERY PORTAL ROUTES (Token Authenticated)
  // -------------------------------------------------------------
  app.get('/public/:token', FulfillmentController.getPublicOrder);
  app.post('/public/:token/confirm-delivery', FulfillmentController.clientConfirmDelivery);
  app.get('/public/:token/download/:type/:id', FulfillmentController.downloadPublicItem);

  // -------------------------------------------------------------
  // AUTHENTICATED STUDIO FULFILLMENT MANAGEMENT
  // -------------------------------------------------------------
  app.register(async (authed) => {
    authed.addHook('onRequest', authenticate);

    // Products & Variants Catalog
    authed.get('/studios/:studioId/products', FulfillmentController.listProducts);
    authed.post('/studios/:studioId/products', FulfillmentController.createProduct);
    authed.get('/studios/:studioId/products/:productId', FulfillmentController.getProduct);
    authed.put('/studios/:studioId/products/:productId', FulfillmentController.updateProduct);
    authed.delete('/studios/:studioId/products/:productId', FulfillmentController.deleteProduct);
    authed.post('/studios/:studioId/products/:productId/variants', FulfillmentController.addProductVariant);
    authed.put('/studios/:studioId/products/:productId/variants/:variantId', FulfillmentController.updateProductVariant);

    // Order Management
    authed.get('/studios/:studioId/orders', FulfillmentController.listOrders);
    authed.post('/studios/:studioId/orders/from-proofing', FulfillmentController.createOrderFromProofing);
    authed.post('/studios/:studioId/orders/manual', FulfillmentController.createManualOrder);
    authed.get('/studios/:studioId/orders/:orderId', FulfillmentController.getOrder);
    authed.post('/studios/:studioId/orders/:orderId/items', FulfillmentController.addOrderItem);
    authed.put('/studios/:studioId/orders/:orderId/items/:itemId', FulfillmentController.updateOrderItem);
    authed.delete('/studios/:studioId/orders/:orderId/items/:itemId', FulfillmentController.removeOrderItem);
    authed.patch('/studios/:studioId/orders/:orderId/status', FulfillmentController.updateOrderStatus);
    authed.post('/studios/:studioId/orders/:orderId/cancel', FulfillmentController.cancelOrder);

    // Payments & Refunds
    authed.post('/studios/:studioId/orders/:orderId/payments', FulfillmentController.recordPayment);
    authed.post('/studios/:studioId/orders/:orderId/refund', FulfillmentController.recordRefund);

    // Digital & Physical Delivery
    authed.post('/studios/:studioId/orders/:orderId/digital-package', FulfillmentController.createDigitalPackage);
    authed.post('/studios/:studioId/orders/:orderId/deliveries', FulfillmentController.createPhysicalDelivery);
    authed.patch('/studios/:studioId/deliveries/:deliveryId', FulfillmentController.updateDeliveryStatus);

    // Analytics & Audit
    authed.get('/studios/:studioId/analytics', FulfillmentController.getAnalyticsSummary);
    authed.get('/studios/:studioId/orders/:orderId/audit-log', FulfillmentController.getOrderAuditLogs);
  });
}
