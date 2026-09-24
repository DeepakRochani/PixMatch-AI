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

export class MockPaymentProvider implements PaymentGatewayProvider {
  public readonly providerName = 'MOCK';

  getProviderName(): string {
    return this.providerName;
  }

  async createPaymentLink(params: any): Promise<any> {
    const reference = `mock_req_${crypto.randomBytes(12).toString('hex')}`;
    const paymentUrl = `https://checkout.pixmatch.local/mock/${reference}`;
    return {
      providerReference: reference,
      provider_reference: reference,
      paymentUrl,
      payment_url: paymentUrl,
      status: 'CREATED',
      metadata: params,
    };
  }

  async createPaymentRequest(params: CreatePaymentRequestParams): Promise<PaymentRequestResult> {
    const reference = `mock_req_${crypto.randomBytes(12).toString('hex')}`;
    return {
      providerReference: reference,
      clientSecret: `mock_secret_${crypto.randomBytes(16).toString('hex')}`,
      paymentUrl: `https://checkout.pixmatch.local/mock/${reference}`,
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
      amountMinor: 10000,
      currency: 'INR',
      rawResponse: { reference: externalReference, state: 'captured' },
    };
  }

  verifyWebhook(
    payload: any,
    headersOrSig: any,
    webhookSecret: string = 'mock_secret_key'
  ): any {
    if (typeof headersOrSig === 'string') {
      return true;
    }
    const headers = headersOrSig || {};
    const signature = headers['x-mock-signature'] || headers['x-signature'];
    const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
    
    // Validate signature if provided
    let isValid = true;
    if (signature && typeof signature === 'string' && webhookSecret) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payloadStr)
        .digest('hex');
      isValid = signature === expectedSignature || signature === 'valid_mock_signature';
    }

    let parsed: any = {};
    try {
      parsed = typeof payload === 'string' ? JSON.parse(payload) : payload;
    } catch {
      parsed = {};
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
      failureReason: data.failure_reason,
      rawPayload: data,
    };
  }

  async refundPayment(params: RefundPaymentParams): Promise<RefundPaymentResult> {
    const refundRef = `mock_ref_${crypto.randomBytes(12).toString('hex')}`;
    return {
      refundReference: refundRef,
      status: 'SUCCEEDED',
      rawResponse: { refund_id: refundRef, amount_refunded: params.amountMinor },
    };
  }
}
