import type { SupabaseClient } from '@supabase/supabase-js';
import { logFacturaStorage } from '@/lib/factura-archivo-movil';
import { isSupabaseEnvConfigured } from '@/lib/supabase';

const BUCKET_FACTURAS = 'facturas';

/**
 * Políticas esperadas en Supabase (Storage → facturas), para que el upload del cliente funcione:
 * - INSERT en storage.objects: usuarios autenticados, bucket `facturas`, ruta bajo `auth.uid()/...`
 *   Ejemplo (ajusta nombres): policy con check (bucket_id = 'facturas' AND auth.role() = 'authenticated')
 * - SELECT público solo si usas getPublicUrl (bucket puede ser público o policy de lectura acorde).
 * Si el bucket no existe o el rol no puede insertar, el SDK devuelve error en `error.message`, no "Failed to fetch".
 */

function extensionDesdeArchivo(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]+$/.test(fromName) && fromName.length <= 8) {
    return fromName === 'jpeg' ? 'jpg' : fromName;
  }
  const t = file.type.toLowerCase();
  if (t === 'image/png') return 'png';
  if (t === 'image/webp') return 'webp';
  if (t === 'image/gif') return 'gif';
  if (t === 'image/heic' || t === 'image/heif') return 'heic';
  return 'jpg';
}

function esSubibleComoImagen(file: File): boolean {
  if (file.type.startsWith('image/')) return true;
  const n = file.name.toLowerCase();
  if (/\.(jpe?g|png|gif|webp|heic|heif|bmp|dng)$/i.test(n)) return true;
  if ((!file.type || file.type === '') && file.size > 0) return true;
  return false;
}

function contentTypeParaUpload(file: File, ext: string): string {
  if (file.type && file.type.startsWith('image/')) return file.type;
  const map: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    heic: 'image/heic',
    heif: 'image/heif',
  };
  return map[ext] ?? 'image/jpeg';
}

export type SubirFacturaResult = { url: string } | { error: string };

/**
 * Sube una imagen al bucket público "facturas" y devuelve la URL pública.
 * Ruta: `{userId}/{timestamp}-{random}.{ext}`
 */
function mensajeFalloRed(causa: unknown): string {
  const base =
    'No se pudo conectar con el almacenamiento. Revisa: 1) Variables NEXT_PUBLIC_SUPABASE_URL y clave anónima en .env.local / el hosting. 2) Red y que la URL del proyecto sea correcta. 3) En Supabase: bucket «facturas», políticas de INSERT para usuarios autenticados y ruta bajo tu user id.';
  if (causa instanceof Error && causa.message) {
    return `${base} (detalle técnico: ${causa.message})`;
  }
  return base;
}

export async function subirImagenFacturaAlBucket(
  supabase: SupabaseClient,
  file: File
): Promise<SubirFacturaResult> {
  logFacturaStorage('inicio', {
    nombre: file.name,
    tipo: file.type || '(vacío)',
    tamaño: file.size,
  });

  if (!isSupabaseEnvConfigured) {
    logFacturaStorage('abortado: env Supabase incompleto');
    return {
      error:
        'Configuración incompleta: faltan NEXT_PUBLIC_SUPABASE_URL o la clave anónima de Supabase. Revisa .env.local y reinicia el servidor de desarrollo.',
    };
  }

  if (!esSubibleComoImagen(file)) {
    logFacturaStorage('rechazado: no parece imagen');
    return { error: 'El archivo debe ser una imagen.' };
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user?.id) {
    return { error: 'No hay sesión activa. Inicia sesión de nuevo.' };
  }

  const userId = userData.user.id;
  const ext = extensionDesdeArchivo(file);
  const random = Math.random().toString(36).slice(2, 12);
  const path = `${userId}/${Date.now()}-${random}.${ext}`;
  const contentType = contentTypeParaUpload(file, ext);

  let data: { path: string } | null = null;
  let error: { message: string } | null = null;

  try {
    const res = await supabase.storage.from(BUCKET_FACTURAS).upload(path, file, {
      contentType,
      upsert: false,
    });
    data = res.data;
    error = res.error;
  } catch (err) {
    logFacturaStorage('error fetch', {
      mensaje: err instanceof Error ? err.message : String(err),
    });
    return { error: mensajeFalloRed(err) };
  }

  if (error) {
    logFacturaStorage('error', { mensaje: error.message });
    return {
      error: `No se pudo subir la imagen: ${error.message}`,
    };
  }

  if (!data?.path) {
    logFacturaStorage('error', { mensaje: 'respuesta sin path' });
    return { error: 'La subida no devolvió una ruta válida.' };
  }

  const uploadedPath = data.path;

  const { data: urlData } = supabase.storage
    .from(BUCKET_FACTURAS)
    .getPublicUrl(uploadedPath);

  const publicUrl = urlData?.publicUrl;
  if (!publicUrl) {
    logFacturaStorage('error', { mensaje: 'sin publicUrl' });
    return { error: 'No se pudo obtener la URL pública de la imagen.' };
  }

  logFacturaStorage('fin OK', { path: data.path });
  return { url: publicUrl };
}
