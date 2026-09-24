import { StudioInvoicePaymentStatus } from '@pixmatch/types';

export interface CreatePaymentRequestParams {
  invoiceId: string;
  studioId: string;
  amountMinor: number;
  currency: string;
  description?: string;
  clientEmail?: string;
  clientName?: string;
  externalReference?: string;
}

export interface PaymentRequestResult {
  providerReference: string;
  clientSecret?: string;
  paymentUrl?: string;
  metadata?: Record<string, any>;
}

export interface RefundPaymentParams {
  paymentReference: string;
  amountMinor: number;
  currency: string;
  reason?: string;
}

export interface RefundPaymentResult {
  refundReference: string;
  status: 'SUCCEEDED' | 'FAILED' | 'PENDING';
  rawResponse?: any;
}

export interface WebhookVerificationResult {
  isValid: boolean;
  eventType: string;
  providerEventId: string;
  amountMinor: number;
  currency: string;
  externalReference?: string;
  invoiceId?: string;
  status: StudioInvoicePaymentStatus;
  failureReason?: string;
  rawPayload?: any;
}

export interface PaymentGatewayProvider {
  readonly providerName: string;
  createPaymentRequest(params: CreatePaymentRequestParams): Promise<PaymentRequestResult>;
  getPaymentStatus(externalReference: string): Promise<{
    status: StudioInvoicePaymentStatus;
    amountMinor: number;
    currency: string;
    rawResponse?: any;
  }>;
  verifyWebhook(
    payload: any,
    headers: Record<string, string | string[] | undefined>,
    webhookSecret?: string
  ): Promise<WebhookVerificationResult>;
  refundPayment(params: RefundPaymentParams): Promise<RefundPaymentResult>;
  createPaymentLink(params: CreatePaymentRequestParams): Promise<{ paymentUrl: string; token: string }>;
}
