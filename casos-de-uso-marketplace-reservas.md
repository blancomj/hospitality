# Casos de uso — Marketplace de reservas (estilo Booking/Airbnb a escala local)

**Stack:** Vue 3 + Vite (frontend) · Node.js/Express (backend API) · MySQL en Hostinger (base de datos) · Wompi (pagos y payouts, liquidación exclusiva en COP — ver Módulo 11) · Google OAuth (autenticación) · Brevo (correos transaccionales) · integración con Booking.com/Airbnb (sincronización de calendario, ver nota de realidad en el Módulo 9) · multi-idioma y multi-moneda de referencia (ver Módulo 11)

**Nota de arquitectura importante:** al cambiar Supabase por MySQL en Hostinger, se pierden tres cosas que Supabase daba "gratis": Auth integrado, Row Level Security (RLS) automático, y exclusion constraints de Postgres para evitar dobles reservas. Esto significa que **ahora sí necesitas una capa de backend propia** (Node/Express, igual que ya usas en tu proyecto movie-collection) que se encargue de autenticación, autorización por rol, y la lógica anti-doble-reserva a mano. Cada caso de uso abajo indica dónde aplica esto.

---

## Contexto de negocio — CONSTRUESCALA Hospitality

La plataforma se construye para **CONSTRUESCALA Hospitality** (administración integral de activos inmobiliarios, operación en **Medellín y Cartagena**), según su documento comercial. Puntos que el material de marca confirma o ajusta en este análisis:

- **Modelo de resultados compartidos 85/15:** el propietario recibe el 85% del resultado de la operación y el operador el 15%. Esto **valida el valor por defecto** ya definido en `host_profiles.commission_rate = 15.00`, y confirma que la tasa debe ser configurable por propietario (contratos particulares) con el global en `platform_settings`.
- **Ciudades semilla:** Medellín y Cartagena (no Bogotá, como el referente Jalo). El seed inicial de la tabla de ciudades usa estas dos.
- **El operador es también "propietario" en la plataforma:** CONSTRUESCALA opera inmuebles de terceros — a nivel de datos, los dueños reales son los `hosts` y CONSTRUESCALA es el `admin`/operador. El modelo de datos ya soporta esto sin cambios.
- **Reportes al propietario:** el brochure promete "información periódica con ocupación, ingresos, gastos y resultados" — exactamente lo que cubren CU-49 (dashboard del propietario) y CU-52 (historial financiero con export CSV). El dashboard es una promesa comercial de la empresa, no un nice-to-have: prioridad alta dentro de la Etapa 7.
- **Entrega y recepción formal del inmueble:** el modelo operativo incluye acta de entrega/recepción con constancia escrita del estado, y daños atribuibles al huésped asumidos por este. Queda registrado como caso de uso futuro (post-MVP): checklist digital de check-in/check-out con fotos y firma, asociado a la reserva. No se incluye en el roadmap actual, pero el esquema lo permitiría agregar (tabla `booking_inspections`) sin cambios estructurales.
- **Ocupación proyectada 78%:** métrica objetivo del negocio — el dashboard admin (CU-53) debe mostrar la ocupación real contra esta meta.
- **Identidad visual:** paleta verde oliva/crema/vinotinto/dorado y tipografía serif+sans del brochure — trasladada como tokens de diseño a la sección 4.1 del prompt maestro.

---

## Actores

| Actor | Descripción |
|---|---|
| **Huésped** | Usuario que busca, reserva y paga alojamiento |
| **Propietario** | Usuario que publica una o más propiedades y gestiona su disponibilidad, precios y reservas |
| **Administrador** | Rol interno tuyo (CONSTRUESCALA como operador): aprueba propietarios, ve comisiones, resuelve disputas |
| **Sistema** | Procesos automáticos: webhook de Wompi, cron de payouts, notificaciones |

---

## Módulo 1 — Autenticación y perfiles

### CU-01: Registro e inicio de sesión con Google OAuth
- **Actor:** Huésped / Propietario
- **Flujo principal:** el usuario pulsa "Continuar con Google" en el frontend Vue → se redirige al flujo OAuth 2.0 de Google → Google retorna un `id_token` → el backend Node/Express lo valida contra los servidores de Google (librería `google-auth-library`), extrae email/nombre/foto, y si el usuario no existe lo crea en `users` con `auth_provider = 'google'` y un `role` inicial (`guest` por defecto; el usuario puede solicitar convertirse en propietario después) → el backend emite su propio JWT de sesión para el resto de la aplicación.
- **Nota técnica:** como no hay contraseña que gestionar, la tabla `users` no necesita columna de hash para estos registros — solo guarda el `google_id` como identificador externo único. Si más adelante quieres permitir login con email/contraseña como alternativa, se puede agregar `auth_provider = 'local'` en paralelo sin romper el esquema.
- **Consideración práctica:** registra la app en Google Cloud Console (OAuth consent screen) con los dominios exactos de producción y desarrollo; Google exige esto configurado antes de que el botón funcione fuera de modo de prueba.

### CU-02: Control de sesión
- **Actor:** Huésped / Propietario / Administrador
- **Flujo principal:** tras el login con Google (CU-01), el backend emite un JWT propio (access token corto + refresh token) → el frontend Vue lo guarda en memoria/Pinia (nunca en localStorage por seguridad).
- **Flujo alterno:** token expirado → refresh automático vía endpoint dedicado, sin necesitar que el usuario vuelva a pasar por Google si su sesión de Google sigue activa.

### CU-03: Autorización por rol (reemplazo de RLS)
- **Actor:** Sistema
- **Descripción:** cada endpoint de la API valida, mediante middleware de Express, que el usuario autenticado tenga el rol correcto y sea dueño del recurso que intenta modificar (ej. un propietario solo puede editar sus propias propiedades).
- **Nota técnica MySQL:** esto es lo que en Supabase resolvía RLS automáticamente a nivel de base de datos; aquí se implementa como middleware reutilizable (`requireRole('host')`, `requireOwnership(propertyId)`) que se aplica a cada ruta sensible. Es más trabajo, pero también más explícito y fácil de auditar en el código.

### CU-04: Completar perfil de propietario (KYC básico)
- **Actor:** Propietario
- **Flujo principal:** el propietario carga datos legales, número de cuenta bancaria (para payouts) y acepta términos de comisión → queda en estado `pending_approval` hasta que el Administrador lo apruebe (CU-17).

---

## Módulo 2 — Gestión de propiedades

### CU-05: Crear/editar propiedad
- **Actor:** Propietario
- **Flujo principal:** el propietario carga título, ciudad, dirección, tipo de alojamiento, amenidades, precio base por noche, reglas de la casa y fotos.
- **Nota técnica MySQL:** las fotos no se guardan en la base de datos — se suben al sistema de archivos de Hostinger (o a un bucket externo tipo Cloudflare R2/S3 si el volumen crece) y en `properties` solo se guarda la ruta/URL. Mismo patrón que ya usas en tu proyecto movie-collection con `POSTERS_DIR`.

### CU-06: Definir disponibilidad y precios por fecha
- **Actor:** Propietario
- **Flujo principal:** el propietario marca fechas bloqueadas (no disponibles) y, opcionalmente, precios especiales por temporada en una tabla `availability_overrides`.

### CU-07: Publicar/despublicar propiedad
- **Actor:** Propietario
- **Flujo principal:** cambia el estado de la propiedad entre `draft`, `published`, `paused`.

### CU-59: Videos de la propiedad
- **Actor:** Propietario (carga) / Huésped (visualización)
- **Flujo principal:** el propietario puede agregar videos de la propiedad de dos formas, ambas soportadas:
  1. **Enlace de YouTube/Vimeo** (recomendado como opción principal): pega la URL, el sistema valida y guarda solo el enlace, y en la ficha se muestra embebido. Costo de almacenamiento y ancho de banda: cero.
  2. **Carga directa de archivo** (opcional, con límites estrictos): MP4 hasta 100 MB y máx. 2 videos por propiedad; el backend valida tipo/tamaño y lo almacena junto a las fotos.
- **Nota técnica importante para Hostinger:** servir video directo desde hosting compartido consume mucho ancho de banda y da mala experiencia de reproducción (sin streaming adaptativo). Por eso la opción de enlace YouTube/Vimeo debe ser la vía promovida en la UI ("¿Tienes el video en YouTube? Pega el enlace"), y la carga directa la excepción. Si más adelante el volumen lo justifica, migrar cargas directas a Cloudflare Stream o Bunny Stream (streaming adaptativo real, costo bajo por minuto) sin cambiar el esquema — solo cambia la URL almacenada.
- **En la ficha (CU-09):** los videos aparecen integrados en la galería (mosaico/lightbox) con un badge de "play", después de las fotos.

