# Guía de integración — Migración a Firebase Auth (arquitectura híbrida)

Firebase gestiona la **identidad** (Google, correo/contraseña, magic link). Tu backend sigue emitiendo su **JWT propio** y MySQL sigue siendo la fuente de verdad de los datos de negocio. Solo cambia el punto de entrada del login; el resto de la app (middleware, refresh, sección 5.1, todos los módulos) queda intacto.

Esto también corrige los 3 bugs del login que existían: el botón del navbar disparaba un evento que nadie escuchaba, la `LoginView` no estaba registrada en el router, y el botón de Google era un `alert()` placeholder.

---

## 1. Instalar dependencias

```bash
# Backend
cd backend
npm install firebase-admin

# Frontend
cd ../frontend
npm install firebase
```

## 2. Configurar el proyecto de Firebase (consola)

1. Crea un proyecto en https://console.firebase.google.com
2. **Authentication > Sign-in method**, habilita: **Google**, **Correo/contraseña**, y dentro de correo/contraseña activa también **Vínculos de correo electrónico (inicio de sesión sin contraseña)** para el magic link.
3. **Configuración del proyecto > General > Tus apps > App web**: copia el objeto `firebaseConfig` → va al `.env` del frontend.
4. **Configuración del proyecto > Cuentas de servicio > Generar nueva clave privada**: descarga el JSON → sus campos van al `.env` del backend.
5. **Authentication > Settings > Authorized domains**: agrega tu dominio de producción y `localhost` para desarrollo.

## 3. Variables de entorno

- Backend: agrega a `backend/.env` las variables de `backend/.env.firebase.example`.
- Frontend: agrega a `frontend/.env` las variables de `frontend/.env.firebase.example`.

**La private key del backend nunca se sube a git.** Verifica que `.env` esté en `.gitignore` (ya lo está en este repo).

## 4. Archivos a reemplazar / agregar

### Backend
| Acción       | Archivo                                    |
|---           |                                         ---|
| **Agregar**  | `src/modules/auth/firebase-admin.ts`       |
| Reemplazar   | `src/modules/auth/auth.service.ts`         |
| Reemplazar   | `src/modules/auth/auth.controller.ts`      |
| Reemplazar   | `src/modules/auth/auth.routes.ts`          |
| Reemplazar   | `src/config/index.ts`                      |
| **Agregar**  | `src/db/migrations/040_firebase_auth.sql`  |

### Frontend
| Acción             | Archivo               |
|---                 |                    ---|
| **Agregar**        | `src/lib/firebase.ts` |
| Reemplazar         | `src/stores/auth.ts`  |
| Reemplazar         | `src/features/auth/LoginView.vue` |
| Reemplazar         | `src/components/base/AppShell.vue` |
| Reemplazar         | `src/router/index.ts` |
| Fusionar claves    | `src/locales/es.json` (bloque de `locales/auth-es.json`) |
| Fusionar claves    | `src/locales/en.json` (bloque de `locales/auth-en.json`) |

> Las claves i18n se entregan como archivos `auth-es.json` / `auth-en.json` con el objeto `auth` completo: reemplaza el objeto `auth` existente en tus `es.json`/`en.json` por este (es una superset del actual, no pierdes claves).

## 5. Ejecutar la migración de base de datos

```bash
cd backend
npm run migrate   # o el comando que uses; aplica 040_firebase_auth.sql
```

La migración agrega `firebase_uid` a `users`, crea `sp_upsert_firebase_user`, y **conserva** `google_id` como columna legada (nullable) para no perder datos. Si tu base está vacía, puedes borrar la columna vieja después:
```sql
ALTER TABLE users DROP COLUMN google_id;
DROP PROCEDURE IF EXISTS sp_upsert_google_user;
```

## 6. Qué NO cambió (y por qué es bueno)

- `auth.middleware.ts`, `requireRole.ts`, `requireOwnership.ts` → intactos.
- El JWT propio, el refresh token y `/users/me` → intactos.
- Todos los módulos (bookings, payments, admin, etc.) → intactos.
- La sección 5.1 de control de acceso → sigue vigente sin cambios.

El único contacto nuevo con Firebase es: el frontend autentica con Firebase → obtiene ID token → lo manda a `POST /auth/firebase` → el backend lo valida una vez y emite tu JWT. De ahí en adelante, todo funciona como antes.

## 7. Prueba de humo (verificación rápida)

1. `npm run dev` en backend y frontend.
2. Clic en "Iniciar sesión" en el navbar → debe navegar a `/es/login` (antes no hacía nada).
3. Probar los tres caminos:
   - **Google**: abre popup, al completar entra y redirige a perfil.
   - **Correo/contraseña**: registrarse con un correo nuevo → luego cerrar sesión → iniciar sesión con esas credenciales.
   - **Magic link**: cambiar a "recibir enlace por correo", enviar, abrir el enlace del correo → debe completar el login al volver a `/es/login`.
4. Verificar en MySQL que se creó un solo registro en `users` con `firebase_uid` poblado. Al entrar con Google y luego con correo usando el **mismo email**, debe seguir siendo **un solo** registro (vinculación por email en el SP).

## 8. Nota sobre el flujo de magic link

El `actionCodeSettings.url` en `stores/auth.ts` apunta a `/es/login`. Si quieres soportar el retorno del magic link en inglés (`/en/login`), puedes hacer esa URL dependiente del locale activo. Se dejó fijo en español por simplicidad; es un ajuste menor si lo necesitas.
