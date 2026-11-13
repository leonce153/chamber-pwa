import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_LAYOUT, buildLayout, readLayoutCache, writeLayoutCache, type HomeSection } from '@/lib/home-layout';

/**
 * Public Home layout: cached copy first (instant), then refreshed in the background.
 * Nothing cached and no database: the built-in default layout. Never blank.
 */
export function useHomeLayout(): HomeSection[] {
  const [sections, setSections] = useState<HomeSection[]>(() => readLayoutCache() ?? DEFAULT_LAYOUT);

  const load = useCallback(async () => {
    if (!supabase) return;
    try {
      const [s, i, sl, ph] = await Promise.all([
      supabase.
      from('home_sections').
      select('id, type, position, is_visible, title, title_es, settings').
      eq('is_visible', true).
      order('position'),
      supabase.
      from('home_section_items').
      select('id, section_id, position, is_visible, label, label_es, hint, hint_es, viewer_title, viewer_title_es, icon, color, link_type, link_value, open_mode').
      eq('is_visible', true).
      order('position'),
      supabase.
      from('home_banner_slides').
      select('id, section_id, position, is_visible, image_url, image_url_es, alt_text, alt_text_es, link_type, link_value, open_mode, start_at, end_at').
      eq('is_visible', true).
      order('position'),
      supabase.
      from('home_gallery_photos').
      select('id, section_id, position, is_visible, image_url, alt_text, alt_text_es, caption, caption_es').
      eq('is_visible', true).
      order('position')]);

      if (s.error || i.error || !s.data) return;
      // Slides failed but banners exist: keep the cached copy rather than dropping the banners
      if (sl.error && s.data.some((x) => x.type === 'banner')) return;
      // Same for gallery photos
      if (ph.error && s.data.some((x) => x.type === 'gallery')) return;
      const layout = buildLayout(s.data, i.data ?? [], true, sl.error ? [] : sl.data ?? [], ph.error ? [] : ph.data ?? []);
      if (!layout.length) return;
      setSections(layout);
      writeLayoutCache(layout);
    } catch {
      // offline: keep the cached / default layout
    }
  }, []);

  useEffect(() => {
    load();
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [load]);

  return sections;
}
