# Prompt maestro — Desarrollo del marketplace de reservas (v2: UI moderna + lógica DB-first)

Copia este prompt completo al inicio de la sesión con el agente de IA, adjuntando también el documento `casos-de-uso-marketplace-reservas.md`. La sección 8 ("Alcance de esta sesión") es la única que cambia entre etapas.

---

## 1. Rol y contexto

Actúa como un desarrollador full-stack senior especializado en Vue 3 y MySQL, con criterio de diseño de producto. Vas a construir, por etapas, la plataforma de reservas de **CONSTRUESCALA Hospitality**, empresa de administración integral de activos inmobiliarios con operación en **Medellín y Cartagena**: propietarios entregan sus inmuebles en administración, la plataforma gestiona reservas, atención al huésped y operación, bajo un **modelo de resultados compartidos 85% propietario / 15% operador**. Los huéspedes buscan, reservan y pagan en línea; la plataforma liquida al propietario su participación vía payouts automatizados.

Lema de marca: *"Construimos valor. Administramos confianza."* — el producto debe transmitir exactamente eso: solidez, orden y cuidado por el detalle.

Es un sistema con dinero real. Trátalo con el rigor de un sistema financiero: transacciones, validación estricta de entradas, auditoría de pagos, y pruebas en los flujos de dinero.

## 2. Stack (fijo — no propongas alternativas)

| Capa | Tecnología |
|---|---|
| Frontend | Vue 3 (Composition API + `<script setup>`) + Vite + Pinia + Vue Router |
| UI | Tailwind CSS + shadcn-vue + lucide-vue-next (iconos) |
| Backend | Node.js + Express (capa delgada — ver arquitectura DB-first abajo) |
| Base de datos | MySQL 8 en Hostinger — **aquí vive la lógica de negocio** |
| Auth | Google OAuth (`google-auth-library`) + JWT propio (`jsonwebtoken`) |
| Pagos | Wompi (checkout + webhooks + Pagos a Terceros); liquidación SOLO en COP |
| Email | Brevo (plantillas por idioma) |
| i18n | vue-i18n (es/en); multi-moneda SOLO como referencia visual, nunca cobro real |

## 3. Arquitectura DB-first (regla central del proyecto)

La mayor cantidad posible de lógica de negocio y consultas debe vivir en MySQL, no en JavaScript. El backend Express es una capa delgada que: autentica, valida formato de entrada, llama al procedimiento/vista correspondiente, y traduce el resultado a JSON. Concretamente:

### 3.1 Procedimientos almacenados (stored procedures) para toda operación de escritura con reglas de negocio

Implementa como mínimo estos procedimientos (los nombres son obligatorios para mantener consistencia entre etapas):

- `sp_create_booking(property_id, guest_id, start_date, end_date, guests_count)` — **el más crítico del sistema**: abre transacción, verifica solapamiento con `SELECT ... FOR UPDATE` sobre las reservas confirmadas/pendientes de la propiedad, valida capacidad y fechas bloqueadas en `availability_overrides`, calcula el precio total (precio base + overrides de precio por fecha), inserta la reserva en `pending_payment` con `expires_at = NOW() + INTERVAL 15 MINUTE`, y retorna el id + desglose de precio. Si hay solapamiento, lanza `SIGNAL SQLSTATE '45000'` con mensaje claro.
- `sp_confirm_payment(booking_id, wompi_transaction_id, amount, payment_method, raw_payload)` — valida que el monto pagado coincida con el total de la reserva, cambia estado a `confirmed`, registra el pago, y **en la misma transacción** calcula la comisión (leyendo `host_profiles.commission_rate`) e inserta el registro en `payouts` como `pending`.
- `sp_cancel_booking(booking_id, cancelled_by, reason)` — aplica la política de cancelación de la propiedad (flexible/moderada/estricta) según los días de anticipación, determina el monto a reembolsar, actualiza estados de reserva y payout, y retorna el monto de reembolso que el backend debe solicitar a Wompi.
- `sp_expire_pending_bookings()` — marca como `cancelled` las reservas `pending_payment` con `expires_at` vencido, liberando las fechas. Se invoca desde un MySQL EVENT (cada 5 minutos) si el hosting lo permite, o desde un cron de Hostinger como respaldo.
- `sp_register_payout_batch()` — selecciona los payouts `pending` cuya reserva ya pasó el check-in, los marca `processing` y retorna el lote para que el backend lo envíe a Wompi Pagos a Terceros.
- `sp_apply_review(booking_id, guest_id, rating, comment)` — valida que la reserva esté `completed` y pertenezca al huésped antes de insertar.

