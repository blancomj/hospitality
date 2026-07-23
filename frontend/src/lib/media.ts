/**
 * Resolución de URLs de archivos servidos por el backend (fotos y videos de
 * propiedades, avatares subidos, etc.).
 *
 * El backend guarda en la base de datos rutas RELATIVAS como
 * `/uploads/properties/12/thumb_abc.webp`. Eso funciona solo si el navegador
 * puede alcanzar esa ruta en el mismo origen desde el que carga la aplicación,
 * y no siempre es el caso:
 *
 *  - En desarrollo, el frontend corre en :5173 y el backend en :3001. Vite
 *    únicamente hace proxy de `/api`, así que una petición a `/uploads/...`
 *    devolvía el index.html de la SPA (HTTP 200 con HTML) en lugar de la
 *    imagen: el <img> recibía una página web y no mostraba nada.
 *
 *  - En producción, si el frontend se sirve desde un dominio distinto al de
 *    la API, ocurre lo mismo.
 *
 * Con VITE_MEDIA_BASE_URL se puede fijar el origen del backend. Si no está
 * definida, se devuelve la ruta tal cual, que es lo correcto cuando frontend y
 * API comparten origen (por ejemplo detrás de un proxy inverso).
 */
const MEDIA_BASE = (import.meta.env.VITE_MEDIA_BASE_URL || '').replace(/\/+$/, '')

/**
 * Convierte una ruta de medio del backend en una URL utilizable por el navegador.
 * Devuelve cadena vacía si no hay ruta, para que el `v-if` del componente
 * pueda decidir mostrar el marcador de posición.
 */
export const mediaUrl = (ruta?: string | null): string => {
  if (!ruta) return ''

  // Las URLs absolutas (YouTube, Vimeo, avatares de Google, un CDN externo)
  // se devuelven intactas.
  if (/^(https?:)?\/\//i.test(ruta) || ruta.startsWith('data:')) return ruta

  if (!MEDIA_BASE) return ruta

  return `${MEDIA_BASE}${ruta.startsWith('/') ? '' : '/'}${ruta}`
}
