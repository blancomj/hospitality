import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mysql from 'mysql2/promise';
import { config } from '../config/index.js';

const TEST_DB = process.env.TEST_DB_NAME || 'construescala_test';

let pool: mysql.Pool;
let hostId: number;
let guestAId: number;
let guestBId: number;
let propertyId: number;

beforeAll(async () => {
  if (TEST_DB === config.db.database) {
    throw new Error(
      'TEST_DB_NAME apunta a la misma base que la aplicación. ' +
      'Configura una base de datos de pruebas separada antes de continuar.'
    );
  }

  pool = mysql.createPool({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: TEST_DB,
    connectionLimit: 10,
    waitForConnections: true,
  });
});

afterAll(async () => {
  if (pool) await pool.end();
});

beforeEach(async () => {
  await pool.execute('DELETE FROM payouts');
  await pool.execute('DELETE FROM payments');
  await pool.execute('DELETE FROM bookings');
  await pool.execute('DELETE FROM availability_overrides');
  await pool.execute('DELETE FROM properties');
  await pool.execute('DELETE FROM host_profiles');
  await pool.execute('DELETE FROM users');

  const [hostRes] = await pool.execute<mysql.ResultSetHeader>(
    `INSERT INTO users (firebase_uid, email, full_name, role)
     VALUES ('test-host-uid', 'host@test.local', 'Host Test', 'host')`
  );
  hostId = hostRes.insertId;

  await pool.execute(
    `INSERT INTO host_profiles (user_id, approval_status) VALUES (?, 'approved')`,
    [hostId]
  );

  const [gaRes] = await pool.execute<mysql.ResultSetHeader>(
    `INSERT INTO users (firebase_uid, email, full_name, role)
     VALUES ('test-guest-a', 'a@test.local', 'Guest A', 'guest')`
  );
  guestAId = gaRes.insertId;

  const [gbRes] = await pool.execute<mysql.ResultSetHeader>(
    `INSERT INTO users (firebase_uid, email, full_name, role)
     VALUES ('test-guest-b', 'b@test.local', 'Guest B', 'guest')`
  );
  guestBId = gbRes.insertId;

  const [propRes] = await pool.execute<mysql.ResultSetHeader>(
    `INSERT INTO properties
       (host_id, title, city, property_type, max_guests, base_price_per_night, status)
     VALUES (?, 'Apto de prueba', 'Cartagena', 'apartamento', 4, 200000.00, 'published')`,
    [hostId]
  );
  propertyId = propRes.insertId;
});

const daysFromNow = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

describe('sp_create_booking — prevención de doble reserva', () => {
  it('permite una reserva válida', async () => {
    const [rows] = await pool.execute(
      'CALL sp_create_booking(?, ?, ?, ?, ?)',
      [propertyId, guestAId, daysFromNow(10), daysFromNow(13), 2]
    );
    const booking = (rows as any)[0][0];

    expect(booking.status).toBe('pending_payment');
    expect(Number(booking.total_amount)).toBe(600000);
  });

  it('CRÍTICO: dos reservas simultáneas solapadas → solo una sobrevive', async () => {
    const start = daysFromNow(20);
    const end = daysFromNow(23);

    const results = await Promise.allSettled([
      pool.execute('CALL sp_create_booking(?, ?, ?, ?, ?)', [propertyId, guestAId, start, end, 2]),
      pool.execute('CALL sp_create_booking(?, ?, ?, ?, ?)', [propertyId, guestBId, start, end, 2]),
    ]);

    const exitosas = results.filter((r) => r.status === 'fulfilled');
    const fallidas = results.filter((r) => r.status === 'rejected');

    expect(exitosas).toHaveLength(1);
    expect(fallidas).toHaveLength(1);

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total FROM bookings
       WHERE property_id = ? AND status IN ('pending_payment','confirmed')`,
      [propertyId]
    );
    expect(Number((countRows as any[])[0].total)).toBe(1);
  });

  it('rechaza fechas que se solapan parcialmente con una reserva existente', async () => {
    await pool.execute('CALL sp_create_booking(?, ?, ?, ?, ?)', [
      propertyId, guestAId, daysFromNow(30), daysFromNow(35), 2,
    ]);

    await expect(
      pool.execute('CALL sp_create_booking(?, ?, ?, ?, ?)', [
        propertyId, guestBId, daysFromNow(33), daysFromNow(38), 2,
      ])
    ).rejects.toThrow();
  });

  it('permite reservar días contiguos sin solapamiento (check-out = check-in)', async () => {
    await pool.execute('CALL sp_create_booking(?, ?, ?, ?, ?)', [
      propertyId, guestAId, daysFromNow(40), daysFromNow(43), 2,
    ]);

    const [rows] = await pool.execute('CALL sp_create_booking(?, ?, ?, ?, ?)', [
      propertyId, guestBId, daysFromNow(43), daysFromNow(45), 2,
    ]);
    expect((rows as any)[0][0].status).toBe('pending_payment');
  });

  it('rechaza fechas bloqueadas por el propietario', async () => {
    await pool.execute(
      `INSERT INTO availability_overrides (property_id, date, is_blocked)
       VALUES (?, ?, TRUE)`,
      [propertyId, daysFromNow(51)]
    );

    await expect(
      pool.execute('CALL sp_create_booking(?, ?, ?, ?, ?)', [
        propertyId, guestAId, daysFromNow(50), daysFromNow(53), 2,
      ])
    ).rejects.toThrow();
  });

  it('rechaza más huéspedes que la capacidad de la propiedad', async () => {
    await expect(
      pool.execute('CALL sp_create_booking(?, ?, ?, ?, ?)', [
        propertyId, guestAId, daysFromNow(60), daysFromNow(62), 10,
      ])
    ).rejects.toThrow();
  });

  it('rechaza fechas en el pasado', async () => {
    await expect(
      pool.execute('CALL sp_create_booking(?, ?, ?, ?, ?)', [
        propertyId, guestAId, daysFromNow(-5), daysFromNow(-2), 2,
      ])
    ).rejects.toThrow();
  });
});

describe('sp_create_booking — cálculo de precio', () => {
  it('REGRESIÓN: calcula bien estancias de más de 30 noches', async () => {
    const [rows] = await pool.execute('CALL sp_create_booking(?, ?, ?, ?, ?)', [
      propertyId, guestAId, daysFromNow(100), daysFromNow(145), 2,
    ]);
    const booking = (rows as any)[0][0];

    expect(Number(booking.total_nights)).toBe(45);
    expect(Number(booking.total_amount)).toBe(45 * 200000);
  });

  it('aplica precios especiales por fecha', async () => {
    await pool.execute(
      `INSERT INTO availability_overrides (property_id, date, special_price)
       VALUES (?, ?, 350000.00)`,
      [propertyId, daysFromNow(71)]
    );

    const [rows] = await pool.execute('CALL sp_create_booking(?, ?, ?, ?, ?)', [
      propertyId, guestAId, daysFromNow(70), daysFromNow(73), 2,
    ]);

    expect(Number((rows as any)[0][0].total_amount)).toBe(200000 + 350000 + 200000);
  });
});
