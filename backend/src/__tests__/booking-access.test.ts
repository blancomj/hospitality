import { describe, it, expect, vi } from 'vitest';
import jwt from 'jsonwebtoken';

const SECRET = 'test-access-secret';

const ID_HOST_PROPIETARIO = 2001;
const ID_HOST_INTRUSO = 2002;
const ID_ADMIN = 2003;
const ID_GUEST = 2004;

const PROPIEDAD_DEL_PROPIETARIO = 77;

const usuarios: Record<number, { id: number; role: string; status: string }> = {
  [ID_HOST_PROPIETARIO]: { id: ID_HOST_PROPIETARIO, role: 'host', status: 'active' },
  [ID_HOST_INTRUSO]: { id: ID_HOST_INTRUSO, role: 'host', status: 'active' },
  [ID_ADMIN]: { id: ID_ADMIN, role: 'admin', status: 'active' },
  [ID_GUEST]: { id: ID_GUEST, role: 'guest', status: 'active' },
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
    wompi: { baseUrl: 'https://sandbox.wompi.co/v1', webhookSecret: 'x', integritySecret: 'y' },
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

    // requireOwnership consulta el dueño de la propiedad.
    if (sql.includes('FROM properties WHERE id')) {
      if (Number(params?.[0]) === PROPIEDAD_DEL_PROPIETARIO) {
        return [[{ host_id: ID_HOST_PROPIETARIO }], []];
      }
      return [[], []];
    }

    // v_bookings_detail: datos sensibles del huésped.
    if (sql.includes('v_bookings_detail')) {
      return [
        [
          {
            booking_id: 1,
            property_id: PROPIEDAD_DEL_PROPIETARIO,
            guest_name: 'Huésped Privado',
            guest_email: 'privado@ejemplo.com',
            guest_phone: '+57 300 0000000',
          },
        ],
        [],
      ];
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

// El middleware `authenticate` firma y lee { userId }: el rol se resuelve
// contra la base, no se toma del token.
const tokenDe = (userId: number): string =>
  jwt.sign({ userId }, SECRET, { expiresIn: '15m' });

/**
 * Antes de la corrección, esta ruta sólo tenía requireRole('host','admin').
 * Cualquier anfitrión registrado podía leer las reservas de cualquier
 * propiedad, incluidos nombre, correo y teléfono de los huéspedes.
 */
describe('Aislamiento — reservas por propiedad', () => {
  const ruta = `/api/v1/bookings/property/${PROPIEDAD_DEL_PROPIETARIO}`;

  it('el dueño de la propiedad sí puede consultarlas', async () => {
    const res = await request(app)
      .get(ruta)
      .set('Authorization', `Bearer ${tokenDe(ID_HOST_PROPIETARIO)}`);

    expect(res.status).toBe(200);
    expect(res.body.bookings).toBeDefined();
  });

  it('otro anfitrión NO puede consultarlas', async () => {
    const res = await request(app)
      .get(ruta)
      .set('Authorization', `Bearer ${tokenDe(ID_HOST_INTRUSO)}`);

    expect(res.status).toBe(403);
    // Y sobre todo: nada de datos del huésped en la respuesta.
    expect(JSON.stringify(res.body)).not.toContain('privado@ejemplo.com');
    expect(JSON.stringify(res.body)).not.toContain('Huésped Privado');
  });

  it('un huésped tampoco, aunque esté autenticado', async () => {
    const res = await request(app)
      .get(ruta)
      .set('Authorization', `Bearer ${tokenDe(ID_GUEST)}`);

    expect(res.status).toBe(403);
  });

  it('sin token responde 401', async () => {
    const res = await request(app).get(ruta);
    expect(res.status).toBe(401);
  });

  it('el administrador conserva el acceso', async () => {
    const res = await request(app)
      .get(ruta)
      .set('Authorization', `Bearer ${tokenDe(ID_ADMIN)}`);

    expect(res.status).toBe(200);
  });

  it('una propiedad inexistente responde 404, no 200 con lista vacía', async () => {
    const res = await request(app)
      .get('/api/v1/bookings/property/99999')
      .set('Authorization', `Bearer ${tokenDe(ID_HOST_PROPIETARIO)}`);

    expect(res.status).toBe(404);
  });
});

describe('Aislamiento — cola de reembolsos', () => {
  it('un anfitrión no puede listar las solicitudes de reembolso', async () => {
    const res = await request(app)
      .get('/api/v1/refunds')
      .set('Authorization', `Bearer ${tokenDe(ID_HOST_PROPIETARIO)}`);

    expect(res.status).toBe(403);
  });

  it('un anfitrión no puede aprobar un reembolso', async () => {
    const res = await request(app)
      .post('/api/v1/refunds/1/approve')
      .set('Authorization', `Bearer ${tokenDe(ID_HOST_PROPIETARIO)}`);

    expect(res.status).toBe(403);
  });

  it('sin autenticación tampoco', async () => {
    const res = await request(app).post('/api/v1/refunds/1/approve');
    expect(res.status).toBe(401);
  });
});

describe('Montaje: el guard de reembolsos no invade el resto de /api/v1', () => {
  it('los ajustes públicos siguen siendo accesibles sin token', async () => {
    const res = await request(app).get('/api/v1/settings/public');
    expect(res.status).toBe(200);
    expect(res.body.settings).toBeDefined();
  });
});
