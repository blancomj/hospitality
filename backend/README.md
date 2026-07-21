# CONSTRUESCALA Hospitality - Backend API

## Stack
- Node.js + Express
- MySQL 8 (Hostinger)
- Google OAuth + JWT
- Zod (validación)

## Inicio rápido

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar variables de entorno
```bash
cp .env.example .env
# Editar .env con tus valores
```

### 3. Ejecutar migraciones
```bash
npm run migrate
```

### 4. Iniciar servidor de desarrollo
```bash
npm run dev
```

El servidor correrá en `http://localhost:3001`

## Endpoints (Etapa 1)

### Auth
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/v1/auth/google` | Login con Google |
| POST | `/api/v1/auth/refresh` | Renovar access token |
| POST | `/api/v1/auth/logout` | Cerrar sesión |

### Users
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/v1/users/me` | Obtener perfil |
| PATCH | `/api/v1/users/me` | Actualizar perfil |
| POST | `/api/v1/users/me/become-host` | Convertirse en propietario |

### Host Profiles
| Método | Ruta | Descripción |
|--------|------|-------------|
| PATCH | `/api/v1/host-profiles/me` | Actualizar datos KYC |

## Estructura
```
src/
├── config/              # Configuración
│   └── index.js
├── db/
│   ├── migrations/      # Migraciones SQL
│   │   ├── 001_create_users.sql
│   │   ├── 002_create_host_profiles.sql
│   │   └── 003_sp_upsert_google_user.sql
│   ├── connection.js    # Pool MySQL
│   └── migrate.js       # Runner de migraciones
├── middleware/
│   ├── auth.middleware.js    # Autenticación JWT
│   ├── requireRole.js       # Autorización por rol
│   └── requireOwnership.js  # Verificación de propiedad
├── modules/
│   ├── auth/
│   │   ├── auth.routes.js
│   │   ├── auth.controller.js
│   │   └── auth.service.js
│   ├── users/
│   │   ├── users.routes.js
│   │   └── users.controller.js
│   └── host-profiles/
│       └── host-profiles.routes.js
├── app.js
└── server.js
```

## Base de datos

### Tablas (Etapa 1)
- `users` - Usuarios de la plataforma
- `host_profiles` - Datos KYC de propietarios

### Stored Procedures
- `sp_upsert_google_user` - Crear o encontrar usuario por Google ID

## Variables de entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| PORT | Puerto del servidor | 3001 |
| DB_HOST | Host de MySQL | localhost |
| DB_PORT | Puerto de MySQL | 3306 |
| DB_USER | Usuario de MySQL | root |
| DB_PASSWORD | Contraseña de MySQL | |
| DB_NAME | Nombre de la base de datos | construescala_hospitality |
| GOOGLE_CLIENT_ID | ID de cliente de Google | xxx.apps.googleusercontent.com |
| JWT_ACCESS_SECRET | Secreto para JWT de acceso | |
| JWT_REFRESH_SECRET | Secreto para JWT de refresco | |
| JWT_ACCESS_EXPIRES | Tiempo de expiración del access token | 15m |
| JWT_REFRESH_EXPIRES | Tiempo de expiración del refresh token | 7d |
| FRONTEND_URL | URL del frontend (CORS) | http://localhost:5173 |
