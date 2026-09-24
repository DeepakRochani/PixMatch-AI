/**
 * Fulfillment Analytics Service — PixMatch AI Phase 26
 * Provides studio fulfillment KPIs, digital/physical revenue breakdowns, top products, and audit trail retrieval.
 */

import { prisma } from '@pixmatch/database';
import {
  FulfillmentOrderStatus,
  FulfillmentPaymentStatus,
  FulfillmentDeliveryType,
  FulfillmentAnalyticsSummaryDTO,
} from '@pixmatch/types';

export class FulfillmentAnalyticsService {
  /**
   * Computes studio-level aggregate metrics for the fulfillment dashboard.
   */
  public static async getStudioAnalyticsSummary(
    studioId: string,
    query?: any
  ): Promise<any> {
    const orders = await prisma.fulfillmentOrder.findMany({
      where: { studio_id: studioId },
      include: {
        items: true,
        downloads: true,
        packages: true,
      },
    });

    const totalOrders = orders.length;
    let openOrders = 0;
    let awaitingPaymentOrders = 0;
    let inProductionOrders = 0;
    let readyOrders = 0;
    let deliveredOrders = 0;
    let totalRevenueCents = 0;
    let digitalRevenue = 0;
    let physicalRevenue = 0;
    let totalDownloads = 0;
    let confirmedDeliveries = 0;

    const productSalesMap = new Map<string, { name: string; units: number; revenue: number }>();

    for (const order of orders) {
      const paid = (order as any).paid_amount_cents ?? (order.paid_amount || 0);
      if (order.status !== FulfillmentOrderStatus.CANCELLED && order.status !== FulfillmentOrderStatus.REFUNDED) {
        totalRevenueCents += paid;

        if (order.delivery_type === FulfillmentDeliveryType.DIGITAL) {
          digitalRevenue += paid;
        } else if (order.delivery_type === FulfillmentDeliveryType.PHYSICAL) {
          physicalRevenue += paid;
        } else {
          digitalRevenue += paid * 0.5;
          physicalRevenue += paid * 0.5;
        }
      }

      if (order.status === FulfillmentOrderStatus.DRAFT || order.status === FulfillmentOrderStatus.PENDING_PAYMENT) {
        openOrders++;
      }
      if (order.payment_status === FulfillmentPaymentStatus.UNPAID || order.payment_status === FulfillmentPaymentStatus.PARTIALLY_PAID) {
        awaitingPaymentOrders++;
      }
      if (order.status === FulfillmentOrderStatus.IN_PRODUCTION) {
        inProductionOrders++;
      }
      if (order.status === FulfillmentOrderStatus.READY_FOR_DELIVERY) {
        readyOrders++;
      }
      if (order.status === FulfillmentOrderStatus.DELIVERED) {
        deliveredOrders++;
      }
      if (order.client_confirmed_at) {
        confirmedDeliveries++;
      }

      // Count downloads from downloads relation and packages download_count
      const orderDownloads = (order.downloads?.length || 0);
      const pkgDownloads = (order.packages || []).reduce((acc: number, p: any) => acc + (p.download_count || 0), 0);
      totalDownloads += Math.max(orderDownloads, pkgDownloads);

      // Track item sales
      for (const item of (order.items || [])) {
        const prodKey = item.product_id || item.item_name;
        const current = productSalesMap.get(prodKey) || { name: item.item_name, units: 0, revenue: 0 };
        current.units += (item.quantity || 1);
        const itemTot = (item as any).unit_price_cents ? ((item as any).unit_price_cents * (item.quantity || 1)) : (item.total || 0);
        current.revenue += itemTot;
        productSalesMap.set(prodKey, current);
      }
    }

    const averageOrderValueCents = totalOrders > 0 ? Math.round(totalRevenueCents / totalOrders) : 0;
    const deliveryConfirmationRate = deliveredOrders > 0
      ? Number(((confirmedDeliveries / deliveredOrders) * 100).toFixed(1))
      : 0;

    const topProducts = Array.from(productSalesMap.entries())
      .map(([productId, data]) => ({
        product_id: productId,
        name: data.name,
        units_sold: data.units,
        revenue: data.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const formattedRev = `$${(totalRevenueCents / 100).toFixed(2)}`;
    const formattedAov = `$${(averageOrderValueCents / 100).toFixed(2)}`;

    return {
      total_orders: totalOrders,
      open_orders: openOrders,
      awaiting_payment_orders: awaitingPaymentOrders,
      in_production_orders: inProductionOrders,
      ready_orders: readyOrders,
      delivered_orders: deliveredOrders,
      total_revenue: totalRevenueCents,
      total_revenue_cents: totalRevenueCents,
      digital_revenue: digitalRevenue,
      physical_revenue: physicalRevenue,
      average_order_value: averageOrderValueCents,
      formatted_revenue: formattedRev,
      formatted_aov: formattedAov,
      total_downloads: totalDownloads,
      delivery_confirmation_rate: deliveryConfirmationRate,
      top_products: topProducts,
    };
  }

  /**
   * Alias for getStudioAnalyticsSummary.
   */
  public static async getAnalyticsSummary(
    studioId: string,
    query?: any
  ): Promise<any> {
    return this.getStudioAnalyticsSummary(studioId, query);
  }

  /**
   * Retrieves complete audit history for an order.
   */
  public static async getOrderAuditLog(
    arg1: string,
    arg2?: string
  ): Promise<any[]> {
    const isFirstOrder = arg1.startsWith('ord_') || (arg2 && !arg2.startsWith('ord_'));
    const orderId = isFirstOrder ? arg1 : arg2!;
    const studioId = isFirstOrder ? arg2 : arg1;

    const where: any = { order_id: orderId };
    if (studioId) where.studio_id = studioId;

    const logs = await prisma.fulfillmentAuditLog.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });

    return logs;
  }
}
