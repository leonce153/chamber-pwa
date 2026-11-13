import { useCallback, useEffect, useState } from 'react';
import { Loader2, AlertCircle, Check, RotateCcw, Plus, LayoutGrid, Grid3x3, Megaphone, GalleryHorizontal, CalendarDays, Star, Timer, Share2, Images } from 'lucide-react';
import { DEFAULT_TITLES, EXTRA_TYPES, defaultSettingsFor } from '@/lib/home-extra';
import { AppLayout } from '@/components/layout/AppLayout';
import { SectionCard } from '@/components/home-admin/SectionCard';
import { ItemEditor } from '@/components/home-admin/ItemEditor';
import { HomePreview } from '@/components/home-admin/HomePreview';
import { StorageCard } from '@/components/home-admin/StorageCard';
import { SlideEditor } from '@/components/home-admin/SlideEditor';
import { deleteSlide, insertSlide, saveSlidePositions, updateSlide, type SlideInput } from '@/lib/banner-admin';
import {
  fetchAdminLayout, updateSection, addSection, deleteSection, insertItem, updateItem, deleteItem,
  savePositions, resetToDefault, formatEdited, type ItemInput } from
'@/lib/home-admin';
import { BANNER_DEFAULTS, bannerLabel, bannerShape, orderSections, SECTION_LABELS, type BannerSlide, type HomeItem, type HomeSection, type SectionType } from '@/lib/home-layout';

type EditorState = {kind: 'tiles' | 'icons';item: ItemInput & {id?: string;};} | null;
type SlideEditorState = {section: HomeSection;slide: SlideInput & {id?: string;};} | null;

const ADDABLE: {type: SectionType;label: string;desc: string;Icon: typeof LayoutGrid;}[] = [
{ type: 'tiles', label: 'Tile group', desc: 'Big colored tiles, 2 per row', Icon: LayoutGrid },
{ type: 'icons', label: 'Icon buttons', desc: 'Small round-corner icons, 3 or 4 per row', Icon: Grid3x3 },
{ type: 'text', label: 'Announcement', desc: 'Heading, text and an optional button', Icon: Megaphone },
{ type: 'banner', label: 'Sponsor banner', desc: 'Sponsor images, rotating or static', Icon: GalleryHorizontal },
{ type: 'events', label: 'Upcoming events', desc: 'Next events from a feed or typed in', Icon: CalendarDays },
{ type: 'spotlight', label: 'Member spotlight', desc: 'Feature a member business with photo and link', Icon: Star },
{ type: 'countdown', label: 'Countdown', desc: 'Days, hours and minutes to a big event', Icon: Timer },
{ type: 'social', label: 'Social links', desc: 'Round buttons for Facebook, Instagram and more', Icon: Share2 },
{ type: 'gallery', label: 'Photo gallery', desc: 'Photo grid with a full-screen viewer', Icon: Images }];

