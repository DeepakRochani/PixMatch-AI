import { PaymentGatewayProvider } from './payment-gateway.interface';
import { MockPaymentProvider } from './mock.provider';
import { StripePaymentProvider } from './stripe.provider';
import { RazorpayPaymentProvider } from './razorpay.provider';

export class PaymentGatewayFactory {
  private static providers: Map<string, PaymentGatewayProvider> = new Map();

  static getProvider(providerName: string = 'MOCK'): PaymentGatewayProvider {
    const normalized = providerName.toUpperCase();
    if (!this.providers.has(normalized)) {
      switch (normalized) {
        case 'STRIPE':
          this.providers.set(normalized, new StripePaymentProvider());
          break;
        case 'RAZORPAY':
          this.providers.set(normalized, new RazorpayPaymentProvider());
          break;
        case 'MOCK':
        default:
          this.providers.set('MOCK', new MockPaymentProvider());
          break;
      }
    }
    return this.providers.get(normalized) || new MockPaymentProvider();
  }

  static registerCustomProvider(name: string, provider: PaymentGatewayProvider): void {
    this.providers.set(name.toUpperCase(), provider);
  }

  getProvider(providerName?: string): PaymentGatewayProvider {
    return PaymentGatewayFactory.getProvider(providerName);
  }
}
