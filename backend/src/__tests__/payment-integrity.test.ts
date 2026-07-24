import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

import { splitSqlStatements } from '../db/migrate.js';
import { toCents, fromCents } from '../modules/payments/money.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, '..', 'db', 'migrations');

describe('splitSqlStatements', () => {
  it('interpreta DELIMITER y no lo deja pasar al servidor', () => {
    const sql = `
DROP PROCEDURE IF EXISTS sp_demo;

DELIMITER //

CREATE PROCEDURE sp_demo()
BEGIN
  SELECT 1;
  SELECT 2;
END //

DELIMITER ;
`;

    const statements = splitSqlStatements(sql);

    expect(statements).toHaveLength(2);
    expect(statements[0]).toContain('DROP PROCEDURE');
    expect(statements[1]).toContain('CREATE PROCEDURE');
    // El cuerpo del procedimiento debe llegar entero, no partido por sus ';'
    expect(statements[1]).toContain('SELECT 1;');
    expect(statements[1]).toContain('SELECT 2;');
    expect(statements.some((s) => /DELIMITER/i.test(s))).toBe(false);
  });

  it('no corta en un punto y coma dentro de una cadena', () => {
    const sql = `SELECT 'a;b' AS x; SELECT 2;`;
    const statements = splitSqlStatements(sql);

    expect(statements).toHaveLength(2);
    expect(statements[0]).toBe("SELECT 'a;b' AS x");
  });

  it('no corta en un punto y coma dentro de un comentario', () => {
    const sql = `-- esto; no corta\nSELECT 1;\nSELECT 2;`;
    const statements = splitSqlStatements(sql);

    expect(statements).toHaveLength(2);
  });

  it('descarta fragmentos que sólo son comentarios', () => {
    const statements = splitSqlStatements('-- solo un comentario\n');
    expect(statements).toHaveLength(0);
  });

  /**
   * Esta es la prueba que importa: si alguien añade una migración con
   * procedimientos y el separador no la maneja, el despliegue falla en
   * producción, no aquí. Recorre las migraciones reales.
   */
  it('divide todas las migraciones del repositorio sin perder procedimientos', () => {
    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => /^\d{3}_.*\.sql$/.test(f))
      .sort();

    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
      const statements = splitSqlStatements(sql);

      const declared = (sql.match(/CREATE\s+(PROCEDURE|FUNCTION)/gi) || []).length;
      const produced = statements.filter((s) =>
        /CREATE\s+(PROCEDURE|FUNCTION)/i.test(s)
      ).length;

      expect(produced, `${file}: procedimientos perdidos al dividir`).toBe(declared);
      expect(
        statements.some((s) => /^\s*DELIMITER/i.test(s)),
        `${file}: DELIMITER llegaría al servidor`
      ).toBe(false);
    }
  });
});

describe('toCents', () => {
  it('convierte pesos a centavos sin error de coma flotante', () => {
    // 450000.05 * 100 en coma flotante da 45000004.999999996
    expect(toCents('450000.05')).toBe(45000005);
    expect(toCents(450000.05)).toBe(45000005);
  });

  it('acepta el string que devuelve MySQL para DECIMAL', () => {
    expect(toCents('1200000.00')).toBe(120000000);
  });

  it('maneja enteros sin decimales', () => {
    expect(toCents(350000)).toBe(35000000);
    expect(toCents('350000')).toBe(35000000);
  });

  it('trunca a dos decimales', () => {
    expect(toCents('10.999')).toBe(1099);
  });

  it('rechaza valores no numéricos en vez de producir NaN', () => {
    expect(() => toCents('abc')).toThrow();
    expect(() => toCents('')).toThrow();
  });

  it('fromCents es la operación inversa', () => {
    expect(fromCents(45000005)).toBe(450000.05);
  });
});

describe('firma de integridad de Wompi', () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env.WOMPI_INTEGRITY_SECRET = 'test_integrity_secret';
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('coincide con SHA256(reference + amountInCents + currency + secreto)', async () => {
    const { WompiClient } = await import('../modules/payments/wompi.client.js');
    const client = new WompiClient();

    const reference = 'CS-42-1753300000-0007';
    const amountInCents = 45000000;
    const currency = 'COP';

    const expected = crypto
      .createHash('sha256')
      .update(`${reference}${amountInCents}${currency}test_integrity_secret`, 'utf8')
      .digest('hex');

    expect(client.buildIntegritySignature(reference, amountInCents, currency)).toBe(
      expected
    );
  });

  it('cambia si cambia el monto: es lo que impide alterarlo desde el navegador', async () => {
    const { WompiClient } = await import('../modules/payments/wompi.client.js');
    const client = new WompiClient();

    const honest = client.buildIntegritySignature('CS-1-x', 45000000, 'COP');
    const tampered = client.buildIntegritySignature('CS-1-x', 100, 'COP');

    expect(honest).not.toBe(tampered);
  });

  it('rechaza montos no enteros: Wompi sólo acepta centavos enteros', async () => {
    const { WompiClient } = await import('../modules/payments/wompi.client.js');
    const client = new WompiClient();

    expect(() => client.buildIntegritySignature('CS-1-x', 450000.5, 'COP')).toThrow();
    expect(() => client.buildIntegritySignature('CS-1-x', 0, 'COP')).toThrow();
  });

  it('falla de forma explícita si falta el secreto, en vez de firmar mal', async () => {
    delete process.env.WOMPI_INTEGRITY_SECRET;
    vi.resetModules();

    const { WompiClient } = await import('../modules/payments/wompi.client.js');
    const client = new WompiClient();

    expect(() => client.buildIntegritySignature('CS-1-x', 100, 'COP')).toThrow(
      /WOMPI_INTEGRITY_SECRET/
    );
  });
});
