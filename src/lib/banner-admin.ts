import { supabase } from '@/integrations/supabase/client';
import type { BannerSlide } from '@/lib/home-layout';

/** Admin data access for sponsor banner slides and their images. Functions return an error message or null. */

const NOT_CONNECTED = 'The database is not connected.';
const BUCKET = 'home-banners';
const MAX_BYTES = 2 * 1024 * 1024;
const TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

export const SLIDE_COLS =
'id, section_id, position, is_visible, image_url, image_url_es, alt_text, alt_text_es, sponsor_name, link_type, link_value, open_mode, start_at, end_at, tap_count, view_count, updated_at, updated_by_name';

export type SlideInput = Omit<BannerSlide, 'id' | 'tap_count' | 'view_count' | 'updated_at' | 'updated_by_name'>;

export function imageFileError(file: File): string | null {
  if (!TYPES[file.type]) return 'Use a JPG, PNG or WebP image.';
  if (file.size > MAX_BYTES) return `This image is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 2 MB.`;
  return null;
}

export async function uploadBannerImage(file: File): Promise<{url: string | null;error: string | null;}> {
  if (!supabase) return { url: null, error: NOT_CONNECTED };
  const bad = imageFileError(file);
  if (bad) return { url: null, error: bad };
  const path = `${crypto.randomUUID()}.${TYPES[file.type]}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, cacheControl: '31536000', upsert: false });
  if (error) return { url: null, error: error.message };
  return { url: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl, error: null };
}

/** File path inside the bucket, or null for images stored elsewhere. */
export function bucketPath(url: string | null | undefined): string | null {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const i = url.indexOf(marker);
  return i < 0 ? null : decodeURIComponent(url.slice(i + marker.length).split('?')[0]);
}

/** Deletes uploaded images that are no longer used. Failures are ignored (the slide change already succeeded). */
export async function removeBannerImages(urls: (string | null | undefined)[]): Promise<void> {
  if (!supabase) return;
  const paths = [...new Set(urls.map(bucketPath).filter((p): p is string => !!p))];
  if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
}

export async function insertSlide(slide: SlideInput): Promise<string | null> {
  if (!supabase) return NOT_CONNECTED;
  const { error } = await supabase.from('home_banner_slides').insert(slide);
  return error?.message ?? null;
}

export async function updateSlide(id: string, patch: Partial<SlideInput>): Promise<string | null> {
  if (!supabase) return NOT_CONNECTED;
  const { error } = await supabase.from('home_banner_slides').update(patch).eq('id', id);
  return error?.message ?? null;
}

export async function deleteSlide(slide: BannerSlide): Promise<string | null> {
  if (!supabase) return NOT_CONNECTED;
  const { error } = await supabase.from('home_banner_slides').delete().eq('id', slide.id);
  // Images are queued for removal (180 days) by the database
  return error?.message ?? null;
}

export async function saveSlidePositions(ids: string[]): Promise<string | null> {
  if (!supabase) return NOT_CONNECTED;
  const client = supabase;
  const results = await Promise.all(ids.map((id, i) => client.from('home_banner_slides').update({ position: i + 1 }).eq('id', id)));
  return results.find((r) => r.error)?.error?.message ?? null;
}
