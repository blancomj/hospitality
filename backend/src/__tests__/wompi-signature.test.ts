import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';

const SECRET = 'test_events_secret_abc123';

vi.mock('../config/index.js', () => ({
  config: {
    wompi: {
      publicKey: 'pub_test',
      privateKey: 'prv_test',
      baseUrl: 'https://sandbox.wompi.co/v1',
      webhookSecret: SECRET,
    },
  },
}));

const { WompiClient } = await import('../modules/payments/wompi.client.js');
type WompiEvent = import('../modules/payments/wompi.client.js').WompiEvent;

let client: InstanceType<typeof WompiClient>;

beforeEach(() => {
  client = new WompiClient();
});

const construirEvento = (): WompiEvent => {
  const data = {
    transaction: {
      id: '01-1532941443-49201',
      amount_in_cents: 60000000,
      reference: 'CS-42-1730000000',
      status: 'APPROVED',
      currency: 'COP',
      payment_method_type: 'NEQUI',
    },
  };
  const properties = ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'];
  const timestamp = 1730000000;

  const concatenado =
    String(data.transaction.id) +
    String(data.transaction.status) +
    String(data.transaction.amount_in_cents) +
    String(timestamp) +
    SECRET;

  const checksum = crypto.createHash('sha256').update(concatenado, 'utf8').digest('hex');

  return {
    event: 'transaction.updated',
    data,
    environment: 'test',
    signature: { properties, checksum },
    timestamp,
  } as WompiEvent;
};

describe('verifyEventSignature', () => {
  it('acepta un evento con firma válida', () => {
    expect(client.verifyEventSignature(construirEvento())).toBe(true);
  });

  it('acepta el checksum en mayúsculas', () => {
    const evento = construirEvento();
    evento.signature.checksum = evento.signature.checksum.toUpperCase();
    expect(client.verifyEventSignature(evento)).toBe(true);
  });

  it('CRÍTICO: rechaza un evento con el monto manipulado', () => {
    const evento = construirEvento();
    evento.data.transaction.amount_in_cents = 1000;
    expect(client.verifyEventSignature(evento)).toBe(false);
  });

  it('CRÍTICO: rechaza una firma inventada con estado APPROVED', () => {
    const evento = construirEvento();
    evento.data.transaction.status = 'APPROVED';
    evento.signature.checksum = 'a'.repeat(64);
    expect(client.verifyEventSignature(evento)).toBe(false);
  });

  it('rechaza si el timestamp fue alterado', () => {
    const evento = construirEvento();
    evento.timestamp = 1730009999;
    expect(client.verifyEventSignature(evento)).toBe(false);
  });

  it('rechaza si falta el objeto signature', () => {
    const evento = construirEvento();
    delete (evento as any).signature;
    expect(client.verifyEventSignature(evento)).toBe(false);
  });

  it('rechaza si una propiedad firmada no existe en data', () => {
    const evento = construirEvento();
    evento.signature.properties = ['transaction.campo_inexistente'];
    expect(client.verifyEventSignature(evento)).toBe(false);
  });

  it('rechaza si el orden de las propiedades firmadas cambia', () => {
    const evento = construirEvento();
    evento.signature.properties = [
      'transaction.status',
      'transaction.id',
      'transaction.amount_in_cents',
    ];
    expect(client.verifyEventSignature(evento)).toBe(false);
  });
});