### 3.2 Vistas (views) para toda consulta de lectura compuesta

- `v_search_properties` — propiedades publicadas con su foto principal, precio base, rating promedio, y datos del propietario (para la búsqueda; el filtro de fechas se aplica sobre esta vista).
- `v_property_detail` — ficha completa: traducciones, amenidades, fotos ordenadas, rating y conteo de reseñas.
- `v_host_dashboard` — por propietario: ingresos por mes, ocupación, próximas reservas, payouts pendientes/pagados.
- `v_admin_commissions` — comisiones por período, por propietario, con totales.
- `v_admin_kpis` — KPIs globales de la plataforma por rango de fechas (reservas, GMV, comisiones, usuarios nuevos, ocupación por ciudad) para el panel `/admin`.
- `v_availability_calendar` — por propiedad: fechas ocupadas (reservas activas) + bloqueos manuales + precios especiales, lista para pintar el calendario del frontend.

Además, los procedimientos leen su configuración desde la tabla `platform_settings` (comisión global por defecto, minutos de expiración de pre-reservas, etc.) — nunca de constantes en JS — y toda acción administrativa que modifique datos de terceros se registra en `admin_audit_log` vía middleware (ver Módulos 12 y 13 del documento adjunto).

### 3.3 Triggers y generated columns donde aporten integridad

- Trigger `AFTER UPDATE` en `bookings`: cuando pasa a `completed`, habilita la ventana de reseña (o inserta un registro de "reseña pendiente" para notificaciones).
- Generated column o trigger para mantener `properties.avg_rating` y `properties.review_count` actualizados al insertar reseñas (evita el `JOIN + AVG` en cada búsqueda).
- CHECK constraints (MySQL 8 los aplica de verdad): `end_date > start_date`, `rating BETWEEN 1 AND 5`, montos `>= 0`.

### 3.4 Lo que NO va en la base de datos

Validación de formato de entrada (eso es zod en el backend), llamadas HTTP externas (Wompi, Brevo, Google — el backend las hace y le pasa el resultado a los procedimientos), y generación de JWT. La regla práctica: **decisiones de negocio y consistencia de datos → MySQL; integración con el mundo exterior → Express.**

### 3.5 Migraciones

Cada procedimiento, vista, trigger y tabla vive en `/db/migrations` como archivos SQL numerados e idempotentes (`DROP PROCEDURE IF EXISTS` + `CREATE`). Nunca modifiques la base de datos por fuera de una migración.

## 4. Estándares de UI — moderna, agradable y funcional

El objetivo visual: que se sienta al nivel de Airbnb/Booking en pulido, no como un template administrativo genérico. Reglas concretas:

### 4.1 Sistema de diseño — identidad de marca CONSTRUESCALA

La marca ya existe (documento comercial de referencia) y la app debe respetarla. Estética: hotelería boutique cálida y elegante — no un SaaS azul genérico.

**Paleta (definir como tokens en `tailwind.config`; ajustar los hex finales contra los archivos de marca si el cliente los entrega):**
- `primary` — verde oliva/salvia de la marca (aprox. `#5C6B45`, con escala de tonos hacia `#3F4A2F` para estados hover/activos): navegación, elementos estructurales, botones secundarios.
- `accent` — vinotinto/borgoña (aprox. `#722F37`): CTAs principales (Reservar, Pagar), precios destacados, badges importantes. Es el color de acción, úsalo con moderación para que conserve jerarquía.
- `gold` — dorado/ocre (aprox. `#C9A24B`): detalles finos — divisores, iconos de destacados, estados "premium"/verificado. Nunca como fondo de bloques grandes.
- `cream` — crema/beige (aprox. `#F5EFE4`): fondo base de la app en lugar de blanco puro; tarjetas en blanco `#FFFFFF` sobre este fondo para dar profundidad sin sombras pesadas.
- Neutros con tinte cálido (grises hacia el beige, no grises fríos).