### CU-60: Ubicación geográfica detallada con privacidad
- **Actor:** Propietario (define) / Huésped (consulta)
- **Flujo principal:** al crear la propiedad, el propietario fija la ubicación arrastrando un pin en un mapa (Leaflet) o escribiendo la dirección con autocompletado (Nominatim/OpenStreetMap, gratuito); el sistema guarda `latitude`, `longitude`, `address` y `neighborhood` (barrio/sector, relevante en ciudades colombianas donde el barrio pesa más que la dirección exacta para decidir).
- **Privacidad estándar de la industria:** antes de reservar, el huésped ve un **círculo aproximado** (~300 m) sobre el mapa, no el pin exacto — igual que Airbnb. La dirección exacta y el pin real solo se muestran al huésped con reserva `confirmed` (y en el correo de confirmación de Brevo). El propietario puede optar por mostrar ubicación exacta públicamente (`show_exact_location = TRUE`) si lo prefiere, p. ej. edificios con recepción.
- **En la ficha:** sección "Dónde estarás" con el mapa, el barrio, y campos de texto libre del propietario: "Cómo llegar" e "Información del sector" (qué hay cerca: transporte, supermercados, playa).

### CU-61: Dotación y servicios detallados (estructurados)
- **Actor:** Propietario (define) / Huésped (consulta y filtra)
- **Flujo principal:** en lugar de una lista plana de amenidades, el propietario diligencia la dotación desde un **catálogo estructurado por categorías**, y adicionalmente los datos de capacidad física de la propiedad (habitaciones, camas por tipo, baños, área en m²):
  - **Básicos:** wifi (con velocidad opcional en Mbps), TV, aire acondicionado, ventilador, agua caliente, closet
  - **Cocina:** cocina completa/kitchenette, nevera, estufa, horno, microondas, cafetera, licuadora, vajilla y utensilios
  - **Lavandería:** lavadora, secadora, plancha, servicio de lavandería del edificio
  - **Espacios:** balcón, terraza, jardín, vista (mar/ciudad/montaña)
  - **Edificio/conjunto:** piscina, gimnasio, coworking, ascensor, parqueadero (gratuito/pagado), portería 24 h, zonas BBQ
  - **Familia:** cuna, silla para bebé, apto para niños
  - **Seguridad:** extintor, botiquín, detector de humo, caja fuerte, cámaras en zonas comunes (declaración obligatoria)
  - **Accesibilidad:** entrada sin escalones, baño adaptado, ascensor hasta el piso
  - **Políticas:** se admiten mascotas, se permite fumar, apto para eventos
- Cada ítem del catálogo puede tener un **detalle opcional** (texto corto o número: "Wifi — 200 Mbps", "Parqueadero — $15.000/día", "2 camas dobles + 1 sofá cama").
- **En la ficha (CU-09):** sección "Lo que ofrece este lugar" agrupada por categoría con iconos (lucide), mostrando primero las 8–10 más relevantes y un botón "Mostrar los X servicios" que abre el listado completo en un modal — patrón idéntico a Airbnb.
- **En la búsqueda (CU-10):** los filtros de amenidades se alimentan del mismo catálogo (no de strings libres), garantizando que filtrar por "piscina" encuentre todas las propiedades que la marcaron.
- **DB-first:** el catálogo vive en la tabla `amenity_catalog` (con categoría, icono y orden); `property_amenities` pasa a referenciarlo por id con campo `detail` opcional. Así agregar un nuevo servicio al catálogo es un INSERT del admin (desde `/admin`), no un cambio de código.

---

## Módulo 3 — Búsqueda y descubrimiento

### CU-08: Buscar propiedades por ciudad y fechas
- **Actor:** Huésped
- **Flujo principal:** el huésped indica ciudad, fecha de entrada/salida y número de huéspedes → el backend consulta `properties` cruzando con `bookings` para excluir las que ya tienen una reserva confirmada que se solape con el rango pedido.
- **Nota técnica MySQL:** MySQL no tiene exclusion constraints como Postgres, así que la consulta de disponibilidad se hace con una query explícita tipo:
  ```sql
  SELECT p.* FROM properties p
  WHERE p.city = ?
    AND p.status = 'published'
    AND p.id NOT IN (
      SELECT property_id FROM bookings
      WHERE status = 'confirmed'
        AND start_date < ? AND end_date > ?
    )
  ```
  Esto reemplaza la elegancia de `EXCLUDE USING GIST` con lógica de aplicación — funciona bien a la escala de "pocas ciudades", pero es responsabilidad del backend, no de la base de datos.

### CU-09: Ver ficha de propiedad
- **Actor:** Huésped
- **Flujo principal:** ver fotos, descripción, calendario de disponibilidad, reseñas, precio total estimado para las fechas elegidas.

### CU-10: Filtrar por precio, amenidades, tipo de alojamiento
- **Actor:** Huésped

---

## Módulo 4 — Reservas y prevención de doble reserva

### CU-11: Solicitar reserva (pre-reserva)
- **Actor:** Huésped
- **Flujo principal:** el huésped elige fechas → el backend crea un registro `bookings` en estado `pending_payment` **dentro de una transacción con bloqueo de fila** (`SELECT ... FOR UPDATE`) para evitar que dos huéspedes reserven la misma fecha al mismo tiempo.
- **Nota técnica MySQL — el punto más delicado de todo el sistema:** sin exclusion constraint nativo, la forma correcta de evitar doble reserva en MySQL es:
  1. Abrir una transacción.
  2. Verificar solapamiento de fechas con `SELECT ... FOR UPDATE` sobre las reservas existentes de esa propiedad (esto bloquea filas concurrentes durante la verificación).
  3. Si no hay solapamiento, insertar la nueva reserva en estado `pending_payment` con un tiempo de expiración corto (ej. 15 minutos).
  4. Confirmar (`COMMIT`) la transacción.
  5. Un job programado limpia las reservas `pending_payment` que expiraron sin pago, liberando la fecha.

  Esto es más código que en Postgres, pero es un patrón bien conocido y un agente de IA lo puede implementar de forma directa si se le da esta especificación exacta.

### CU-12: Cancelar reserva
- **Actor:** Huésped / Propietario
- **Flujo principal:** aplica política de cancelación (ej. gratis hasta X días antes) → si corresponde reembolso, se dispara CU-15 (reembolso vía Wompi).

### CU-13: Ver mis reservas (huésped)
### CU-14: Ver reservas de mi propiedad (propietario)

---

## Módulo 5 — Pagos (Wompi)

### CU-15: Pagar una reserva
- **Actor:** Huésped
- **Flujo principal:** el frontend Vue redirige al widget/checkout de Wompi con el monto total → Wompi procesa el pago (tarjeta, PSE, Nequi) → Wompi notifica vía webhook al backend Node/Express.
- **Nota técnica:** el endpoint de webhook debe validar la firma de Wompi (evita que alguien falsifique una notificación de "pago exitoso"), y solo entonces cambiar la reserva de `pending_payment` a `confirmed`.

### CU-16: Reembolsar una cancelación
- **Actor:** Sistema (disparado por CU-12)
- **Flujo principal:** el backend llama a la API de reembolsos de Wompi y actualiza el estado de la reserva y del pago.

---

## Módulo 6 — Comisiones y payouts

### CU-17: Aprobar propietario nuevo
- **Actor:** Administrador
- **Flujo principal:** revisa los datos de KYC del propietario (CU-04) y cambia su estado a `approved`, habilitando que publique propiedades.

### CU-18: Calcular comisión por reserva
- **Actor:** Sistema
- **Flujo principal:** al confirmarse una reserva (CU-15), el backend calcula automáticamente `comisión_plataforma` y `monto_neto_propietario` según la tasa configurada (global o por propietario) y los guarda en una tabla `payouts` en estado `pending`.

### CU-19: Ejecutar payout a propietarios
- **Actor:** Sistema (cron)
- **Flujo principal:** un job programado (en Hostinger esto se hace con **cron jobs nativos del hosting** que llaman a un endpoint o script Node, ya que no existe pg_cron sin Postgres) recorre los `payouts` en estado `pending` cuya reserva ya se completó (ej. después del check-in) y los envía en lote a la API de **Wompi Pagos a Terceros**, marcándolos como `paid` al recibir confirmación.
- **Nota técnica:** Hostinger permite programar cron jobs desde hPanel (igual que ya usas para reiniciar tu app de movie-collection); ahí se configura la llamada periódica a este proceso.

### CU-20: Ver reporte de comisiones (admin)
- **Actor:** Administrador

---

## Módulo 7 — Confianza: reseñas y mensajería

### CU-21: Dejar reseña tras estancia completada
- **Actor:** Huésped
- **Flujo principal:** solo habilitado si la reserva está en estado `completed` (fecha de salida ya pasó).

### CU-22: Responder reseña
- **Actor:** Propietario

