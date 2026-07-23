import { describe, it, expect, vi } from 'vitest';
import jwt from 'jsonwebtoken';

const SECRET = 'test-secret';
const usuarios: Record<number, any> = {
  1: { id: 1, role: 'guest', status: 'active' },
  2: { id: 2, role: 'host', status: 'active' },
  3: { id: 3, role: 'admin', status: 'active' },
};

vi.mock('../config/index.js', () => ({
  config: {
    port: 3001, nodeEnv: 'test',
    db: { host: 'l', port: 3306, user: 't', password: 't', database: 'test' },
    firebase: {},
    jwt: { accessSecret: SECRET, refreshSecret: SECRET, accessExpires: '15m', refreshExpires: '7d' },
    frontendUrl: 'http://localhost:5173',
    wompi: { baseUrl: '', webhookSecret: 'x' }, brevo: {}, exchangeRate: { apiUrl: '' },
  },
}));

vi.mock('../db/connection.js', () => {
  const execute = vi.fn(async (sql: string, p?: any[]) => {
    if (sql.includes('FROM users WHERE id')) {
      const u = usuarios[Number(p?.[0])];
      return [u ? [u] : [], []];
    }
    return [[[]], []];
  });
  return { default: { execute, query: execute, getConnection: vi.fn() } };
});
vi.mock('../modules/queue/queue.service.js', () => ({
  getQueueDashboard: () => (_r: any, _s: any, n: any) => n(),
}));

const request = (await import('supertest')).default;
const app = (await import('../app.js')).default;
const token = (id: number) => jwt.sign({ userId: id }, SECRET, { expiresIn: '15m' });

describe('Montaje de rutas: los guards no invaden otros módulos', () => {
  it('un HOST debe poder entrar a /host/dashboard (no 403)', async () => {
    const res = await request(app).get('/api/v1/host/dashboard')
      .set('Authorization', `Bearer ${token(2)}`);
    expect(res.status).not.toBe(403);
  });

  it('/exchange-rates es público y no debe pedir sesión', async () => {
    const res = await request(app).get('/api/v1/exchange-rates');
    expect([200, 500]).toContain(res.status);
  });

  it('el export iCal es público (lo consume Airbnb/Booking)', async () => {
    const res = await request(app).get('/api/v1/properties/1/ical/abc.ics');
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it('un GUEST debe poder ver sus favoritos', async () => {
    const res = await request(app).get('/api/v1/users/me/favorites')
      .set('Authorization', `Bearer ${token(1)}`);
    expect(res.status).not.toBe(403);
  });
});