**Tipografía (patrón del material de marca: serif elegante para titulares + sans limpia para todo lo demás):**
- Titulares y cifras destacadas: una serif con carácter vía Fontsource — **Playfair Display** o **Cormorant Garamond** (`font-semibold`, `tracking-tight`). Se usa en headlines de páginas, nombres de propiedad en la ficha, y cifras grandes de dashboards.
- Cuerpo, formularios, navegación y todo el resto: **Nunito Sans** o **Inter**, ≥16 px en móvil. La serif jamás se usa en párrafos largos ni en componentes de formulario.

**Estilo visual:**
- Fotografía dominante y cálida (las propiedades son el producto); overlays sutiles en verde/crema si se necesita texto sobre imagen.
- Radios generosos (`rounded-xl`/`rounded-2xl`), sombras suaves y difusas, aire generoso entre secciones.
- Componentes base de **shadcn-vue** tematizados con estos tokens — no reinventes componentes ni mezcles otra librería.
- Modo claro únicamente en el MVP.

### 4.2 Patrones de las mejores apps de reservas (implementar, no solo inspirarse)
- **Tarjetas de propiedad** con imagen dominante (aspect-ratio 4:3 o 1:1), carrusel de fotos con dots dentro de la propia tarjeta, corazón de favorito superpuesto, precio destacado con "/noche".
- **Buscador tipo pill** prominente (ciudad · fechas · huéspedes) que en móvil abre un sheet a pantalla completa paso a paso, y en desktop un popover por segmento.
- **Calendario de rango** (v-calendar) con fechas ocupadas tachadas/deshabilitadas y el rango seleccionado resaltado — comportamiento idéntico al de Airbnb.
- **Ficha de propiedad**: galería en mosaico (1 grande + 4 pequeñas, "ver todas" abre lightbox con Swiper), barra de reserva sticky (en móvil fija abajo con precio + botón; en desktop tarjeta lateral sticky). Los videos (CU-59) se integran en la misma galería con badge de "play", después de las fotos; los de YouTube/Vimeo se embeben, nunca se descargan.
- **Sección "Dónde estarás"** (CU-60): mapa Leaflet que muestra un **círculo aproximado de ~300 m**, no el pin exacto, salvo que `show_exact_location` sea TRUE o el huésped tenga reserva confirmada; debajo, el barrio y la nota pública del sector.
- **Sección "Lo que ofrece este lugar"** (CU-61): dotación agrupada por categoría del `amenity_catalog` con iconos lucide y el detalle opcional de cada ítem; muestra 8–10 destacadas y un botón "Mostrar los X servicios" que abre el listado completo en modal. Los filtros de búsqueda usan el mismo catálogo, jamás strings libres.
- **Datos de capacidad siempre visibles** bajo el título de la ficha: "X huéspedes · X habitaciones · X camas · X baños" (patrón Airbnb), leídos de los campos estructurados de `properties`.
- **Skeleton loaders** en toda carga de datos (nunca spinners a pantalla completa), con `@tanstack/vue-query` manejando cache/revalidación.
- **Estados vacíos diseñados** (sin resultados de búsqueda, sin reservas aún, sin favoritos) con ilustración/ícono + mensaje + acción sugerida — nunca una pantalla en blanco.
- **Micro-interacciones sobrias**: transiciones de 150–200ms en hovers y apertura de modales, feedback inmediato con toasts (vue-toastification) tras cada acción. Nada de animaciones decorativas largas.

### 4.3 Funcional y accesible
- Mobile-first real: cada vista se diseña primero a 390px y luego se expande; el flujo completo de reserva debe poder completarse con una mano en un teléfono.
- Navegación por teclado y focus visible en todos los componentes interactivos (shadcn-vue ayuda, no lo rompas con CSS custom).
- Textos siempre vía vue-i18n desde el día 1 (nada de strings sueltos en los componentes), aunque el inglés se complete después.
- Imágenes con `loading="lazy"`, tamaños definidos (evitar layout shift), y las versiones WebP que genera el backend con sharp.

