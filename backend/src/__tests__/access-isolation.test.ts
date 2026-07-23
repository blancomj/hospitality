import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';

const SECRET = 'test-access-secret';

const ID_GUEST = 1001;
const ID_HOST = 1002;
const ID_ADMIN = 1003;
const ID_SUSPENDIDO = 1004;

const usuarios: Record<number, { id: number; role: string; status: string }> = {
  [ID_GUEST]: { id: ID_GUEST, role: 'guest', status: 'active' },
  [ID_HOST]: { id: ID_HOST, role: 'host', status: 'active' },
  [ID_ADMIN]: { id: ID_ADMIN, role: 'admin', status: 'active' },
  [ID_SUSPENDIDO]: { id: ID_SUSPENDIDO, role: 'admin', status: 'suspended' },
};

vi.mock('../config/index.js', () => ({
  config: {
    port: 3001,
    nodeEnv: 'test',
    db: { host: 'localhost', port: 3306, user: 't', password: 't', database: 'test' },
    firebase: {},
    jwt: {
      accessSecret: SECRET,
      refreshSecret: SECRET + '-refresh',
      accessExpires: '15m',
      refreshExpires: '7d',
    },
    frontendUrl: 'http://localhost:5173',
    wompi: { baseUrl: 'https://sandbox.wompi.co/v1', webhookSecret: 'x' },
    brevo: {},
    exchangeRate: { apiUrl: '' },
  },
}));

vi.mock('../db/connection.js', () => {
  const execute = vi.fn(async (sql: string, params?: any[]) => {
    if (sql.includes('FROM users WHERE id')) {
      const u = usuarios[Number(params?.[0])];
      return [u ? [u] : [], []];
    }
    return [[], []];
  });
  return { default: { execute, query: execute, getConnection: vi.fn() } };
});

vi.mock('../modules/queue/queue.service.js', () => ({
  getQueueDashboard: () => (_req: any, _res: any, next: any) => next(),
}));

const request = (await import('supertest')).default;
const app = (await import('../app.js')).default;

const tokenPara = (userId: number): string =>
  jwt.sign({ userId }, SECRET, { expiresIn: '15m' });

const RUTAS_ADMIN: Array<[string, string]> = [
  ['get', '/api/v1/admin/dashboard'],
  ['get', '/api/v1/admin/users'],
  ['patch', '/api/v1/admin/users/1/status'],
  ['get', '/api/v1/admin/properties'],
  ['patch', '/api/v1/admin/properties/1/moderate'],
  ['get', '/api/v1/admin/bookings/1/timeline'],
  ['post', '/api/v1/admin/bookings/1/force-cancel'],
  ['get', '/api/v1/admin/settings'],
  ['put', '/api/v1/admin/settings/default_commission_rate'],
  ['get', '/api/v1/admin/audit-log'],
  ['post', '/api/v1/admin/amenity-catalog'],
  ['patch', '/api/v1/admin/payouts/1/hold'],
  ['post', '/api/v1/payouts/run'],
  ['post', '/api/v1/host-approvals'],
  ['get', '/api/v1/host-approvals/pending'],
  ['get', '/api/v1/admin/payouts'],
  ['get', '/api/v1/admin/reports/commissions'],
  ['post', '/api/v1/payouts/1/confirm'],
  ['post', '/api/v1/payouts/1/fail'],
  ['post', '/api/v1/bookings/1/refund'],
];

const RUTAS_HOST: Array<[string, string]> = [
  ['get', '/api/v1/host/dashboard'],
  ['get', '/api/v1/host/calendar'],
  ['get', '/api/v1/host/bookings'],
  ['get', '/api/v1/host/finances'],
];

const RUTAS_CRON: Array<[string, string]> = [
  ['post', '/api/v1/payments/expire'],
  ['post', '/api/v1/ical/sync'],
];

const llamar = (metodo: string, ruta: string, token?: string) => {
  const r = (request(app) as any)[metodo](ruta);
  return token ? r.set('Authorization', `Bearer ${token}`) : r;
};

describe('Aislamiento — rutas de administración', () => {
  it.each(RUTAS_ADMIN)('un huésped recibe 403 en %s %s', async (metodo, ruta) => {
    const res = await llamar(metodo, ruta, tokenPara(ID_GUEST));
    expect(res.status).toBe(403);
  });

  it.each(RUTAS_ADMIN)('un propietario recibe 403 en %s %s', async (metodo, ruta) => {
    const res = await llamar(metodo, ruta, tokenPara(ID_HOST));
    expect(res.status).toBe(403);
  });

  it.each(RUTAS_ADMIN)('sin token, %s %s responde 401', async (metodo, ruta) => {
    const res = await llamar(metodo, ruta);
    expect(res.status).toBe(401);
  });
});

describe('Aislamiento — panel de propietario', () => {
  it.each(RUTAS_HOST)('un huésped recibe 403 en %s %s', async (metodo, ruta) => {
    const res = await llamar(metodo, ruta, tokenPara(ID_GUEST));
    expect(res.status).toBe(403);
  });

  it.each(RUTAS_HOST)('sin token, %s %s responde 401', async (metodo, ruta) => {
    const res = await llamar(metodo, ruta);
    expect(res.status).toBe(401);
  });
});

describe('Aislamiento — endpoints de cron', () => {
  it.each(RUTAS_CRON)('%s %s no es accesible sin el secreto', async (metodo, ruta) => {
    const res = await llamar(metodo, ruta);
    expect([401, 403, 503]).toContain(res.status);
  });

  it.each(RUTAS_CRON)('%s %s rechaza un secreto inválido', async (metodo, ruta) => {
    const res = await llamar(metodo, ruta).set('x-cron-secret', 'secreto-incorrecto');
    expect([401, 403, 503]).toContain(res.status);
  });

  it.each(RUTAS_CRON)('%s %s tampoco lo abre un token de usuario', async (metodo, ruta) => {
    const res = await llamar(metodo, ruta, tokenPara(ID_ADMIN));
    expect([401, 403, 503]).toContain(res.status);
  });
});

describe('Aislamiento — validación de tokens', () => {
  it('rechaza un JWT expirado', async () => {
    const expirado = jwt.sign({ userId: ID_ADMIN }, SECRET, { expiresIn: '-1h' });
    const res = await llamar('get', '/api/v1/admin/dashboard', expirado);
    expect(res.status).toBe(401);
  });

  it('CRÍTICO: rechaza un JWT firmado con otro secreto', async () => {
    const falsificado = jwt.sign({ userId: ID_ADMIN }, 'secreto-de-atacante', { expiresIn: '15m' });
    const res = await llamar('get', '/api/v1/admin/dashboard', falsificado);
    expect(res.status).toBe(401);
  });

  it('rechaza a un admin con la cuenta suspendida', async () => {
    const res = await llamar('get', '/api/v1/admin/dashboard', tokenPara(ID_SUSPENDIDO));
    expect(res.status).toBe(403);
  });

  it('rechaza un token de un usuario inexistente', async () => {
    const res = await llamar('get', '/api/v1/admin/dashboard', tokenPara(999999));
    expect(res.status).toBe(401);
  });
});
