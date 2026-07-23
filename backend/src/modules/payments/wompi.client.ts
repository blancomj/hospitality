import crypto from 'crypto';
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

export interface WompiEvent {
  event: string;
  data: Record<string, any>;
  environment?: string;
  signature: {
    properties: string[];
    checksum: string;
  };
  timestamp: number;
  sent_at?: string;
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

    const response = await fetch(url, { ...options, headers });

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

  private resolvePath(obj: Record<string, any>, path: string): unknown {
    return path.split('.').reduce<any>(
      (acc, key) => (acc === null || acc === undefined ? undefined : acc[key]),
      obj
    );
  }

  /**
   * Verifica la firma de un evento de Wompi.
   *
   * Especificación oficial (docs.wompi.co — Eventos):
   *   checksum = SHA256(
   *     valores de los campos listados en signature.properties (en orden,
   *       resueltos contra el objeto `data`)
   *     + timestamp (entero, tiempo UNIX del evento)
   *     + secreto de eventos del comercio
   *   )
   */
  verifyEventSignature(event: WompiEvent): boolean {
    const secret = config.wompi.webhookSecret;
    if (!secret) {
      console.error('WOMPI_WEBHOOK_SECRET no está configurado: se rechaza el evento.');
      return false;
    }

    if (!event?.signature?.checksum || !Array.isArray(event.signature.properties)) {
      return false;
    }
    if (typeof event.timestamp !== 'number') {
      return false;
    }

    let concatenated = '';
    for (const path of event.signature.properties) {
      const value = this.resolvePath(event.data, path);
      if (value === undefined || value === null) {
        console.error(`Propiedad firmada ausente en el evento: ${path}`);
        return false;
      }
      concatenated += String(value);
    }

    concatenated += String(event.timestamp);
    concatenated += secret;

    const expected = crypto.createHash('sha256').update(concatenated, 'utf8').digest('hex');

    const received = event.signature.checksum.toLowerCase();
    const a = Buffer.from(received, 'utf8');
    const b = Buffer.from(expected, 'utf8');

    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }
}

export default new WompiClient();
