import { supabase } from '@/integrations/supabase/client';
import { bucketPath } from '@/lib/banner-admin';

/** Old Home images (home-banners bucket) waiting to be removed. Owners and editors only. */

const BUCKET = 'home-banners';
const NOT_CONNECTED = 'The database is not connected.';

export interface OldImage {
  id: string;
  storage_path: string;
  image_url: string | null;
  used_in: string | null;
  replaced_at: string;
  delete_after: string;
  size: number | null;
}

export interface DeleteResult {deleted: number;kept: number;error: string | null;}

export async function fetchOldImages(): Promise<OldImage[] | null> {
  if (!supabase) return null;
  const [rows, files] = await Promise.all([
  supabase.from('home_image_cleanup').select('id, storage_path, image_url, used_in, replaced_at, delete_after').order('delete_after'),
  supabase.storage.from(BUCKET).list('', { limit: 1000 })]
  );
  if (rows.error) return null;
  const sizes = new Map((files.data ?? []).map((f) => [f.name, (f.metadata as {size?: number;} | null)?.size ?? null]));
  return (rows.data ?? []).map((r) => ({ ...r, size: sizes.get(r.storage_path) ?? null }));
}

/** Text of every Home row, to check whether a file is still used. Null if it couldn't be checked. */
async function homeUsageText(): Promise<string | null> {
  if (!supabase) return null;
  const [s, i, sl, ph] = await Promise.all([
  supabase.from('home_sections').select('settings'),
  supabase.from('home_section_items').select('*'),
  supabase.from('home_banner_slides').select('image_url, image_url_es'),
  supabase.from('home_gallery_photos').select('image_url')]
  );
  if (s.error || i.error || sl.error || ph.error) return null;
  return JSON.stringify([s.data, i.data, sl.data, ph.data]);
}

/** Deletes files now, skipping any still used on Home. */
export async function deleteOldImagesNow(paths: string[]): Promise<DeleteResult> {
  if (!supabase) return { deleted: 0, kept: 0, error: NOT_CONNECTED };
  const unique = [...new Set(paths)];
  if (!unique.length) return { deleted: 0, kept: 0, error: null };
  const usage = await homeUsageText();
  if (usage === null) return { deleted: 0, kept: 0, error: 'Could not check whether these images are still used. Nothing was deleted.' };
  const free = unique.filter((p) => !usage.includes(`/${BUCKET}/${p}`));
  const kept = unique.length - free.length;
  if (free.length) {
    const rm = await supabase.storage.from(BUCKET).remove(free);
    if (rm.error) return { deleted: 0, kept, error: rm.error.message };
    const del = await supabase.from('home_image_cleanup').delete().in('storage_path', free);
    if (del.error) return { deleted: free.length, kept, error: del.error.message };
  }
  return { deleted: free.length, kept, error: null };
}

export function deleteImageUrlsNow(urls: (string | null | undefined)[]): Promise<DeleteResult> {
  return deleteOldImagesNow(urls.map(bucketPath).filter((p): p is string => !!p));
}

// "Delete the old image now" inside section settings: applied after the section saves.
const pending = new Set<string>();
export function markDeleteNow(url: string) {
  const p = bucketPath(url);
  if (p) pending.add(p);
}
export async function flushDeleteNow(): Promise<void> {
  if (!pending.size) return;
  const paths = [...pending];
  pending.clear();
  await deleteOldImagesNow(paths);
}

export function formatBytes(n: number): string {
  if (n < 1024 * 1024) return `${Math.max(0, n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
