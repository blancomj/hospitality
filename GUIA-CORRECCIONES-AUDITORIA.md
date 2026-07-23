# Correcciones de auditoría — Guía de aplicación

Corrige todo lo detectado en la auditoría **excepto el CRÍTICO 1** (rotación de credenciales), que es una tarea operativa tuya en Hostinger/Firebase/Wompi.

**Estado verificado:** backend y frontend compilan sin errores (`tsc --noEmit` y `vue-tsc --noEmit` en 0) y **86 pruebas pasan** con los archivos aplicados sobre el repo real.

---

## 1. Instalar dependencias nuevas

```bash
cd backend
npm install helmet express-rate-limit
npm install -D vitest supertest @types/supertest
```

(El `package.json` incluido ya las declara; basta con `npm install` si lo reemplazas.)

## 2. Archivos a reemplazar / agregar

### Backend — seguridad y autorización

| Acción | Archivo | Qué corrige |
|---|---|---|
| Reemplazar | `src/app.ts` | helmet, 3 rate limiters, Bull Board detrás de rol admin |
| **Agregar** | `src/middleware/requireCronSecret.ts` | Protege endpoints de cron que estaban abiertos |
| Reemplazar | `src/modules/admin/admin.routes.ts` | `requireRole('admin')` por grupo |
| Reemplazar | `src/modules/host-panel/host-panel.routes.ts` | `requireRole('host','admin')` por grupo |
| Reemplazar | `src/modules/payments/payouts.routes.ts` | Separado en router admin / router host |
| Reemplazar | `src/modules/payments/payments.routes.ts` | Refund solo admin; cron protegido |
| Reemplazar | `src/modules/ical/ical.routes.ts` | `/ical/sync` protegido; roles en ical-links |
| Reemplazar | `src/modules/auth/auth.routes.ts` | Elimina `/auth/google` (vía paralela) |
| Reemplazar | `src/modules/auth/auth.service.ts` | Elimina código muerto de Google OAuth y el fallback silencioso |
| Reemplazar | `src/modules/auth/auth.controller.ts` | Elimina `googleLogin` |

### Backend — pagos

| Acción | Archivo | Qué corrige |
|---|---|---|
| Reemplazar | `src/modules/payments/wompi.client.ts` | Firma reescrita según especificación real de Wompi |
| Reemplazar | `src/modules/payments/payments.service.ts` | Parseo del body crudo + idempotencia |
| Reemplazar | `src/modules/payments/payments.controller.ts` | Webhook simplificado |

### Backend — base de datos

| Acción | Archivo | Qué corrige |
|---|---|---|
| **Agregar** | `src/db/migrations/048_fix_booking_calculation_and_settings.sql` | Bug de 30 noches, `platform_settings`, transacción en `sp_confirm_payment` |

### Backend — pruebas

| Acción | Archivo |
|---|---|
| **Agregar** | `vitest.config.ts` |
| **Agregar** | `src/__tests__/access-isolation.test.ts` (78 pruebas) |
| **Agregar** | `src/__tests__/wompi-signature.test.ts` (8 pruebas) |
| **Agregar** | `src/__tests__/booking-concurrency.test.ts` (requiere BD de pruebas) |
| Reemplazar | `package.json` (scripts `test`, `test:watch` + dependencias) |

### Backend — propiedades

| Acción | Archivo | Qué corrige |
|---|---|---|
| **Agregar** | `src/modules/properties/video-url.util.ts` | Valida URLs de video por proveedor |
| Reemplazar | `src/modules/properties/properties.controller.ts` | Usa la validación en `addVideo` |

### Frontend

| Acción | Archivo | Qué corrige |
|---|---|---|
| Reemplazar | `src/components/property/PropertyGallery.vue` | Patrón fachada: miniatura → iframe al hacer clic |

### Raíz y configuración

| Acción | Archivo | Qué corrige |
|---|---|---|
| Reemplazar | `.gitignore` | Quita la regla `*.json` global |
| Reemplazar | `backend/.env.example` | Sin credenciales reales; añade `CRON_SECRET` y `TEST_DB_NAME` |
| Reemplazar | `frontend/.env.example` | Corrige el typo `t"hospitality-..."` |

## 3. Aplicar la migración

```bash
cd backend
npm run migrate
```

La 048 recrea `sp_create_booking` y `sp_confirm_payment`, y añade las funciones `fn_setting_int` / `fn_setting_decimal`.

> **Requiere permisos `CREATE ROUTINE`** en MySQL. Si Hostinger no los concede en tu plan, la migración fallará y habrá que ejecutarla desde phpMyAdmin con un usuario que sí los tenga.

## 4. Configurar el cron

Añade a `backend/.env`:
```bash
CRON_SECRET=$(openssl rand -hex 32)
```