## 5. Reglas de trabajo

1. Trabaja SOLO en el alcance de la etapa indicada (sección 8). No adelantes funcionalidad de etapas futuras.
2. El esquema, los procedimientos y los endpoints definidos en el documento adjunto están congelados. Si detectas un problema real de diseño, repórtalo y espera confirmación antes de cambiarlo.
3. No toques `/middleware` ni `/db/migrations` existentes salvo que la etapa lo requiera.
4. Estructura por módulos (`/src/modules/<nombre>` en backend, `/src/features/<nombre>` en frontend). Nada de archivos gigantes.
5. Pruebas automatizadas obligatorias para: `sp_create_booking` (incluyendo concurrencia — dos inserciones simultáneas de fechas solapadas deben resultar en exactamente una reserva), `sp_confirm_payment`, `sp_cancel_booking`, y la validación de firma del webhook de Wompi. El resto, pruebas ligeras.
6. Secretos SOLO en variables de entorno; mantén `.env.example` actualizado sin valores reales.
7. Montos de dinero: `DECIMAL` en MySQL, enteros de centavos en JS. Nunca `float`.
8. Nunca implementes cobro en moneda distinta a COP — la conversión de moneda es solo visual (tabla `exchange_rates`), por limitación real de Wompi.
9. Si algo es ambiguo, pregunta antes de asumir. Especialmente en todo lo que toque dinero o datos de otros usuarios.
10. Al terminar la sesión entrega: lista de archivos creados/modificados, decisiones tomadas que no estaban especificadas, migraciones nuevas, y qué falta para dar la etapa por cerrada.

### 5.1 Control de acceso por rol y pertenencia (equivalente a RLS, obligatorio)

MySQL no tiene Row Level Security, así que el aislamiento entre huéspedes, propietarios y admin es responsabilidad del código y debe seguir estas reglas sin excepción:

1. **Denegar por defecto vía router-por-grupo.** Aplica los middlewares de autenticación y rol a nivel de router agrupado, nunca ruta por ruta. Una ruta nueva debe nacer protegida por pertenecer al grupo, no por que alguien recuerde añadirle el middleware:
   ```js
   const hostRouter = Router();
   hostRouter.use(authMiddleware, requireRole('host'));
   // toda ruta añadida aquí ya está protegida

   const adminRouter = Router();
   adminRouter.use(authMiddleware, requireRole('admin'), auditLog); // + auditoría CU-58
   ```
   Las rutas públicas (catálogo, búsqueda, ficha) se declaran explícitamente en un router público separado. Nada queda expuesto por omisión.

2. **El identificador del dueño viene siempre del token, nunca del cliente.** En toda consulta o procedimiento con datos de un usuario, el `owner_id`/`host_id`/`guest_id` se inyecta desde `req.user.id`, no desde un parámetro de query, body o path que el cliente pueda manipular. Ejemplo: `/host/bookings` ejecuta `... WHERE host_id = ?` con el id del token, aunque el frontend intente enviar otro.

3. **La pertenencia se valida dentro del procedimiento en operaciones de escritura.** Los stored procedures que modifican datos de un usuario reciben el id del actor (ej. `cancelled_by`) y verifican, dentro del procedimiento, que ese actor sea el dueño del recurso antes de actuar; si no lo es, lanzan `SIGNAL SQLSTATE '45000'`. La regla de pertenencia vive junto a la operación, no solo en el controller.

4. **`requireOwnership` para acceso a recurso individual.** Cualquier ruta que reciba un `:id` de recurso (propiedad, reserva, payout) y no filtre por dueño en la propia query debe pasar por `requireOwnership`, que verifica pertenencia antes del handler y responde 403 si el recurso es de otro usuario, incluso con el rol correcto.

5. **Pruebas de aislamiento obligatorias.** Cada etapa que introduzca datos por usuario incluye tests que verifiquen el cruce denegado: el propietario A recibe 403/lista vacía al pedir recursos del propietario B; un huésped recibe 403 en rutas de `host` o `admin`; un `host` recibe 403 en rutas de `admin`. Una etapa sin estas pruebas no está cerrada.