export default function HomeScreen() {
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState>(null);
  const [slideEditor, setSlideEditor] = useState<SlideEditorState>(null);
  const [dragSection, setDragSection] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [version, setVersion] = useState(0);

  const load = useCallback(async () => {
    const { data, error: err } = await fetchAdminLayout();
    if (err) setError(err);else
    setSections(data ?? []);
    setVersion((v) => v + 1);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** Runs a change, reports the result, and reloads. */
  const run = async (action: () => Promise<string | null>, success: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    const err = await action();
    if (err) setError(err);else
    {
      setNotice(success);
      setTimeout(() => setNotice(null), 3000);
    }
    await load();
    setBusy(false);
    return err;
  };

  const ordered = orderSections(sections);
  const middle = ordered.filter((s) => s.type !== 'hero' && s.type !== 'footer');

  const moveSection = (id: string, dir: -1 | 1) => {
    const ids = middle.map((s) => s.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    run(() => savePositions('home_sections', ids), 'Order saved');
  };

  const dropSection = (overId: string) => {
    if (!dragSection || dragSection === overId) return;
    const ids = middle.map((s) => s.id).filter((id) => id !== dragSection);
    ids.splice(ids.indexOf(overId), 0, dragSection);
    setDragSection(null);
    run(() => savePositions('home_sections', ids), 'Order saved');
  };

  const handleAdd = (type: SectionType) => {
    setShowAdd(false);
    const position = Math.max(0, ...middle.map((s) => s.position)) + 1;
    const extra = EXTRA_TYPES.includes(type);
    const settings = extra ? defaultSettingsFor(type) : type === 'tiles' ? { columns: 2 } : type === 'icons' ? { columns: 3 } : type === 'banner' ? { ...BANNER_DEFAULTS } : {};
    const title = type === 'text' ? 'Announcement' : type === 'tiles' ? 'More picks' : DEFAULT_TITLES[type]?.en ?? null;
    const title_es = DEFAULT_TITLES[type]?.es ?? null;
    run(() => addSection(type, position, { title, title_es, settings }), `${SECTION_LABELS[type]} added at the bottom. It stays off Home until it has content.`);
  };

  const handleDeleteSection = (s: HomeSection) => {
    const slides = s.slides?.length ?? 0;
    const photos = s.photos?.length ?? 0;
    const extra =
    s.type === 'banner' ? slides ? ` and its ${slides} slide${slides === 1 ? '' : 's'}` : '' :
    s.type === 'gallery' ? photos ? ` and its ${photos} photo${photos === 1 ? '' : 's'}` : '' :
    s.items.length ? ` and its ${s.items.length} buttons` : '';
    if (!window.confirm(`Delete this ${SECTION_LABELS[s.type]} section${extra}? This can't be undone.`)) return;
    run(() => deleteSection(s.id), 'Section deleted');
  };

  const openNewSlide = (s: HomeSection) => {
    setSlideEditor({
      section: s,
      slide: {
        section_id: s.id,
        position: (s.slides?.length ?? 0) + 1,
        is_visible: true,
        image_url: '',
        image_url_es: null,
        alt_text: '',
        alt_text_es: null,
        sponsor_name: null,
        link_type: null,
        link_value: null,
        open_mode: 'auto',
        start_at: null,
        end_at: null
      }
    });
  };

  const saveSlideEditor = async (input: SlideInput) => {
    const id = slideEditor?.slide.id;
    const err = await run(() => id ? updateSlide(id, input) : insertSlide(input), id ? 'Slide saved' : 'Slide added');
    if (!err) setSlideEditor(null);
    return err;
  };

  const handleDeleteSlide = (slide: BannerSlide) => {
    if (!window.confirm(`Delete the slide “${slide.sponsor_name || slide.alt_text}” and its image? This can't be undone.`)) return;
    run(() => deleteSlide(slide), 'Slide deleted');
  };

  const handleDeleteItem = (item: HomeItem) => {
    if (!window.confirm(`Delete “${item.label}”? This can't be undone.`)) return;
    run(() => deleteItem(item.id), 'Button deleted');
  };

  const openNewItem = (s: HomeSection) => {
    setEditor({
      kind: s.type === 'tiles' ? 'tiles' : 'icons',
      item: {
        section_id: s.id,
        position: s.items.length + 1,
        is_visible: true,
        label: '',
        label_es: null,
        hint: null,
        hint_es: null,
        viewer_title: null,
        viewer_title_es: null,
        icon: 'star',
        color: '#2C6E73',
        link_type: 'portal',
        link_value: '/news',
        open_mode: 'auto'
      }
    });
  };

  const saveEditor = async (input: ItemInput) => {
    const id = editor?.item.id;
    const err = await run(() => id ? updateItem(id, input) : insertItem(input), id ? 'Button saved' : 'Button added');
    if (!err) setEditor(null);
    return err;
  };

  const handleReset = () => {
    if (!window.confirm('Put the Home screen back to the original layout? All sections and buttons you added or changed will be replaced. This can’t be undone.')) return;
    run(resetToDefault, 'Home screen restored to the original layout');
  };

  const latestEdit = [...sections, ...sections.flatMap((s) => s.items)].
  filter((x) => x.updated_at).
  sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? ''))[0];

  if (loading) {
    return (
      <AppLayout>
        <div data-ev-id="ev_479637f09d" className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>);
  }

  const renderCard = (s: HomeSection) => {
    const movable = s.type !== 'hero' && s.type !== 'footer';
    const idx = middle.findIndex((m) => m.id === s.id);
    return (
      <SectionCard
        key={s.id}
        section={s}
        movable={movable}
        canMoveUp={movable && idx > 0}
        canMoveDown={movable && idx < middle.length - 1}
        busy={busy}
        onMove={(dir) => moveSection(s.id, dir)}
        onToggleVisible={() => run(() => updateSection(s.id, { is_visible: !s.is_visible }), s.is_visible ? 'Section hidden' : 'Section showing')}
        onDelete={() => handleDeleteSection(s)}
        onSave={(patch) => run(() => updateSection(s.id, patch), 'Section saved')}
        onAddItem={() => openNewItem(s)}
        onEditItem={(item) => setEditor({ kind: s.type === 'tiles' ? 'tiles' : 'icons', item })}
        onToggleItem={(item) => run(() => updateItem(item.id, { is_visible: !item.is_visible }), item.is_visible ? 'Button hidden' : 'Button showing')}
        onDeleteItem={handleDeleteItem}
        onReorderItems={(ids) => run(() => savePositions('home_section_items', ids), 'Order saved')}
        onAddSlide={() => openNewSlide(s)}
        onEditSlide={(slide) => setSlideEditor({ section: s, slide })}
        onToggleSlide={(slide) => run(() => updateSlide(slide.id, { is_visible: !slide.is_visible }), slide.is_visible ? 'Slide hidden' : 'Slide showing')}
        onDeleteSlide={handleDeleteSlide}
        onReorderSlides={(ids) => run(() => saveSlidePositions(ids), 'Order saved')}
        run={run}
        dragProps={movable ? {
          draggable: true,
          onDragStart: () => setDragSection(s.id),
          onDragOver: (e) => {if (dragSection) e.preventDefault();},
          onDrop: (e) => {e.preventDefault();dropSection(s.id);},
          onDragEnd: () => setDragSection(null)
        } : {}} />);
  };

  return (
    <AppLayout>
      <div data-ev-id="ev_3db5ceae07" className="p-4 sm:p-8 max-w-[1200px]">
        <div data-ev-id="ev_3f56e129b8" className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div data-ev-id="ev_8b84617e11">
            <h1 data-ev-id="ev_37f9d76120" className="text-[28px] font-display font-bold text-text tracking-tight">Home screen</h1>
            <p data-ev-id="ev_d307acf686" className="text-text-secondary mt-1 text-pretty">Choose what shows on the app’s Home screen and in what order. Changes go live when you save.</p>
            {latestEdit && <p data-ev-id="ev_b576297032" className="text-xs text-text-tertiary mt-1">{formatEdited(latestEdit.updated_by_name, latestEdit.updated_at)}</p>}
          </div>
          <button data-ev-id="ev_6885958bf7"
          onClick={handleReset}
          disabled={busy}
          className="min-h-[44px] px-4 rounded-[10px] border border-border text-text font-medium flex items-center gap-2 hover:bg-surface-elevated disabled:opacity-50">
            <RotateCcw className="w-4 h-4" />Reset Home to default
          </button>
        </div>

        {error &&
        <div data-ev-id="ev_d3d8cf17cc" className="bg-destructive/10 border border-destructive/20 rounded-[10px] p-4 mb-4 flex items-start gap-3" role="alert">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <p data-ev-id="ev_c678f78d67" className="text-sm text-destructive">{error}</p>
          </div>
        }
        {notice &&
        <div data-ev-id="ev_c2db301b2c" className="bg-success/10 border border-success/20 rounded-[10px] p-3 mb-4 flex items-center gap-2" role="status">
            <Check className="w-4 h-4 text-success" />
            <p data-ev-id="ev_495c7a24eb" className="text-sm text-success">{notice}</p>
          </div>
        }

        <div data-ev-id="ev_84f2901d1d" className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-8 items-start">
          <div data-ev-id="ev_2ec6ad1aed" className="flex flex-col gap-3 min-w-0">
            {ordered.length === 0 &&
            <div data-ev-id="ev_e14dd9911b" className="bg-card border border-border rounded-[16px] p-6 text-text-secondary">
                No sections found. Use “Reset Home to default” to restore the original layout.
              </div>
            }
            {ordered.map(renderCard)}

            <div data-ev-id="ev_7aebaab003" className="relative">
              <button data-ev-id="ev_a7e44a3439"
              onClick={() => setShowAdd(!showAdd)}
              disabled={busy}
              aria-expanded={showAdd}
              className="w-full min-h-[52px] rounded-[16px] border-2 border-dashed border-border text-text font-medium flex items-center justify-center gap-2 hover:bg-surface-elevated disabled:opacity-50">
                <Plus className="w-5 h-5" />Add section
              </button>
              {showAdd &&
              <div data-ev-id="ev_14f3ee3ffa" className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ADDABLE.map(({ type, label, desc, Icon }) =>
                <button data-ev-id="ev_f4faab98e3" key={type} onClick={() => handleAdd(type)} className="bg-card border border-border rounded-[14px] p-4 text-left flex flex-col gap-1.5 hover:bg-surface-elevated">
                      <Icon className="w-5 h-5 text-primary" />
                      <span data-ev-id="ev_b5ca743ffa" className="font-semibold text-text">{label}</span>
                      <span data-ev-id="ev_3bf24a1825" className="text-xs text-text-secondary">{desc}</span>
                    </button>
                )}
                </div>
              }
            </div>

            <StorageCard version={version} />
          </div>

          <div data-ev-id="ev_dc5a9ece4d" className="xl:sticky xl:top-6">
            <HomePreview sections={sections} />
          </div>
        </div>
      </div>

      {editor &&
      <ItemEditor
        key={editor.item.id ?? 'new'}
        kind={editor.kind}
        item={editor.item}
        onCancel={() => setEditor(null)}
        onSave={saveEditor} />
      }

      {slideEditor &&
      <SlideEditor
        key={slideEditor.slide.id ?? 'new-slide'}
        slide={slideEditor.slide}
        shape={bannerShape(slideEditor.section.settings)}
        label={{ en: bannerLabel(slideEditor.section.settings, 'en'), es: bannerLabel(slideEditor.section.settings, 'es') }}
        onCancel={() => setSlideEditor(null)}
        onSave={saveSlideEditor} />
      }
    </AppLayout>);
}