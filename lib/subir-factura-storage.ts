import type { SupabaseClient } from '@supabase/supabase-js';

const BUCKET_FACTURAS = 'facturas';

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

export type SubirFacturaResult = { url: string } | { error: string };

/**
 * Sube una imagen al bucket público "facturas" y devuelve la URL pública.
 * Ruta: `{userId}/{timestamp}-{random}.{ext}`
 */
export async function subirImagenFacturaAlBucket(
  supabase: SupabaseClient,
  file: File
): Promise<SubirFacturaResult> {
  if (!file.type.startsWith('image/')) {
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

  const { data, error } = await supabase.storage
    .from(BUCKET_FACTURAS)
    .upload(path, file, {
      contentType: file.type || `image/${ext}`,
      upsert: false,
    });

  if (error) {
    return {
      error: `No se pudo subir la imagen: ${error.message}`,
    };
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET_FACTURAS)
    .getPublicUrl(data.path);

  const publicUrl = urlData?.publicUrl;
  if (!publicUrl) {
    return { error: 'No se pudo obtener la URL pública de la imagen.' };
  }

  return { url: publicUrl };
}
