import { z } from 'zod';

/**
 * Validación y normalización de URLs de video de propiedades.
 *
 * Antes, addPropertyVideo aceptaba cualquier cadena como URL sin comprobar que
 * correspondiera al proveedor declarado en `source`. Un enlace inválido rompía
 * el embed en la ficha de la propiedad, y un `source: 'youtube'` con una URL
 * arbitraria permitía incrustar contenido de terceros en el sitio.
 */

/** Extrae el ID de un video de YouTube en cualquiera de sus formatos habituales. */
export const extractYouTubeId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
};

/** Extrae el ID numérico de un video de Vimeo. */
export const extractVimeoId = (url: string): string | null => {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d{6,})/);
  return m?.[1] ?? null;
};

export interface NormalizedVideo {
  source: 'youtube' | 'vimeo' | 'upload';
  url: string;
  thumbnailUrl: string | null;
  externalId: string | null;
}

/**
 * Valida que la URL corresponda al proveedor declarado y devuelve la URL
 * canónica junto con la miniatura, que en YouTube se puede derivar sin
 * llamar a ninguna API.
 *
 * Lanza Error con mensaje legible si la URL no es válida para ese proveedor.
 */
export const normalizeVideo = (
  source: string,
  url: string
): NormalizedVideo => {
  if (source === 'youtube') {
    const id = extractYouTubeId(url);
    if (!id) {
      throw new Error('La URL no corresponde a un video de YouTube válido');
    }
    return {
      source: 'youtube',
      url: `https://www.youtube.com/watch?v=${id}`,
      thumbnailUrl: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
      externalId: id,
    };
  }

  if (source === 'vimeo') {
    const id = extractVimeoId(url);
    if (!id) {
      throw new Error('La URL no corresponde a un video de Vimeo válido');
    }
    return {
      source: 'vimeo',
      url: `https://vimeo.com/${id}`,
      thumbnailUrl: null,
      externalId: id,
    };
  }

  if (source === 'upload') {
    if (!url.startsWith('/uploads/')) {
      throw new Error('Las cargas directas deben apuntar a /uploads/');
    }
    return { source: 'upload', url, thumbnailUrl: null, externalId: null };
  }

  throw new Error('Proveedor de video no soportado');
};

/** Esquema de entrada para POST /properties/:id/videos */
export const addVideoSchema = z.object({
  source: z.enum(['youtube', 'vimeo', 'upload']),
  url: z.string().url('La URL no tiene un formato válido').max(500),
});