Y actualiza los cron jobs en hPanel para que envíen la cabecera:
```bash
curl -X POST https://tu-dominio/api/v1/payments/expire -H "x-cron-secret: TU_SECRETO"
curl -X POST https://tu-dominio/api/v1/ical/sync       -H "x-cron-secret: TU_SECRETO"
```

**Si no configuras `CRON_SECRET`, estos endpoints responden 503** — es deliberado: preferible que el cron falle de forma visible a dejar un endpoint abierto.

## 5. Ejecutar las pruebas

```bash
cd backend
npm test
```

Las de aislamiento y firma corren sin infraestructura (86 pruebas). La de concurrencia de reservas necesita una base de pruebas:

```sql
CREATE DATABASE construescala_test;
```
Aplica todas las migraciones sobre ella y define `TEST_DB_NAME=construescala_test`. La prueba aborta si `TEST_DB_NAME` coincide con la base de la aplicación, porque borra tablas.

---

## Cambios que rompen compatibilidad

1. **`POST /auth/google` ya no existe.** Si algún cliente lo llama, migrar a `/auth/firebase`. El frontend actual ya usa Firebase, así que no debería afectar.
2. **Los endpoints de cron exigen `x-cron-secret`.** Actualiza los cron jobs antes de desplegar o dejarán de correr.
3. **`/admin/queues` exige sesión admin.** Antes solo funcionaba en desarrollo; ahora funciona en cualquier entorno pero pide token de admin. Como Bull Board se abre en el navegador y no envía el header `Authorization`, necesitarás una sesión de admin por cookie o un proxy autenticado para usarlo — es un compromiso consciente a favor de la seguridad.

---

## Hallazgos adicionales encontrados al corregir

No estaban en la auditoría inicial; aparecieron al tocar el código:

1. **Dos endpoints de cron totalmente abiertos:** `/payments/expire` e `/ical/sync` no tenían ninguna autenticación. Cualquiera podía expirar reservas pendientes ajenas o saturar el servidor con descargas de calendarios externos.
2. **`sp_confirm_payment` sin transacción:** escribía en `payments`, `bookings` y `payouts` sin atomicidad. Un fallo a mitad dejaba el pago aprobado sin payout asociado, o la reserva confirmada sin registro de comisión.
3. **Comisión NULL si el propietario no tiene `host_profiles`:** el `COALESCE` interno no cubría el caso de que la consulta no devolviera filas, y se insertaba un payout con montos NULL.
4. **Webhook sin idempotencia:** Wompi reintenta eventos. Sin control, un mismo pago podía confirmarse dos veces y generar **dos payouts** para la misma reserva.
5. **`upsertFirebaseUserFallback` guardaba usuarios sin `firebase_uid`:** un fallback silencioso que, si faltaba el procedimiento, creaba el usuario solo por email, dejándolo sin vínculo con Firebase. Ahora falla de forma visible pidiendo aplicar migraciones.
6. **El badge de play bloqueaba los controles del video:** estaba superpuesto sobre el iframe, así que el usuario no podía pausar ni ajustar volumen.
7. **`auth.service.ts` instanciaba un `OAuth2Client` al cargar el módulo:** hacía fallar el arranque completo si faltaba `GOOGLE_CLIENT_ID`, incluso sin usar Google.

---

## Pendientes que NO se corrigieron (decisión consciente)

| Tema | Por qué se deja | Recomendación |
|---|---|---|
| **Tokens en `localStorage`** | Cambiarlo a cookies `httpOnly` toca el flujo de auth completo (backend, interceptores de axios, refresh) y merece su propia iteración con pruebas. | Migrar antes de producción. |
| **Archivos `temporary_*.sql`** | Borrarlos es trivial, pero primero hay que confirmar que `npm run migrate` sobre una base vacía reproduce el esquema completo sin ellos. | Verificar y luego eliminar `temporary_all_tables.sql`, `temporary_all_stored_procedures.sql` y `run-042.ts`. |
| **Deriva de esquema** (migraciones 041–047 de tipo `fix`) | Requiere comparar el esquema real contra el que producen las migraciones. | Levantar una BD limpia, correr `npm run migrate`, y comparar con `mysqldump --no-data` contra producción. |
| **`auth.middleware.ts` consulta `google_id`** | Funciona (la columna sigue existiendo), pero es residuo de antes de Firebase. | Cambiar a `firebase_uid` cuando limpies la columna legada. |

---

## Recordatorio sobre el CRÍTICO 1

Nada de esto protege el sistema mientras la contraseña de MySQL y los secretos JWT sigan publicados en el historial de git. Con esos secretos, cualquiera puede firmar un token de admin válido y **todas las correcciones de autorización de esta entrega quedan sin efecto**.

Rota primero. Luego aplica esto.