### CU-23: Mensajería huésped-propietario (opcional, fase posterior)
- **Actor:** Huésped / Propietario
- **Nota:** puede posponerse a una fase tardía; no es bloqueante para el MVP.

---

## Módulo 8 — Notificaciones (Brevo)

### CU-24: Notificar confirmación de reserva
- **Actor:** Sistema
- **Flujo principal:** cuando una reserva pasa a `confirmed`, el backend llama a la API transaccional de Brevo (`POST /v3/smtp/email`) con una plantilla predefinida (creada en el panel de Brevo) y las variables de la reserva (nombre, fechas, propiedad, monto) → Brevo envía el correo al huésped y al propietario.
- **Nota técnica:** conviene usar las plantillas de Brevo (Template ID) en vez de armar el HTML del correo a mano en el backend — así puedes editar el diseño del email sin tocar código, y el agente de IA solo necesita implementar la llamada con el `templateId` y las variables.
- **Opcional:** WhatsApp Business API en paralelo, dado que tus usuarios ya esperan ese canal por la experiencia de Jalo — puede añadirse en una etapa posterior sin afectar esta.

### CU-25: Notificar payout ejecutado
- **Actor:** Sistema
- **Flujo principal:** al ejecutarse un payout (CU-19), Brevo envía al propietario la confirmación de la transferencia con el monto neto y la referencia de Wompi.

### CU-26: Recibir eventos de entrega de Brevo (webhook)
- **Actor:** Sistema
- **Flujo principal:** Brevo notifica vía webhook eventos como `delivered`, `bounce` o `spam` → el backend los registra para saber si un correo de confirmación de reserva no llegó (por ejemplo, email inválido) y poder alertar al usuario por otro canal.

---

## Módulo 9 — Sincronización con Booking.com y Airbnb

**Antes de planear esta etapa, es importante que sepas esto:** verifiqué el estado actual de acceso a estas APIs y ninguna de las dos ofrece un programa abierto de autoregistro para un marketplace pequeño como este:

- **Airbnb:** su Partner API está cerrada a solicitudes no invitadas desde 2026 — Airbnb evalúa y contacta directamente a los prospectos, y solo aprueba socios con volumen de negocio y capacidad técnica significativos. Un desarrollador individual o un marketplace pequeño no puede simplemente registrarse y obtener acceso.
- **Booking.com:** su Connectivity API funciona igual — solo otorga acceso a "Connectivity Partners" certificados (generalmente empresas de software de gestión hotelera), y actualmente **tienen pausadas las solicitudes de nuevos proveedores** mientras actualizan sus términos. Además, no aceptan conexiones directas de propiedades individuales; solo a través de un channel manager ya certificado.

### Lo que sí es viable

### CU-27: Sincronizar disponibilidad vía iCal (una vía o dos vías)
- **Actor:** Propietario / Sistema
- **Flujo principal:** tanto Airbnb como Booking.com permiten exportar/importar un enlace iCal por propiedad **sin necesitar partnership ni aprobación** — es una función estándar disponible para cualquier anfitrión desde su propio panel. Tu plataforma puede:
  1. Generar un enlace iCal propio por cada propiedad, para que el propietario lo pegue en Airbnb/Booking y así tus reservas bloqueen esas fechas allá.
  2. Permitir que el propietario pegue en tu plataforma el enlace iCal que Airbnb/Booking le dan a él, y tu sistema lo consulta periódicamente (cron) para bloquear esas fechas en tu propio calendario.
- **Limitación real:** iCal solo sincroniza disponibilidad (fechas ocupadas), no precios, ni detalles de la reserva, ni permite recibir el pago a través de tu plataforma para una reserva hecha en Airbnb — es una sincronización de calendario, no una integración operativa completa.

### CU-28: Evaluar un channel manager intermedio (alternativa a integrarte tú directo)
- **Actor:** Administrador (decisión de negocio, no un caso de uso técnico end-user)
- **Descripción:** si en el futuro necesitas algo más profundo que iCal (sincronizar precios, recibir reservas de Airbnb/Booking dentro de tu propio panel), la ruta realista no es solicitar acceso directo a esas APIs, sino integrarte con un **channel manager ya certificado** (ej. Hostaway, Rentals United, Beds24) que sí tiene esas partnerships, y consumir la API de ese channel manager en vez de la de Airbnb/Booking directamente. Esto tiene un costo mensual por propiedad, pero es la única vía realista a corto plazo para un marketplace de tu escala.

**Recomendación para el roadmap:** planea la Etapa correspondiente a este módulo como "sincronización iCal" (CU-27), no como "integración con la API de Airbnb/Booking" — así evitas que un agente de IA pierda tiempo intentando registrar una app en un programa de partners que no va a aprobar una solicitud no invitada a esta escala.

---

## Módulo 10 — Mejoras de UX y librerías recomendadas

Este módulo agrupa funcionalidades que no son estrictamente necesarias para un MVP funcional, pero que marcan la diferencia entre "una app que reserva propiedades" y "una app que se siente como Airbnb/Booking". Cada caso de uso incluye la librería concreta que un agente de IA puede usar para implementarlo sin reinventar la rueda.

### CU-29: Mapa interactivo de resultados de búsqueda
- **Actor:** Huésped
- **Flujo principal:** además de la lista de propiedades, mostrar un mapa con un pin por propiedad; al pasar el mouse/tap sobre una tarjeta se resalta su pin y viceversa.
- **Librería:** `leaflet` + `@vue-leaflet/vue-leaflet`, con capas de OpenStreetMap (gratuito, sin necesitar API key de Google Maps/Mapbox).

### CU-30: Galería de fotos tipo lightbox con swipe
- **Actor:** Huésped
- **Flujo principal:** en la ficha de propiedad, al tocar una foto se abre una galería a pantalla completa navegable por swipe/flechas.
- **Librería:** `swiper` (con su wrapper de Vue incluido en el mismo paquete).

### CU-31: Favoritos / wishlist
- **Actor:** Huésped
- **Flujo principal:** guardar propiedades como favoritas sin necesidad de estar logueado (persistido en `localStorage`), y sincronizarlas con la cuenta del usuario en `user_favorites` cuando inicia sesión con Google.

### CU-32: Búsqueda con fechas flexibles
- **Actor:** Huésped
- **Flujo principal:** opción de "±3 días" en la búsqueda, ampliando el rango de la query de disponibilidad ya definida en CU-08 y mostrando resultados ordenados por cercanía a la fecha ideal.

### CU-33: Desglose transparente de precio antes del pago
- **Actor:** Huésped
- **Flujo principal:** mostrar el cálculo completo (precio por noche × noches + comisión de servicio, si aplica) antes de llegar al checkout de Wompi, para reducir fricción y quejas post-pago.

### CU-34: Compartir propiedad por WhatsApp
- **Actor:** Huésped
- **Flujo principal:** botón de compartir que arma un enlace `https://wa.me/?text=...` con el nombre y link de la propiedad — expectativa muy arraigada en el contexto colombiano, y coherente con la experiencia previa de Jalo.

### CU-35: Insignias de confianza
- **Actor:** Huésped (visualización) / Propietario (habilitación)
- **Flujo principal:** banderas simples en `properties`/`users` (`id_verified`, `fast_response`, `flexible_cancellation`) que se muestran como insignias en la ficha — mejoran conversión sin requerir lógica compleja.

### CU-36: Dashboard de propietario con métricas
- **Actor:** Propietario
- **Flujo principal:** vista con ingresos por mes, tasa de ocupación y próximas reservas.
- **Librería:** `vue3-apexcharts` o `chart.js` con su wrapper `vue-chartjs`.

### CU-37: Interfaz multi-idioma (español/inglés)
- **Actor:** Huésped
- **Flujo principal:** cambio de idioma en la interfaz, relevante si apuntas a turismo extranjero en Cartagena.
- **Librería:** `vue-i18n`.

### CU-38: Motor de búsqueda dedicado (a futuro, cuando el catálogo crezca)
- **Actor:** Huésped
- **Flujo principal:** reemplazar las queries `LIKE`/`FULLTEXT` de MySQL por un motor de búsqueda dedicado que tolere errores de tipeo y sea instantáneo.
- **Herramienta:** **Meilisearch** o **Typesense** (ambos open source, se instalan en el mismo VPS/hosting con Node y corren como servicio aparte, indexando desde MySQL).

### CU-39: Optimización y entrega de imágenes
- **Actor:** Sistema
- **Flujo principal:** al subir una foto de propiedad, generar automáticamente versiones WebP en varios tamaños (thumbnail, mediano, full) antes de guardarla.
- **Librería:** `sharp` (procesamiento en el backend Node). Complementar con un CDN gratuito (Cloudflare) delante de las imágenes estáticas para no sobrecargar el hosting compartido de Hostinger.