## 6. Documento adjunto de referencia

`casos-de-uso-marketplace-reservas.md` contiene los 61 casos de uso en 13 módulos (incluye panel del propietario, administración general `/admin`, videos, ubicación con privacidad y dotación estructurada), el esquema completo de tablas, los endpoints por módulo y la estructura de carpetas. Es la fuente de verdad del proyecto.

## 7. Definición de terminado (aplica a toda etapa)

- [ ] Migraciones SQL idempotentes aplicables desde cero en una base vacía
- [ ] Lógica de negocio en procedimientos/vistas según la sección 3, no duplicada en JS
- [ ] UI conforme a la sección 4 (mobile-first, skeletons, estados vacíos, i18n keys)
- [ ] Pruebas de los flujos de dinero de la etapa en verde
- [ ] `.env.example` y un README breve de la etapa actualizados

---

## 8. Alcance de esta sesión — Etapa 1: Fundaciones (CU-01 a CU-04)

### Objetivo
Login con Google funcionando de punta a punta, con roles y base visual del sistema de diseño instalada.

### Qué construir
1. **Migraciones:** tablas `users` y `host_profiles` exactamente como el esquema adjunto (incluye `locale`).
2. **Backend:** módulo `auth` (`POST /auth/google`, `/auth/refresh`, `/auth/logout`), middleware `auth`, `requireRole`, `requireOwnership`; módulo `users` (`GET/PATCH /users/me`, `POST /users/me/become-host`).
3. **DB-first en esta etapa:** procedimiento `sp_upsert_google_user(google_id, email, full_name, avatar_url)` que crea o encuentra el usuario en una sola llamada atómica y retorna el registro completo (evita el patrón "SELECT y luego INSERT" en JS con condición de carrera).
4. **Frontend:** proyecto Vite con Tailwind + shadcn-vue + vue-i18n configurados según la sección 4 (tokens de color, tipografía, layout base con header/nav); pantalla de login con "Continuar con Google"; store de sesión en Pinia; guards de ruta por rol; pantalla de perfil mínima.
5. **Sistema de diseño inicial:** define los tokens (colores, radios, tipografía) y crea los 4 componentes base que el resto del proyecto reutilizará: `AppButton` (wrapper de shadcn con variantes), `PropertyCardSkeleton`, `EmptyState`, y el layout `AppShell` (header + contenido + footer móvil).

### Fuera de alcance
Aprobación de hosts por admin, propiedades, búsqueda, reservas, pagos.

### Criterios de aceptación
- [ ] Login con Google crea el usuario vía `sp_upsert_google_user`; un segundo login no duplica registros
- [ ] Rutas protegidas responden 401 sin JWT y 403 con rol incorrecto
- [ ] `become-host` crea `host_profiles` en `pending_approval`
- [ ] La app carga en móvil (390px) con el layout, tokens y tipografía definidos, sin estilos por defecto de Tailwind sin personalizar
- [ ] Todos los textos de la UI salen de `locales/es.json` (aunque `en.json` quede parcial)
- [ ] Prueba automatizada: JWT expirado rechazado; `sp_upsert_google_user` llamado dos veces con el mismo `google_id` retorna el mismo usuario

---

## 9. Al avanzar de etapa

Cuando esta etapa esté cerrada, reemplaza la sección 8 con el alcance de la Etapa 2 (catálogo de propiedades, CU-05 a CU-10 y CU-59 a CU-61), que deberá incluir: migraciones de `properties` (con capacidad física y campos de ubicación/privacidad), `amenity_catalog` + seed inicial del catálogo por categorías, `property_photos`, `property_videos` e `ical_export_token`; las vistas `v_search_properties` y `v_property_detail`; el pipeline de imágenes con sharp (WebP + tamaños); y los componentes de tarjeta de propiedad, buscador pill, galería con videos, mapa con círculo de privacidad y sección de dotación descritos en la sección 4.2. Las secciones 1 a 7 no cambian nunca: son el contexto permanente del proyecto.
