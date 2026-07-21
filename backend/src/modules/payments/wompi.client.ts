import { config } from '../../config/index.js';

interface WompiTransaction {
  id: string;
  amount_in_cents: number;
  reference: string;
  customer_email: string;
  currency: string;
  payment_method_type: string;
  status: string;
}

interface WompiRefundResponse {
  id: string;
  transaction_id: string;
  amount_in_cents: number;
  status: string;
}

export class WompiClient {
  private baseUrl: string;
  private privateKey: string;

  constructor() {
    this.baseUrl = config.wompi.baseUrl;
    this.privateKey = config.wompi.privateKey || '';
  }

  private async request(path: string, options: RequestInit = {}): Promise<unknown> {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      'Authorization': `Bearer ${this.privateKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Wompi API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async getTransaction(transactionId: string): Promise<WompiTransaction> {
    return this.request(`/transactions/${transactionId}`) as Promise<WompiTransaction>;
  }

  async createRefund(transactionId: string, amountInCents: number): Promise<WompiRefundResponse> {
    return this.request('/refunds', {
      method: 'POST',
      body: JSON.stringify({
        transaction_id: transactionId,
        amount_in_cents: amountInCents,
      }),
    }) as Promise<WompiRefundResponse>;
  }

  verifyWebhookSignature(
    signature: string,
    timestamp: string,
    payload: string
  ): boolean {
    const secret = config.wompi.webhookSecret;
    if (!secret) return false;

    // Wompi uses SHA256 HMAC
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(`${timestamp}${payload}`);
    const expectedSignature = hmac.digest('hex');

    return signature === expectedSignature;
  }
}

export default new WompiClient();
