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

  /**
   * Firma de integridad del checkout.
   *
   * Wompi exige SHA256(reference + amountInCents + currency + secretoIntegridad)
   * y rechaza la transacción si no coincide. Sin ella el widget nunca abre.
   *
   * Se calcula en el backend a propósito: si el monto se firmara en el
   * navegador, cualquiera podría pagar mil pesos por una reserva de un millón.
   */
  buildIntegritySignature(
    reference: string,
    amountInCents: number,
    currency: string
  ): string {
    const secret = config.wompi.integritySecret;
    if (!secret) {
      throw new Error(
        'WOMPI_INTEGRITY_SECRET no está configurado: no se puede firmar el checkout.'
      );
    }

    if (!Number.isInteger(amountInCents) || amountInCents <= 0) {
      throw new Error(`Monto inválido para firmar: ${amountInCents}`);
    }

    const payload = `${reference}${amountInCents}${currency}${secret}`;
    return crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
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
