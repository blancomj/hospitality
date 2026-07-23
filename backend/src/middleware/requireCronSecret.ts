import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * Protege endpoints que dispara el cron del hosting (expiración de reservas,
 * sincronización iCal, actualización de tasas de cambio, etc.).
 *
 * Acepta la petición si la cabecera `x-cron-secret` coincide con CRON_SECRET.
 * La comparación es timing-safe para no filtrar el secreto por diferencias de
 * tiempo de respuesta.
 *
 * Configuración en Hostinger (hPanel > Cron Jobs):
 *   curl -X POST https://tu-dominio/api/v1/payments/expire \
 *        -H "x-cron-secret: $CRON_SECRET"
 *
 * Si CRON_SECRET no está definido, se rechaza todo: es preferible que el cron
 * falle de forma visible a dejar un endpoint abierto sin darse cuenta.
 */
export const requireCronSecret = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const expected = process.env.CRON_SECRET;

  if (!expected) {
    console.error('CRON_SECRET no está configurado: se rechaza la petición de cron.');
    res.status(503).json({
      error: 'Tarea programada no configurada en el servidor',
      code: 'CRON_NOT_CONFIGURED',
    });
    return;
  }

  const received = Array.isArray(req.headers['x-cron-secret'])
    ? req.headers['x-cron-secret'][0]
    : req.headers['x-cron-secret'];

  if (!received) {
    res.status(401).json({ error: 'Falta la cabecera x-cron-secret', code: 'CRON_SECRET_MISSING' });
    return;
  }

  const a = Buffer.from(received);
  const b = Buffer.from(expected);

  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    res.status(403).json({ error: 'Secreto de cron inválido', code: 'CRON_SECRET_INVALID' });
    return;
  }

  next();
};
