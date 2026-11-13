import { supabase } from '@/integrations/supabase/client';
import { removeBannerImages, uploadBannerImage } from '@/lib/banner-admin';
import type { GalleryPhoto } from '@/lib/home-layout';

/** Admin data access for gallery photos (stored in the home-banners bucket). Functions return an error message or null. */

const NOT_CONNECTED = 'The database is not connected.';

export const PHOTO_COLS = 'id, section_id, position, is_visible, image_url, alt_text, alt_text_es, caption, caption_es, updated_at, updated_by_name';

export type PhotoPatch = Partial<Pick<GalleryPhoto, 'is_visible' | 'alt_text' | 'alt_text_es' | 'caption' | 'caption_es'>>;

/** Uploads several photos in order. Photos start without a description (hidden in the app until it's added). */
export async function uploadGalleryPhotos(sectionId: string, startPosition: number, files: File[]): Promise<string | null> {
  if (!supabase) return NOT_CONNECTED;
  const errors: string[] = [];
  let position = startPosition;
  for (const file of files) {
    const { url, error } = await uploadBannerImage(file);
    if (error || !url) {
      errors.push(`${file.name}: ${error ?? 'upload failed'}`);
      continue;
    }
    const ins = await supabase.from('home_gallery_photos').insert({ section_id: sectionId, position: position++, image_url: url, alt_text: '' });
    if (ins.error) {
      errors.push(`${file.name}: ${ins.error.message}`);
      await removeBannerImages([url]);
    }
  }
  return errors.length ? errors.join(' ') : null;
}

export async function updatePhoto(id: string, patch: PhotoPatch): Promise<string | null> {
  if (!supabase) return NOT_CONNECTED;
  const { error } = await supabase.from('home_gallery_photos').update(patch).eq('id', id);
  return error?.message ?? null;
}

export async function deletePhoto(photo: GalleryPhoto): Promise<string | null> {
  if (!supabase) return NOT_CONNECTED;
  const { error } = await supabase.from('home_gallery_photos').delete().eq('id', photo.id);
  // The image is queued for removal (180 days) by the database
  return error?.message ?? null;
}

export async function savePhotoPositions(ids: string[]): Promise<string | null> {
  if (!supabase) return NOT_CONNECTED;
  const client = supabase;
  const results = await Promise.all(ids.map((id, i) => client.from('home_gallery_photos').update({ position: i + 1 }).eq('id', id)));
  return results.find((r) => r.error)?.error?.message ?? null;
}
