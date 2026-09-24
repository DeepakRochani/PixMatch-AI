import crypto from 'crypto';
import {
  PaymentGatewayProvider,
  CreatePaymentRequestParams,
  PaymentRequestResult,
  RefundPaymentParams,
  RefundPaymentResult,
  WebhookVerificationResult,
} from './payment-gateway.interface';
import { StudioInvoicePaymentStatus } from '@pixmatch/types';

export class RazorpayPaymentProvider implements PaymentGatewayProvider {
  public readonly providerName = 'RAZORPAY';
  private keyId?: string;
  private keySecret?: string;

  getProviderName(): string {
    return this.providerName;
  }

  async createPaymentLink(params: any): Promise<any> {
    const reference = `plink_${crypto.randomBytes(12).toString('hex')}`;
    const paymentUrl = `https://rzp.io/i/${reference}`;
    return {
      providerReference: reference,
      provider_reference: reference,
      paymentUrl,
      payment_url: paymentUrl,
      status: 'CREATED',
      metadata: params,
    };
  }

  constructor(keyId?: string, keySecret?: string) {
    this.keyId = keyId || process.env.RAZORPAY_KEY_ID;
    this.keySecret = keySecret || process.env.RAZORPAY_KEY_SECRET;
  }

  async createPaymentRequest(params: CreatePaymentRequestParams): Promise<PaymentRequestResult> {
    const orderId = `order_${crypto.randomBytes(10).toString('hex')}`;
    return {
      providerReference: orderId,
      clientSecret: this.keyId || 'rzp_test_key',
      paymentUrl: `https://api.razorpay.com/v1/checkout/hosted?order_id=${orderId}`,
      metadata: {
        invoiceId: params.invoiceId,
        studioId: params.studioId,
        amountMinor: params.amountMinor,
        currency: params.currency,
      },
    };
  }

  async getPaymentStatus(externalReference: string): Promise<{
    status: StudioInvoicePaymentStatus;
    amountMinor: number;
    currency: string;
    rawResponse?: any;
  }> {
    return {
      status: 'SUCCEEDED',
      amountMinor: 0,
      currency: 'INR',
      rawResponse: { id: externalReference, status: 'captured' },
    };
  }

  async verifyWebhook(
    payload: any,
    headers: Record<string, string | string[] | undefined>,
    webhookSecret?: string
  ): Promise<WebhookVerificationResult> {
    const signature = (headers['x-razorpay-signature'] || headers['X-Razorpay-Signature']) as string;
    const secret = webhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET;

    let isValid = false;
    const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);

    if (signature && secret) {
      try {
        const expected = crypto
          .createHmac('sha256', secret)
          .update(payloadStr)
          .digest('hex');

        if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
          isValid = true;
        }
      } catch {
        isValid = false;
      }
    } else if (!secret) {
      isValid = true;
    }

    const data = typeof payload === 'string' ? JSON.parse(payload) : payload;
    const eventType = data.event || 'payment.captured';
    const providerEventId = data.id || `evt_${crypto.randomBytes(8).toString('hex')}`;
    const paymentEntity = data.payload?.payment?.entity || data;

    const amountMinor = Number(paymentEntity.amount || 0);
    const currency = (paymentEntity.currency || 'INR').toUpperCase();
    const externalReference = paymentEntity.id || paymentEntity.order_id;
    const invoiceId = paymentEntity.notes?.invoice_id || paymentEntity.notes?.invoiceId;

    let status: StudioInvoicePaymentStatus = 'SUCCEEDED';
    if (eventType === 'payment.failed') {
      status = 'FAILED';
    } else if (eventType.includes('refund')) {
      status = 'REFUNDED';
    }

    return {
      isValid,
      eventType,
      providerEventId,
      amountMinor,
      currency,
      externalReference,
      invoiceId,
      status,
      failureReason: paymentEntity.error_description,
      rawPayload: data,
    };
  }

  async refundPayment(params: RefundPaymentParams): Promise<RefundPaymentResult> {
    const refundRef = `rfnd_${crypto.randomBytes(10).toString('hex')}`;
    return {
      refundReference: refundRef,
      status: 'SUCCEEDED',
      rawResponse: { id: refundRef, amount: params.amountMinor, status: 'processed' },
    };
  }

  async createPaymentLink(params: CreatePaymentRequestParams): Promise<{ paymentUrl: string; token: string }> {
    const token = crypto.randomBytes(32).toString('hex');
    return {
      paymentUrl: `/pay/${token}`,
      token,
    };
  }
}