### CU-40: Colas de trabajo para tareas asíncronas
- **Actor:** Sistema
- **Flujo principal:** mover tareas que no deben bloquear la respuesta al usuario (enviar correo vía Brevo, generar thumbnails, ejecutar payout) a una cola en vez de ejecutarlas de forma síncrona dentro del request HTTP.
- **Librería:** `bullmq` + Redis (Redis puede correr en el mismo VPS si Hostinger lo permite, o usar un plan gratuito de Upstash Redis).

### CU-41: Monitoreo de errores en producción
- **Actor:** Administrador / Sistema
- **Flujo principal:** capturar y alertar errores no manejados en frontend y backend.
- **Herramienta:** **Sentry** (plan gratuito básico) — especialmente valioso cuando el código se genera por etapas con agentes de IA, para detectar rápido qué falla en producción sin depender solo de reportes de usuarios.

### Tabla resumen de dependencias npm sugeridas

| Paquete | Uso |
|---|---|
| `@tanstack/vue-query` | Cache y revalidación de datos del backend |
| `leaflet`, `@vue-leaflet/vue-leaflet` | Mapa interactivo |
| `swiper` | Galería de fotos |
| `v-calendar` o `@vuepic/vue-datepicker` | Selector de rango de fechas |
| `vee-validate`, `zod` | Validación de formularios |
| `vue-toastification` | Notificaciones tipo toast |
| `radix-vue` | Componentes accesibles (modales, dropdowns, tabs) |
| `tailwindcss`, `shadcn-vue` | Sistema de diseño |
| `vue-i18n` | Multi-idioma |
| `vue3-apexcharts` o `vue-chartjs` | Gráficos del dashboard |
| `vue-virtual-scroller` | Listas largas (solo si el catálogo crece bastante) |
| `sharp` | Procesamiento de imágenes en backend |
| `bullmq` | Colas de trabajo |
| `google-auth-library` | Validación de Google OAuth en backend |
| `jsonwebtoken` | JWT propio de sesión |

---

## Módulo 11 — Multi-idioma y multi-moneda

### Multi-idioma (i18n) — plenamente viable

### CU-42: Interfaz en múltiples idiomas
- **Actor:** Huésped / Propietario
- **Flujo principal:** todos los textos fijos de la UI (botones, menús, mensajes de error, validaciones) se cargan desde archivos de traducción por idioma.
- **Librería:** `vue-i18n`, con archivos `locales/es.json` y `locales/en.json` cargados de forma diferida (solo el idioma activo, no ambos siempre).
- **Nota técnica:** define la estructura de URL desde el inicio (`/es/...` vs `/en/...` con `vue-router`), porque cambiarla después de lanzado rompe enlaces existentes y posicionamiento en buscadores.

### CU-43: Traducción del contenido de propiedades (título/descripción)
- **Actor:** Propietario (al publicar) / Sistema (si se automatiza)
- **Flujo principal:** dos caminos posibles, a decidir como parte del diseño de producto, no solo técnico:
  1. **Manual:** el propietario escribe título/descripción en cada idioma que quiera soportar — mejor calidad, más fricción para él.
  2. **Automático:** al guardar, el backend llama a una API de traducción (DeepL o Google Translate) y guarda ambas versiones, mostrando un aviso de "traducción automática" en el idioma no original — más rápido de lanzar, calidad variable.
- **Nota técnica MySQL:** requiere una tabla `property_translations` separada (ver esquema actualizado abajo), no columnas `title_es`/`title_en` en `properties`, para poder agregar idiomas nuevos sin migrar el esquema cada vez.

### CU-44: Idioma preferido del usuario en correos (Brevo)
- **Actor:** Sistema
- **Flujo principal:** el backend guarda el idioma preferido del usuario (`users.locale`) y selecciona la plantilla de Brevo correspondiente al enviar cualquier notificación (confirmación de reserva, payout, etc.) — requiere crear una plantilla por idioma en el panel de Brevo, no una sola plantilla con texto mixto.

### CU-45: Reseñas en el idioma original, sin traducción forzada
- **Actor:** Huésped
- **Flujo principal:** las reseñas se muestran tal como se escribieron, sin traducción automática obligatoria (a diferencia del contenido de la propiedad) — es una decisión de producto razonable para no distorsionar la voz real de otros huéspedes; se puede ofrecer un botón opcional de "traducir" más adelante si se justifica.

### Multi-moneda — solo como referencia visual, no como cobro real

**Hallazgo importante que cambia el alcance de este punto:** Wompi liquida exclusivamente en pesos colombianos. Su función de "checkout en dólares" es únicamente una conversión de referencia que ve el pagador — el monto que realmente se cobra y se abona a la plataforma siempre es en COP, sin importar la tarjeta o el origen del pagador. Esto significa que **no es posible cobrar ni recibir pagos en otra moneda a través de Wompi**, y el alcance de "multi-moneda" debe limitarse a mostrar precios de referencia, no a procesar cobros reales en distintas monedas.

### CU-46: Mostrar precio de referencia en otra moneda
- **Actor:** Huésped
- **Flujo principal:** en la ficha de propiedad y en los resultados de búsqueda, mostrar junto al precio en COP una conversión aproximada (ej. "≈ USD 85/noche") calculada con una tasa de cambio actualizada periódicamente.
- **Fuente de la tasa:** la TRM oficial del Banco de la República (tiene API pública) o un servicio como exchangerate.host; se actualiza una vez al día vía cron, no en tiempo real por transacción.
- **Nota técnica MySQL:** tabla `exchange_rates` con `currency_code`, `rate_to_cop`, `updated_at` — el precio base de la propiedad sigue siendo siempre COP en `properties.base_price_per_night`; la conversión se calcula al vuelo en el backend o frontend, nunca se almacena como el precio "real" de la propiedad.

### CU-47: Aviso claro de que el cobro final es en COP
- **Actor:** Huésped
- **Flujo principal:** en el checkout, mostrar explícitamente que el monto que se cobrará es en pesos colombianos, con el equivalente aproximado en la moneda de referencia del huésped solo a título informativo — evita reclamos por diferencias entre el valor "esperado" en su moneda y el cargo real que verá en su tarjeta.

### CU-48 (fuera de alcance del MVP, documentado para el futuro): Cobro real en moneda extranjera
- **Descripción:** si el negocio crece hacia turismo internacional y se vuelve necesario cobrar y liquidar en USD de verdad (no solo mostrar una referencia), la única vía es integrar una **segunda pasarela** (Stripe, PayPal o ePayco) en paralelo a Wompi, exclusivamente para pagos en moneda extranjera.
- **Por qué no está en el alcance inicial:** duplica la complejidad de conciliación contable, payouts en dos monedas y probablemente implicaciones tributarias adicionales (cambiario, declaración de divisas) — no es una decisión puramente técnica, requiere validación con un contador antes de construirse. Se documenta aquí para que quede explícito que fue una decisión consciente de posponer, no un vacío del análisis.

---

## Módulo 12 — Panel del propietario (consolidación)

Este módulo no agrega tablas nuevas: consolida en una sola experiencia de UI las capacidades del propietario que están repartidas en otros módulos, para que un agente de IA la construya como un panel coherente y no como pantallas sueltas.

### CU-49: Vista general del propietario
- **Actor:** Propietario
- **Flujo principal:** al entrar a `/panel`, ve en una sola pantalla: ingresos del mes y acumulado, tasa de ocupación, próximas llegadas/salidas (7 días), payouts pendientes, y alertas (reserva nueva, reseña sin responder, calendario iCal desincronizado).
- **DB-first:** todo sale de la vista `v_host_dashboard` — una sola consulta, sin agregaciones en JS.

### CU-50: Calendario multi-propiedad
- **Actor:** Propietario
- **Flujo principal:** vista de calendario que muestra todas sus propiedades en filas (estilo channel manager simplificado): reservas confirmadas, bloqueos manuales, y fechas importadas por iCal, distinguidas por color. Desde aquí bloquea/desbloquea fechas y ajusta precios especiales sin entrar propiedad por propiedad.
- **DB-first:** alimentado por `v_availability_calendar` filtrada por `host_id`.

### CU-51: Gestión de reservas del propietario
- **Actor:** Propietario
- **Flujo principal:** lista filtrable de reservas (próximas, en curso, pasadas, canceladas) con detalle de huésped, montos y estado de pago; acción de cancelar (aplicando `sp_cancel_booking`) y de contactar al huésped (mailto/WhatsApp en el MVP, mensajería interna si se implementa CU-23).

### CU-52: Historial financiero del propietario
- **Actor:** Propietario
- **Flujo principal:** desglose por reserva de monto bruto, comisión y neto; estado de cada payout con su referencia de Wompi; exportación CSV del período (útil para su contabilidad).

