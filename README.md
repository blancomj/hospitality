# CONSTRUESCALA Hospitality

Plataforma de reservas de alojamiento a escala local para **Medellín y Cartagena**.

> *"Construimos valor. Administramos confianza."*

## Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | Vue 3 + Vite + Tailwind CSS + shadcn-vue |
| Backend | Node.js + Express |
| Base de datos | MySQL 8 |
| Autenticación | Google OAuth + JWT |
| Pagos | Wompi |
| Email | Brevo |

## Estructura del proyecto

```
hospitality/
├── backend/           # API REST (Express)
├── frontend/          # SPA (Vue 3)
├── casos-de-uso-marketplace-reservas.md
└── prompt-maestro-agente-ia.md
```

## Inicio rápido

### Prerrequisitos
- Node.js 18+
- MySQL 8
- Google Cloud Console (para OAuth)

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# Editar .env con tus credenciales
npm run migrate    # Crear tablas y procedimientos
npm run dev        # Iniciar en http://localhost:3001
```

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Editar .env con tu GOOGLE_CLIENT_ID
npm run dev        # Iniciar en http://localhost:5173
```

## Configuración de Google OAuth

1. Ir a [Google Cloud Console](https://console.cloud.google.com)
2. Crear un proyecto o seleccionar uno existente
3. Habilitar "Google Identity Services"
4. Crear credenciales "OAuth 2.0 Client ID"
5. Agregar dominios autorizados:
   - `localhost` (desarrollo)
   - Tu dominio de producción
6. Copiar el Client ID al `.env` de ambos proyectos

## Etapa 1: Fundaciones

### Criterios de aceptación
- [x] Login con Google crea usuario vía `sp_upsert_google_user`
- [x] Segundo login no duplica registros
- [x] Rutas protegidas responden 401/403
- [x] `become-host` crea `host_profiles` en `pending_approval`
- [x] UI responsive (390px) con tokens personalizados
- [x] Textos en `locales/es.json`

### Paleta de diseño
| Token | Color | Hex |
|-------|-------|-----|
| primary | Verde oliva | `#5C6B45` |
| accent | Vinotinto | `#722F37` |
| gold | Dorado | `#C9A24B` |
| cream | Crema | `#F5EFE4` |

### Tipografía
- **Titulares:** Playfair Display
- **Cuerpo:** Inter

## Documentación

- [Casos de uso](./casos-de-uso-marketplace-reservas.md) - 61 casos de uso en 13 módulos
- [Prompt maestro](./prompt-maestro-agente-ia.md) - Guía de desarrollo por etapas

## Licencia

Privado - CONSTRUESCALA Hospitality © 2026
