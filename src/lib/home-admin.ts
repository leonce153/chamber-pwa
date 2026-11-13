import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { SLIDE_COLS } from '@/lib/banner-admin';
import { flushDeleteNow } from '@/lib/home-image-cleanup';
import { PHOTO_COLS } from '@/lib/gallery-admin';
import {
  buildLayout, DEFAULT_LAYOUT,
  type HomeItem, type HomeSection, type SectionSettings, type SectionType } from
'@/lib/home-layout';

/** Admin data access for the Home screen builder. Every function returns an error message or null. */

const SECTION_COLS = 'id, type, position, is_visible, title, title_es, settings, updated_at, updated_by_name';
const ITEM_COLS = 'id, section_id, position, is_visible, label, label_es, hint, hint_es, viewer_title, viewer_title_es, icon, color, link_type, link_value, open_mode, updated_at, updated_by_name';
const NOT_CONNECTED = 'The database is not connected.';

export type ItemInput = Omit<HomeItem, 'id' | 'updated_at' | 'updated_by_name'>;

export async function fetchAdminLayout(): Promise<{data: HomeSection[] | null;error: string | null;}> {
  if (!supabase) return { data: null, error: NOT_CONNECTED };
  const [s, i, sl, ph] = await Promise.all([
  supabase.from('home_sections').select(SECTION_COLS).order('position'),
  supabase.from('home_section_items').select(ITEM_COLS).order('position'),
  supabase.from('home_banner_slides').select(SLIDE_COLS).order('position'),
  supabase.from('home_gallery_photos').select(PHOTO_COLS).order('position')]
  );
  const err = s.error ?? i.error ?? sl.error ?? ph.error;
  if (err) return { data: null, error: err.message };
  return { data: buildLayout(s.data ?? [], i.data ?? [], false, sl.data ?? [], ph.data ?? []), error: null };
}

export async function updateSection(
id: string,
patch: {is_visible?: boolean;title?: string | null;title_es?: string | null;position?: number;settings?: SectionSettings;})
: Promise<string | null> {
  if (!supabase) return NOT_CONNECTED;
  const { settings, ...rest } = patch;
  const payload = settings ? { ...rest, settings: settings as unknown as Json } : rest;
  const { error } = await supabase.from('home_sections').update(payload).eq('id', id);
  if (error) return error.message;
  await flushDeleteNow();
  return null;
}

export async function addSection(
type: SectionType,
position: number,
init: {title?: string | null;title_es?: string | null;settings?: SectionSettings;} = {})
: Promise<string | null> {
  if (!supabase) return NOT_CONNECTED;
  const { error } = await supabase.from('home_sections').insert({
    type,
    position,
    title: init.title ?? null,
    title_es: init.title_es ?? null,
    settings: (init.settings ?? {}) as unknown as Json
  });
  return error?.message ?? null;
}

export async function deleteSection(id: string): Promise<string | null> {
  if (!supabase) return NOT_CONNECTED;
  // Its images (slides, photos, spotlight, countdown) are queued for removal by the database
  const { error } = await supabase.from('home_sections').delete().eq('id', id);
  return error?.message ?? null;
}

export async function insertItem(item: ItemInput): Promise<string | null> {
  if (!supabase) return NOT_CONNECTED;
  const { error } = await supabase.from('home_section_items').insert(item);
  return error?.message ?? null;
}

export async function updateItem(id: string, patch: Partial<ItemInput>): Promise<string | null> {
  if (!supabase) return NOT_CONNECTED;
  const { error } = await supabase.from('home_section_items').update(patch).eq('id', id);
  return error?.message ?? null;
}

export async function deleteItem(id: string): Promise<string | null> {
  if (!supabase) return NOT_CONNECTED;
  const { error } = await supabase.from('home_section_items').delete().eq('id', id);
  return error?.message ?? null;
}

/** Saves a new order: position 1..n for the given ids. */
export async function savePositions(table: 'home_sections' | 'home_section_items', ids: string[]): Promise<string | null> {
  if (!supabase) return NOT_CONNECTED;
  const client = supabase;
  const results = await Promise.all(ids.map((id, i) => client.from(table).update({ position: i + 1 }).eq('id', id)));
  const failed = results.find((r) => r.error);
  return failed?.error?.message ?? null;
}

/** Removes every section and item, then writes the original Home layout back. */
export async function resetToDefault(): Promise<string | null> {
  if (!supabase) return NOT_CONNECTED;
  const del = await supabase.from('home_sections').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (del.error) return del.error.message;

  for (const section of DEFAULT_LAYOUT) {
    const { data, error } = await supabase.
    from('home_sections').
    insert({
      type: section.type,
      position: section.position,
      is_visible: section.is_visible,
      title: section.title,
      title_es: section.title_es,
      settings: section.settings as unknown as Json
    }).
    select('id').
    single();
    if (error || !data) return error?.message ?? 'Could not restore a section.';
    if (section.items.length) {
      const rows: ItemInput[] = section.items.map((item) => ({
        section_id: data.id,
        position: item.position,
        is_visible: item.is_visible,
        label: item.label,
        label_es: item.label_es,
        hint: item.hint,
        hint_es: item.hint_es,
        viewer_title: item.viewer_title,
        viewer_title_es: item.viewer_title_es,
        icon: item.icon,
        color: item.color,
        link_type: item.link_type,
        link_value: item.link_value,
        open_mode: item.open_mode
      }));
      const ins = await supabase.from('home_section_items').insert(rows);
      if (ins.error) return ins.error.message;
    }
  }
  return null;
}

export function formatEdited(name: string | null | undefined, at: string | null | undefined): string | null {
  if (!at) return null;
  const when = new Date(at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  return name ? `Last edited by ${name} · ${when}` : `Last edited ${when}`;
}