---

## Módulo 13 — Administración general de la plataforma

El panel desde donde se controla la aplicación completa. Es un área separada del sitio público (`/admin`), accesible solo con `role = 'admin'`, con navegación propia.

### CU-53: Dashboard global de la plataforma
- **Actor:** Administrador
- **Flujo principal:** KPIs del negocio en una pantalla: reservas del período (creadas/confirmadas/canceladas), volumen transaccionado (GMV), comisiones generadas, payouts pendientes vs. pagados, usuarios y propietarios nuevos, propiedades activas por ciudad, y tasa de conversión búsqueda→reserva. Con comparación contra el período anterior y gráficos de tendencia (vue3-apexcharts).
- **DB-first:** vista `v_admin_kpis` parametrizada por rango de fechas; ninguna métrica se calcula en JS.

### CU-54: Gestión de usuarios
- **Actor:** Administrador
- **Flujo principal:** buscar cualquier usuario por nombre/email; ver su actividad (reservas, propiedades, reseñas); suspender/reactivar cuentas (`users.status`); promover a admin. La suspensión de un propietario despublica automáticamente sus propiedades (trigger) sin borrar datos.

### CU-55: Moderación de propiedades
- **Actor:** Administrador
- **Flujo principal:** cola de propiedades nuevas o editadas para revisión opcional (configurable: aprobación previa o publicación directa con moderación posterior); despublicar propiedades con contenido inapropiado dejando registro del motivo visible al propietario.

### CU-56: Supervisión de reservas y disputas
- **Actor:** Administrador
- **Flujo principal:** buscar cualquier reserva; ver su línea de tiempo completa (creación, pago con payload de Wompi, cambios de estado, correos enviados según `email_logs`); intervenir manualmente: forzar cancelación con reembolso total/parcial, o marcar un payout como retenido mientras se resuelve una disputa.

### CU-57: Configuración de la plataforma
- **Actor:** Administrador
- **Flujo principal:** editar sin tocar código: tasa de comisión global (y por propietario, sobreescribiendo la global), ciudades habilitadas, tiempo de expiración de pre-reservas, políticas de cancelación disponibles, y textos legales (términos, privacidad).
- **DB-first:** tabla `platform_settings` (clave/valor tipado) leída por los procedimientos — p. ej. `sp_create_booking` toma el tiempo de expiración de aquí, no de una constante en JS.

### CU-58: Auditoría de acciones administrativas
- **Actor:** Sistema
- **Flujo principal:** toda acción de admin que modifique datos de terceros (suspender usuario, despublicar propiedad, forzar reembolso, cambiar comisión) queda registrada en `admin_audit_log` (quién, qué, cuándo, valor anterior/nuevo). No editable ni borrable desde la aplicación.

### Tablas adicionales para estos módulos

```sql
-- Configuración editable de la plataforma (CU-57)
CREATE TABLE platform_settings (
  setting_key VARCHAR(60) PRIMARY KEY,          -- 'default_commission_rate', 'booking_expiry_minutes', ...
  setting_value VARCHAR(500) NOT NULL,
  value_type ENUM('int','decimal','string','bool','json') NOT NULL DEFAULT 'string',
  updated_by BIGINT UNSIGNED,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Auditoría de acciones administrativas (CU-58)
CREATE TABLE admin_audit_log (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  admin_id BIGINT UNSIGNED NOT NULL,
  action VARCHAR(60) NOT NULL,                  -- 'suspend_user', 'unpublish_property', 'force_refund', ...
  target_type VARCHAR(30) NOT NULL,             -- 'user', 'property', 'booking', 'payout', 'setting'
  target_id BIGINT UNSIGNED NOT NULL,
  old_value JSON,
  new_value JSON,
  reason VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_target (target_type, target_id)
) ENGINE=InnoDB;

-- Requiere además agregar a users:
--   status ENUM('active','suspended') NOT NULL DEFAULT 'active'
```

### Endpoints adicionales

| Método | Ruta | Descripción | CU |
|---|---|---|---|
| GET | `/host/dashboard` 🔒[host] | Datos consolidados de `v_host_dashboard` | CU-49 |
| GET | `/host/calendar?from=&to=` 🔒[host] | Calendario multi-propiedad | CU-50 |
| GET | `/host/bookings?status=` 🔒[host] | Reservas de todas sus propiedades | CU-51 |
| GET | `/host/finances?from=&to=&format=csv` 🔒[host] | Historial financiero, exportable | CU-52 |
| GET | `/admin/dashboard?from=&to=` 🔒[admin] | KPIs globales de `v_admin_kpis` | CU-53 |
| GET | `/admin/users?q=&status=` 🔒[admin] | Búsqueda de usuarios | CU-54 |
| PATCH | `/admin/users/:id/status` 🔒[admin] | Suspender/reactivar | CU-54 |
| GET | `/admin/properties?status=pending_review` 🔒[admin] | Cola de moderación | CU-55 |
| PATCH | `/admin/properties/:id/moderate` 🔒[admin] | Aprobar/despublicar con motivo | CU-55 |
| GET | `/admin/bookings/:id/timeline` 🔒[admin] | Línea de tiempo completa de una reserva | CU-56 |
| POST | `/admin/bookings/:id/force-cancel` 🔒[admin] | Cancelación con reembolso manual | CU-56 |
| PATCH | `/admin/payouts/:id/hold` 🔒[admin] | Retener payout en disputa | CU-56 |
| GET/PUT | `/admin/settings` 🔒[admin] | Leer/editar `platform_settings` | CU-57 |
| GET | `/admin/audit-log?target=&admin=` 🔒[admin] | Consulta de auditoría | CU-58 |

*Toda ruta de escritura bajo `/admin` registra automáticamente en `admin_audit_log` vía middleware, no confiando en que cada controller lo recuerde.*

---



La idea de dividir en etapas pequeñas es clave cuando se delega a agentes de IA: cada etapa debe ser un alcance que un agente pueda completar y verificar de forma acotada, con dependencias claras hacia la etapa anterior.

### Etapa 1 — Fundaciones (CU-01 a CU-04)
Autenticación con Google OAuth, roles, JWT propio, perfiles básicos. **Entregable:** un usuario puede registrarse/loguearse con su cuenta de Google, y el sistema distingue huésped/propietario/admin en cada request.

### Etapa 2 — Catálogo (CU-05 a CU-10, CU-59 a CU-61)
CRUD de propiedades con capacidad física (habitaciones/camas/baños/m²), fotos, videos (YouTube/Vimeo + carga directa limitada), ubicación con pin en mapa y privacidad de dirección, dotación estructurada desde `amenity_catalog`, y búsqueda básica por ciudad. **Entregable:** un propietario puede publicar una propiedad completa (fotos, video, mapa, dotación por categorías) y un huésped puede encontrarla y ver una ficha al nivel visual de Airbnb.

### Etapa 3 — Reservas y disponibilidad (CU-11 a CU-14)
La parte más delicada: transacciones con bloqueo de fila, expiración de pre-reservas, calendario visual en el frontend. **Entregable:** dos huéspedes no pueden reservar la misma fecha, y las reservas expiradas liberan la fecha automáticamente.

### Etapa 4 — Pagos (CU-15, CU-16)
Integración de checkout Wompi + webhook + reembolsos. **Entregable:** una reserva se confirma solo tras un pago real y verificado.

### Etapa 5 — Comisiones y payouts (CU-17 a CU-20)
Aprobación de propietarios, cálculo de comisión, cron de payout vía Wompi Pagos a Terceros. **Entregable:** el ciclo económico completo funciona de punta a punta con dinero real (en sandbox primero).

### Etapa 6 — Confianza y notificaciones (CU-21 a CU-26)
Reseñas, notificaciones transaccionales vía Brevo, WhatsApp si se decide incluirlo, mensajería si aplica. **Entregable:** experiencia completa de marketplace con señales de confianza y correos funcionando de punta a punta.

### Etapa 7 — Paneles de propietario y administración (CU-49 a CU-58)
Panel consolidado del propietario (dashboard, calendario multi-propiedad, reservas, finanzas con export CSV) y panel de administración general (`/admin`): KPIs globales, gestión de usuarios, moderación de propiedades, supervisión de reservas/disputas, configuración de plataforma en `platform_settings`, y auditoría en `admin_audit_log`. **Entregable:** el propietario opera todo su negocio desde un solo panel, y tú controlas la plataforma completa desde `/admin` sin tocar la base de datos a mano.

### Etapa 8 — Sincronización iCal con Booking.com/Airbnb (CU-27)
Generación e importación de enlaces iCal por propiedad. **Entregable:** un propietario que ya lista en Airbnb/Booking puede evitar dobles reservas cruzadas sin duplicar trabajo manual. (La integración operativa completa vía channel manager, CU-28, queda como decisión de negocio a evaluar después, no como desarrollo de esta etapa.)

### Etapa 9 — Mejoras de UX (CU-29 a CU-37)
Mapa, galería lightbox, favoritos, fechas flexibles, desglose de precio, compartir por WhatsApp, insignias de confianza, dashboard de propietario, multi-idioma. **Entregable:** la app pasa de "funcional" a "se siente profesional". Se puede desarrollar de forma incremental, sin bloquear ninguna etapa anterior.

### Etapa 10 — Infraestructura de soporte (CU-38 a CU-41)
Motor de búsqueda dedicado, optimización de imágenes, colas de trabajo, monitoreo de errores. **Entregable:** la app sostiene un catálogo creciente sin degradar la experiencia. Recomendado activar cuando el catálogo supere unas pocas decenas de propiedades, no antes.

### Etapa 11 — Multi-idioma y multi-moneda de referencia (CU-42 a CU-48)
Interfaz en español/inglés, traducción de contenido de propiedades, plantillas de correo por idioma, precio de referencia en otra moneda con aviso claro de que el cobro real es en COP. **Entregable:** un huésped extranjero puede navegar la app en inglés y entender el precio aproximado en su moneda, sin que eso implique procesar pagos reales en esa moneda. Se puede desarrollar en paralelo a la Etapa 9, no depende de ella.

---

## Consideraciones al trabajar con agentes de IA por etapas

1. **Congela el esquema de base de datos antes de la Etapa 1.** Cambiar la estructura de tablas a mitad de camino es la fuente más común de trabajo duplicado cuando varios agentes/sesiones tocan el mismo proyecto.
2. **Dale a cada agente el contexto de la etapa anterior**, no solo la etapa actual — por ejemplo, al pedir la Etapa 3 (reservas), incluye el esquema de `users` y `properties` ya definido en la Etapa 2, para que no invente su propia versión incompatible.
3. **La Etapa 3 (transacciones y bloqueo de fila) es la que más conviene revisar tú mismo línea por línea**, incluso si el agente la genera — es el único punto donde un error silencioso (una condición de carrera mal manejada) puede causar dobles reservas reales con dinero de por medio.
4. **Pide siempre pruebas automatizadas para el flujo de reservas y pagos** (aunque sea solo para esos dos módulos) — es la parte del sistema donde un bug cuesta dinero real, a diferencia de, por ejemplo, un error visual en el catálogo.

---

## Esquema de base de datos MySQL

Este esquema es el contexto fijo que debes congelar antes de la Etapa 1 y pasarle a cada agente de IA en las etapas siguientes, para que todos trabajen sobre la misma estructura.

```sql
-- ============================================
-- USUARIOS Y AUTENTICACIÓN
-- ============================================
CREATE TABLE users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  google_id VARCHAR(64) UNIQUE,               -- id de Google OAuth (NULL si algún día se agrega login local)
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(150) NOT NULL,
  avatar_url VARCHAR(500),
  role ENUM('guest', 'host', 'admin') NOT NULL DEFAULT 'guest',
  phone VARCHAR(20),
  locale VARCHAR(5) NOT NULL DEFAULT 'es',          -- idioma preferido (CU-44), ej. 'es', 'en'
  id_verified BOOLEAN NOT NULL DEFAULT FALSE,      -- insignia de confianza (CU-35)
  fast_response BOOLEAN NOT NULL DEFAULT FALSE,    -- insignia de confianza (CU-35)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Datos de KYC/payout del propietario (1:1 con users cuando role='host')
CREATE TABLE host_profiles (
  user_id BIGINT UNSIGNED PRIMARY KEY,
  legal_name VARCHAR(200),
  document_id VARCHAR(50),
  bank_name VARCHAR(100),
  bank_account_number VARCHAR(50),
  bank_account_type ENUM('savings', 'checking'),
  commission_rate DECIMAL(5,2) NOT NULL DEFAULT 15.00,  -- % de comisión de la plataforma
  approval_status ENUM('pending_approval', 'approved', 'rejected') NOT NULL DEFAULT 'pending_approval',
  approved_by BIGINT UNSIGNED,                -- admin que aprobó (CU-17)
  approved_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================
-- PROPIEDADES
-- ============================================
CREATE TABLE properties (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  host_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(150) NOT NULL,
  description TEXT,
  city VARCHAR(100) NOT NULL,
  address VARCHAR(255),
  neighborhood VARCHAR(100),                   -- barrio/sector (CU-60)
  latitude DECIMAL(10,7),                      -- para el mapa (CU-29, CU-60)
  longitude DECIMAL(10,7),
  show_exact_location BOOLEAN NOT NULL DEFAULT FALSE,  -- FALSE = círculo aproximado hasta confirmar reserva (CU-60)
  directions_note TEXT,                        -- "Cómo llegar" (visible tras confirmar)
  area_note TEXT,                              -- "Información del sector" (pública)
  property_type ENUM('apartamento', 'apartaestudio', 'casa', 'suite', 'habitacion') NOT NULL,
  max_guests SMALLINT UNSIGNED NOT NULL DEFAULT 2,
  bedrooms SMALLINT UNSIGNED NOT NULL DEFAULT 1,       -- capacidad física (CU-61)
  beds SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  bathrooms DECIMAL(3,1) NOT NULL DEFAULT 1.0,         -- permite 1.5 (baño y medio)
  area_m2 SMALLINT UNSIGNED NULL,
  base_price_per_night DECIMAL(10,2) NOT NULL,
  cancellation_policy ENUM('flexible', 'moderada', 'estricta') NOT NULL DEFAULT 'moderada',
  status ENUM('draft', 'published', 'paused') NOT NULL DEFAULT 'draft',
  ical_export_token VARCHAR(64) UNIQUE,       -- para generar el enlace iCal propio (CU-27)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (host_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_city_status (city, status)
) ENGINE=InnoDB;

-- Catálogo estructurado de servicios y dotación (CU-61) — administrable desde /admin
CREATE TABLE amenity_catalog (
  id SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category ENUM('basicos','cocina','lavanderia','espacios','edificio','familia','seguridad','accesibilidad','politicas') NOT NULL,
  name VARCHAR(80) NOT NULL,                    -- 'Wifi', 'Piscina', 'Lavadora', ...
  icon VARCHAR(40) NOT NULL,                    -- nombre del icono lucide, ej. 'wifi', 'waves'
  allows_detail BOOLEAN NOT NULL DEFAULT FALSE, -- si admite detalle (velocidad, precio, cantidad)
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE KEY uq_category_name (category, name)
) ENGINE=InnoDB;

CREATE TABLE property_amenities (
  property_id BIGINT UNSIGNED NOT NULL,
  amenity_id SMALLINT UNSIGNED NOT NULL,
  detail VARCHAR(120) NULL,                     -- '200 Mbps', '$15.000/día', '2 dobles + 1 sofá cama'
  PRIMARY KEY (property_id, amenity_id),
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (amenity_id) REFERENCES amenity_catalog(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE property_photos (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  property_id BIGINT UNSIGNED NOT NULL,
  url VARCHAR(500) NOT NULL,                   -- versión full (procesada con sharp, CU-39)
  thumbnail_url VARCHAR(500),
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Videos de la propiedad (CU-59): enlace externo o carga directa limitada
CREATE TABLE property_videos (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  property_id BIGINT UNSIGNED NOT NULL,
  source ENUM('youtube','vimeo','upload') NOT NULL,
  url VARCHAR(500) NOT NULL,                   -- URL del embed o ruta del archivo subido
  thumbnail_url VARCHAR(500),                  -- miniatura (de la API de YouTube/Vimeo o frame extraído)
  duration_seconds SMALLINT UNSIGNED NULL,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Bloqueos manuales y precios especiales por fecha (CU-06)
CREATE TABLE availability_overrides (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  property_id BIGINT UNSIGNED NOT NULL,
  date DATE NOT NULL,
  is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
  special_price DECIMAL(10,2) NULL,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  UNIQUE KEY uq_property_date (property_id, date)
) ENGINE=InnoDB;

-- Enlaces iCal externos importados (Airbnb/Booking) — CU-27
CREATE TABLE ical_links (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  property_id BIGINT UNSIGNED NOT NULL,
  source ENUM('airbnb', 'booking', 'otro') NOT NULL,
  ical_url VARCHAR(500) NOT NULL,
  last_synced_at TIMESTAMP NULL,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Traducciones de contenido de propiedad (CU-43)
CREATE TABLE property_translations (
  property_id BIGINT UNSIGNED NOT NULL,
  locale VARCHAR(5) NOT NULL,                  -- 'es', 'en', etc.
  title VARCHAR(150) NOT NULL,
  description TEXT,
  is_auto_translated BOOLEAN NOT NULL DEFAULT FALSE,  -- para mostrar el aviso de traducción automática
  PRIMARY KEY (property_id, locale),
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Tasas de cambio de referencia, solo para mostrar precio aproximado (CU-46) — nunca para cobrar
CREATE TABLE exchange_rates (
  currency_code CHAR(3) PRIMARY KEY,           -- 'USD', 'EUR', etc.
  rate_to_cop DECIMAL(12,4) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================
-- FAVORITOS (CU-31)
-- ============================================
CREATE TABLE user_favorites (
  user_id BIGINT UNSIGNED NOT NULL,
  property_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, property_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- RESERVAS
-- ============================================
CREATE TABLE bookings (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  property_id BIGINT UNSIGNED NOT NULL,
  guest_id BIGINT UNSIGNED NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  guests_count SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  price_per_night DECIMAL(10,2) NOT NULL,      -- copia del precio al momento de reservar
  total_amount DECIMAL(10,2) NOT NULL,
  status ENUM('pending_payment', 'confirmed', 'cancelled', 'completed') NOT NULL DEFAULT 'pending_payment',
  expires_at TIMESTAMP NULL,                   -- para liberar pre-reservas vencidas (CU-11)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE RESTRICT,
  FOREIGN KEY (guest_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_property_dates (property_id, start_date, end_date),
  INDEX idx_status_expires (status, expires_at)
) ENGINE=InnoDB;

-- ============================================
-- PAGOS Y PAYOUTS (Wompi)
-- ============================================
CREATE TABLE payments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  booking_id BIGINT UNSIGNED NOT NULL,
  wompi_transaction_id VARCHAR(100) UNIQUE,
  amount DECIMAL(10,2) NOT NULL,
  status ENUM('pending', 'approved', 'declined', 'refunded') NOT NULL DEFAULT 'pending',
  payment_method VARCHAR(30),                  -- 'card', 'pse', 'nequi', etc.
  raw_webhook_payload JSON,                    -- copia cruda del webhook de Wompi, para auditoría
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE payouts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  booking_id BIGINT UNSIGNED NOT NULL,
  host_id BIGINT UNSIGNED NOT NULL,
  gross_amount DECIMAL(10,2) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  net_amount DECIMAL(10,2) NOT NULL,
  status ENUM('pending', 'processing', 'paid', 'failed') NOT NULL DEFAULT 'pending',
  wompi_payout_reference VARCHAR(100),
  paid_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE RESTRICT,
  FOREIGN KEY (host_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_status (status)
) ENGINE=InnoDB;

-- ============================================
-- RESEÑAS
-- ============================================
CREATE TABLE reviews (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  booking_id BIGINT UNSIGNED NOT NULL UNIQUE,   -- una reseña por reserva
  property_id BIGINT UNSIGNED NOT NULL,
  guest_id BIGINT UNSIGNED NOT NULL,
  rating TINYINT UNSIGNED NOT NULL,             -- 1 a 5
  comment TEXT,
  host_reply TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (guest_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- NOTIFICACIONES (Brevo)
-- ============================================
CREATE TABLE email_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED,
  booking_id BIGINT UNSIGNED,
  brevo_message_id VARCHAR(100),
  template_type VARCHAR(50) NOT NULL,           -- 'booking_confirmed', 'payout_executed', etc.
  status ENUM('sent', 'delivered', 'bounced', 'spam') NOT NULL DEFAULT 'sent',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
) ENGINE=InnoDB;
```

### Notas sobre este esquema

- **Prevención de doble reserva (CU-11):** la tabla `bookings` por sí sola no impide el solapamiento — eso lo garantiza la transacción con `SELECT ... FOR UPDATE` descrita en CU-11 al insertar, no una constraint de la tabla. El índice `idx_property_dates` existe para que esa verificación sea rápida, no para prevenir el solapamiento por sí mismo.
- **`raw_webhook_payload` en `payments`:** guardar el payload crudo del webhook de Wompi como JSON es una red de seguridad barata — si algún día hay una disputa sobre un pago, tienes la evidencia exacta de lo que Wompi reportó, sin depender de tu propia interpretación de esos datos.
- **`ical_export_token` en `properties`:** es un token opaco (no el ID numérico de la propiedad) para el enlace iCal público, de forma que no se pueda adivinar ni enumerar propiedades ajenas solo cambiando un número en la URL.
- **`properties.title`/`properties.description` siguen siendo el idioma original** (el que escribió el propietario); `property_translations` solo contiene los idiomas adicionales. Así evitas duplicar el idioma original en dos lugares.
- **`exchange_rates` es exclusivamente informativa.** Ningún monto de `bookings` o `payments` se calcula ni se guarda en otra moneda — esas tablas siempre están en COP, que es la única moneda que Wompi realmente procesa. Esta tabla solo alimenta la conversión visual de precios (CU-46).
- **Todas las tablas usan InnoDB** (no MyISAM) porque es el único motor de MySQL que soporta transacciones reales — imprescindible para el patrón de bloqueo de fila de CU-11.

---

## Endpoints de la API (Express), agrupados por módulo

Convenciones usadas en todo el listado:
- Prefijo base: `/api/v1`
- Autenticación: header `Authorization: Bearer <jwt>` en todas las rutas marcadas 🔒
- Roles requeridos entre corchetes junto a 🔒 (ej. `🔒[host]` = solo propietario dueño del recurso; `🔒[admin]` = solo administrador; `🔒[any]` = cualquier usuario autenticado)
- Los endpoints públicos (sin 🔒) son accesibles sin sesión, típico de catálogo y búsqueda

### Módulo 1 — Autenticación y perfiles

| Método | Ruta | Descripción | Caso de uso |
|---|---|---|---|
| POST | `/auth/google` | Recibe el `id_token` de Google, lo valida, crea o encuentra el usuario, retorna JWT propio + refresh token | CU-01 |
| POST | `/auth/refresh` | Renueva el access token usando el refresh token | CU-02 |
| POST | `/auth/logout` 🔒[any] | Invalida el refresh token actual | CU-02 |
| GET | `/users/me` 🔒[any] | Retorna el perfil del usuario autenticado | CU-02 |
| PATCH | `/users/me` 🔒[any] | Actualiza nombre, teléfono, avatar | — |
| POST | `/users/me/become-host` 🔒[any] | Convierte al usuario en propietario, crea su `host_profiles` en estado `pending_approval` | CU-04 |
| PATCH | `/host-profiles/me` 🔒[host] | Actualiza datos de KYC/cuenta bancaria propios | CU-04 |
| GET | `/admin/hosts?status=pending_approval` 🔒[admin] | Lista propietarios pendientes de aprobar | CU-17 |
| POST | `/admin/hosts/:hostId/approve` 🔒[admin] | Aprueba un propietario | CU-17 |
| POST | `/admin/hosts/:hostId/reject` 🔒[admin] | Rechaza un propietario, con motivo | CU-17 |

### Módulo 2 — Gestión de propiedades

| Método | Ruta | Descripción | Caso de uso |
|---|---|---|---|
| POST | `/properties` 🔒[host] | Crea una propiedad en estado `draft` | CU-05 |
| GET | `/properties/mine` 🔒[host] | Lista las propiedades del propietario autenticado | — |
| GET | `/properties/:id` | Ficha pública de una propiedad (público) | CU-09 |
| PATCH | `/properties/:id` 🔒[host, dueño] | Edita título, descripción, precio, amenidades, etc. | CU-05 |
| PATCH | `/properties/:id/status` 🔒[host, dueño] | Cambia entre `draft`/`published`/`paused` | CU-07 |
| DELETE | `/properties/:id` 🔒[host, dueño] | Elimina (soft-delete recomendado, no borrado físico) | — |
| POST | `/properties/:id/photos` 🔒[host, dueño] | Sube una o más fotos (procesadas con `sharp`, ver CU-39) | CU-05 |
| DELETE | `/properties/:id/photos/:photoId` 🔒[host, dueño] | Elimina una foto | — |
| PATCH | `/properties/:id/photos/reorder` 🔒[host, dueño] | Reordena las fotos (`sort_order`) | — |
| POST | `/properties/:id/videos` 🔒[host, dueño] | Agrega video: `{source, url}` para YouTube/Vimeo, o multipart para carga directa (MP4 ≤100 MB, máx. 2 por propiedad) | CU-59 |
| DELETE | `/properties/:id/videos/:videoId` 🔒[host, dueño] | Elimina un video | CU-59 |
| PATCH | `/properties/:id/location` 🔒[host, dueño] | Actualiza lat/lng, dirección, barrio, `show_exact_location`, notas de llegada/sector | CU-60 |
| GET | `/amenity-catalog` | Catálogo completo de servicios/dotación agrupado por categoría (público, cacheado) | CU-61 |
| PUT | `/properties/:id/amenities` 🔒[host, dueño] | Reemplaza el set de amenidades de la propiedad: `[{amenity_id, detail?}]` | CU-61 |
| POST/PATCH | `/admin/amenity-catalog` 🔒[admin] | Agregar/editar ítems del catálogo sin cambios de código | CU-61 |
| GET | `/properties/:id/availability?month=2026-08` | Calendario de disponibilidad del mes (público) | CU-06, CU-09 |
| PUT | `/properties/:id/availability` 🔒[host, dueño] | Bloquea fechas o define precios especiales | CU-06 |

### Módulo 3 — Búsqueda y descubrimiento

| Método | Ruta | Descripción | Caso de uso |
|---|---|---|---|
| GET | `/search?city=&start=&end=&guests=&flexible=` | Búsqueda principal con disponibilidad real | CU-08, CU-32 |
| GET | `/search/filters?city=&min_price=&max_price=&amenities=&type=` | Búsqueda con filtros adicionales | CU-10 |
| GET | `/search/map?city=` | Variante optimizada para el mapa: solo id, lat/lng, precio, título | CU-29 |
| GET | `/cities` | Lista de ciudades disponibles (para el selector de búsqueda) | — |

*Nota: cuando se implemente Meilisearch/Typesense (CU-38, Etapa 10), estos endpoints seguirán igual en su contrato — solo cambia la implementación interna, de query SQL a llamada al motor de búsqueda. Vale la pena diseñarlos así desde el inicio para no romper el frontend al migrar.*

### Módulo 4 — Reservas

| Método | Ruta | Descripción | Caso de uso |
|---|---|---|---|
| POST | `/bookings` 🔒[any] | Crea una pre-reserva (`pending_payment`) dentro de la transacción con bloqueo de fila | CU-11 |
| GET | `/bookings/mine` 🔒[any] | Reservas del huésped autenticado | CU-13 |
| GET | `/bookings/:id` 🔒[any, dueño de la reserva o del inmueble] | Detalle de una reserva | CU-13, CU-14 |
| GET | `/properties/:id/bookings` 🔒[host, dueño] | Reservas de una propiedad específica | CU-14 |
| POST | `/bookings/:id/cancel` 🔒[any, dueño de la reserva] | Cancela, aplica política de cancelación, dispara reembolso si corresponde | CU-12 |
| DELETE (interno, cron) | — | Job que expira `pending_payment` vencidas (no es un endpoint HTTP expuesto, corre como tarea programada) | CU-11 |

### Módulo 5 — Pagos (Wompi)

| Método | Ruta | Descripción | Caso de uso |
|---|---|---|---|
| POST | `/bookings/:id/payment-intent` 🔒[any, dueño de la reserva] | Genera los datos necesarios para abrir el checkout de Wompi (referencia, monto, firma de integridad) | CU-15 |
| POST | `/webhooks/wompi` | Recibe eventos de Wompi (pago aprobado, rechazado); **valida la firma antes de procesar** | CU-15 |
| POST | `/bookings/:id/refund` 🔒[admin o sistema] | Solicita reembolso a Wompi tras una cancelación | CU-16 |

### Módulo 6 — Comisiones y payouts

| Método | Ruta | Descripción | Caso de uso |
|---|---|---|---|
| GET | `/payouts/mine` 🔒[host] | Historial de payouts del propietario autenticado | — |
| GET | `/admin/payouts?status=pending` 🔒[admin] | Lista payouts pendientes de ejecutar | CU-19 |
| POST | `/admin/payouts/run` 🔒[admin] o (interno, cron) | Dispara el lote de payouts pendientes vía Wompi Pagos a Terceros | CU-19 |
| GET | `/admin/reports/commissions?from=&to=` 🔒[admin] | Reporte de comisiones por rango de fechas | CU-20 |

### Módulo 7 — Reseñas

| Método | Ruta | Descripción | Caso de uso |
|---|---|---|---|
| POST | `/bookings/:id/review` 🔒[any, dueño de la reserva] | Crea una reseña (solo si la reserva está `completed`) | CU-21 |
| GET | `/properties/:id/reviews` | Lista reseñas de una propiedad (público) | — |
| POST | `/reviews/:id/reply` 🔒[host, dueño de la propiedad] | Respuesta del propietario a una reseña | CU-22 |

### Módulo 8 — Notificaciones (Brevo)

| Método | Ruta | Descripción | Caso de uso |
|---|---|---|---|
| POST | `/webhooks/brevo` | Recibe eventos de entrega (`delivered`, `bounce`, `spam`) | CU-26 |

*Nota: no hay endpoints públicos para "enviar" correos — el envío se dispara internamente desde otros flujos (confirmación de reserva, payout ejecutado), nunca como una acción que el frontend invoque directamente.*

### Módulo 9 — Sincronización iCal

| Método | Ruta | Descripción | Caso de uso |
|---|---|---|---|
| GET | `/properties/:id/ical/:token.ics` | Enlace público (con token opaco) que expone el calendario de la propiedad en formato iCal, para pegar en Airbnb/Booking | CU-27 |
| POST | `/properties/:id/ical-links` 🔒[host, dueño] | Registra un enlace iCal externo (de Airbnb/Booking) para importar | CU-27 |
| DELETE | `/properties/:id/ical-links/:linkId` 🔒[host, dueño] | Elimina un enlace iCal importado | CU-27 |
| — (interno, cron) | — | Job periódico que consulta cada `ical_links` y bloquea fechas en `availability_overrides` | CU-27 |

### Módulo 10 — Favoritos

| Método | Ruta | Descripción | Caso de uso |
|---|---|---|---|
| GET | `/users/me/favorites` 🔒[any] | Lista propiedades favoritas del usuario | CU-31 |
| PUT | `/properties/:id/favorite` 🔒[any] | Marca como favorita | CU-31 |
| DELETE | `/properties/:id/favorite` 🔒[any] | Quita de favoritas | CU-31 |

### Módulo 11 — Multi-idioma y multi-moneda

| Método | Ruta | Descripción | Caso de uso |
|---|---|---|---|
| GET | `/properties/:id?locale=en` | La ficha de propiedad retorna `property_translations` para el `locale` pedido, con fallback al idioma original si no existe traducción | CU-42, CU-43 |
| PUT | `/properties/:id/translations/:locale` 🔒[host, dueño] | Crea o actualiza la traducción manual de una propiedad | CU-43 |
| PATCH | `/users/me/locale` 🔒[any] | Actualiza el idioma preferido del usuario (usado luego por Brevo, CU-44) | CU-44 |
| GET | `/exchange-rates` | Lista las tasas de cambio de referencia vigentes (público, cacheado) | CU-46 |
| — (interno, cron) | — | Job diario que actualiza `exchange_rates` desde la TRM del Banco de la República | CU-46 |

*Nota: no existe ni debe existir un endpoint que reciba un monto "a cobrar en USD" — todo cálculo de cobro real ocurre siempre en COP dentro del módulo de pagos (Módulo 5); estos endpoints son exclusivamente de presentación.*

---

## Estructura de carpetas sugerida para el backend Express

Organizar las rutas por módulo (no todo en un solo `routes.js`) hace que sea mucho más fácil delegarle a un agente de IA "trabaja solo en el módulo de reservas" sin que toque archivos de otros módulos:

```
/src
  /modules
    /auth
      auth.routes.js
      auth.controller.js
      auth.service.js         # valida id_token de Google, emite JWT
    /users
      users.routes.js
      users.controller.js
    /properties
      properties.routes.js
      properties.controller.js
      properties.service.js
      availability.service.js  # lógica de disponibilidad y overrides
    /search
      search.routes.js
      search.controller.js
    /bookings
      bookings.routes.js
      bookings.controller.js
      bookings.service.js      # transacción con SELECT...FOR UPDATE (CU-11)
    /payments
      payments.routes.js
      wompi.webhook.js          # valida firma, procesa evento
      wompi.client.js           # llamadas salientes a la API de Wompi
    /payouts
      payouts.routes.js
      payouts.service.js
      payouts.cron.js
    /reviews
      reviews.routes.js
    /notifications
      brevo.client.js
      brevo.webhook.js
    /ical
      ical.routes.js
      ical.sync.cron.js
  /middleware
    auth.middleware.js          # valida JWT, adjunta req.user
    requireRole.js
    requireOwnership.js
  /db
    connection.js                # pool de conexión MySQL
    migrations/                  # una migración por tabla del esquema ya definido
  app.js
  server.js
```

**Recomendación práctica para el trabajo con agentes de IA:** pídele a cada agente que trabaje dentro de una sola carpeta de `/modules` por sesión, y que nunca modifique `/middleware` ni `/db/migrations` sin que se lo pidas explícitamente — así evitas que una sesión enfocada en reseñas termine, sin querer, cambiando la lógica de autenticación que ya funciona.
