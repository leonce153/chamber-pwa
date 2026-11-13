import { useEffect, useState } from 'react';
import {
  ChevronDown, ChevronUp, ArrowUp, ArrowDown, Eye, EyeOff, Trash2, GripVertical, Pencil, Plus,
  Loader2, Save, X } from
'lucide-react';
import { BilingualInput, ColorPicker, Field, INPUT, LinkFields, Toggle } from '@/components/home-admin/fields';
import { getHomeIcon } from '@/components/pwa/home/homeIcons';
import {
  LIMITS, REPEATABLE_TYPES, SECTION_LABELS, isHexColor, linkError,
  type AskChip, type HomeItem, type HomeSection, type LinkType, type OpenMode, type SectionSettings } from
'@/lib/home-layout';
import { formatEdited } from '@/lib/home-admin';
import { BannerSlidesList } from '@/components/home-admin/BannerSlidesList';
import { BANNER_SHAPES, bannerInterval, bannerShape, liveSlides, type BannerSlide } from '@/lib/home-layout';
import { ExtraSectionFields } from '@/components/home-admin/ExtraSectionFields';
import { EXTRA_TYPES, afterHours, eventCount, extraSummary, validateExtra } from '@/lib/home-extra';

interface SectionCardProps {
  section: HomeSection;
  canMoveUp: boolean;
  canMoveDown: boolean;
  movable: boolean;
  busy: boolean;
  onMove: (dir: -1 | 1) => void;
  onToggleVisible: () => void;
  onDelete: () => void;
  onSave: (patch: {title: string | null;title_es: string | null;settings: SectionSettings;}) => Promise<string | null>;
  onAddItem: () => void;
  onEditItem: (item: HomeItem) => void;
  onToggleItem: (item: HomeItem) => void;
  onDeleteItem: (item: HomeItem) => void;
  onReorderItems: (ids: string[]) => void;
  onAddSlide?: () => void;
  onEditSlide?: (slide: BannerSlide) => void;
  onToggleSlide?: (slide: BannerSlide) => void;
  onDeleteSlide?: (slide: BannerSlide) => void;
  onReorderSlides?: (ids: string[]) => void;
  /** Runs a change that saves right away (gallery photos). */
  run?: (action: () => Promise<string | null>, success: string) => Promise<string | null>;
  dragProps: React.HTMLAttributes<HTMLDivElement> & {draggable?: boolean;};
}

const HAS_TITLE = ['tiles', 'icons', 'latest', 'text', 'events', 'social', 'gallery'];
const blank = (v: string) => v.trim() ? v.trim() : null;

function summary(s: HomeSection): string {
  switch (s.type) {
    case 'tiles':
    case 'icons':
      return `${s.items.filter((i) => i.is_visible).length} of ${s.items.length} showing`;
    case 'latest':
      return `Shows ${s.settings.count ?? 3} latest updates`;
    case 'ask_mule':
      return `${(s.settings.chips ?? []).length} suggestion chips`;
    case 'hero':
      return s.settings.show_weather === false ? 'Weather hidden' : 'With weather';
    case 'alerts':
      return 'Shows only to people who have not turned on alerts';
    case 'text':
      return s.title || s.settings.body?.slice(0, 40) || 'Empty announcement';
    case 'footer':
      return s.settings.text ?? '';
    case 'banner':{
        const total = s.slides?.length ?? 0;
        const live = liveSlides(s).length;
        const mode = s.settings.mode === 'static' ? 'Static' : `Rotates every ${bannerInterval(s.settings)}s`;
        return `${live} live of ${total} slide${total === 1 ? '' : 's'} · ${mode} · ${BANNER_SHAPES[bannerShape(s.settings)].label}`;
      }
    default:
      return extraSummary(s);
  }
}

export function SectionCard(props: SectionCardProps) {
  const { section: s, canMoveUp, canMoveDown, movable, busy } = props;
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(s.title ?? '');
  const [titleEs, setTitleEs] = useState(s.title_es ?? '');
  const [settings, setSettings] = useState<SectionSettings>(s.settings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState(0);
  const [dragItem, setDragItem] = useState<string | null>(null);

  // Reset the draft whenever the saved section changes
  useEffect(() => {
    setTitle(s.title ?? '');
    setTitleEs(s.title_es ?? '');
    setSettings(s.settings);
  }, [s.title, s.title_es, s.settings, s.updated_at]);

  const set = (patch: Partial<SectionSettings>) => setSettings((prev) => ({ ...prev, ...patch }));
  const dirty =
  (s.title ?? '') !== title || (s.title_es ?? '') !== titleEs || JSON.stringify(s.settings) !== JSON.stringify(settings);
  const hasSettings = s.type !== 'alerts' && s.type !== 'tiles' && s.type !== 'icons' || HAS_TITLE.includes(s.type) || s.type === 'icons';
  const repeatable = REPEATABLE_TYPES.includes(s.type);
  const edited = formatEdited(s.updated_by_name, s.updated_at);

  const save = async () => {
    if (s.type === 'text' && settings.button_label && settings.link_type) {
      const err = linkError(settings.link_type, settings.link_value ?? '');
      if (err) return setError(err);
    }
    if (s.type === 'text' && settings.bg_color && !isHexColor(settings.bg_color)) return setError('Use a hex color like #2C6E73.');
    if (s.type === 'banner' && settings.show_label !== false && !settings.label?.trim()) return setError('Add the label text, or turn the label off.');
    if (EXTRA_TYPES.includes(s.type)) {
      const err = validateExtra(s.type, settings);
      if (err) return setError(err);
    }
    setSaving(true);
    setError(null);
    const clean: SectionSettings = { ...settings };
    if (s.type === 'events') {
      clean.event_count = eventCount(clean);
      clean.feed_url = clean.feed_url?.trim();
      clean.events = (clean.events ?? []).map((e) => ({ ...e, title: e.title.trim(), title_es: blank(e.title_es ?? ''), place: blank(e.place ?? '') }));
    }
    if (s.type === 'spotlight') {
      clean.spotlights = (clean.spotlights ?? []).map((sp) => ({ ...sp, name: sp.name.trim(), alt: sp.alt.trim(), alt_es: blank(sp.alt_es ?? ''), text: blank(sp.text ?? ''), text_es: blank(sp.text_es ?? '') }));
    }
    if (s.type === 'countdown') {
      clean.after_hours = afterHours(clean);
      clean.name = clean.name?.trim();
    }
    if (s.type === 'social') clean.social = (clean.social ?? []).map((l) => ({ ...l, value: l.value.trim() }));
    if (s.type === 'banner') {
      clean.interval_seconds = bannerInterval(clean);
      clean.label = clean.label?.trim();
      clean.label_es = clean.label_es?.trim();
    }
    if (clean.chips) clean.chips = clean.chips.filter((c) => c.text.trim()).map((c) => ({ text: c.text.trim(), text_es: blank(c.text_es ?? '') }));
    const err = await props.onSave({ title: HAS_TITLE.includes(s.type) ? blank(title) : s.title, title_es: HAS_TITLE.includes(s.type) ? blank(titleEs) : s.title_es, settings: clean });
    setSaving(false);
    if (err) setError(err);else
    setSavedAt(Date.now());
  };

  const moveItem = (index: number, dir: -1 | 1) => {
    const ids = s.items.map((i) => i.id);
    const target = index + dir;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    props.onReorderItems(ids);
  };

  const dropItem = (overId: string) => {
    if (!dragItem || dragItem === overId) return;
    const ids = s.items.map((i) => i.id).filter((id) => id !== dragItem);
    ids.splice(ids.indexOf(overId), 0, dragItem);
    setDragItem(null);
    props.onReorderItems(ids);
  };

  const itemMax = s.type === 'tiles' ? LIMITS.tilesMax : LIMITS.iconsMax;
  const chips: AskChip[] = settings.chips ?? [];

  return (
    <div data-ev-id="ev_835c668099"
    {...props.dragProps}
    className={`bg-card border border-border rounded-[16px] overflow-hidden ${s.is_visible ? '' : 'opacity-70'}`}>
      {/* Header row */}
      <div data-ev-id="ev_140fffb749" className="flex items-center gap-2 p-3 sm:p-4">
        <span data-ev-id="ev_400128eec0" className={`w-6 flex justify-center text-text-tertiary ${movable ? 'cursor-grab' : 'opacity-0'}`} aria-hidden="true">
          <GripVertical className="w-5 h-5" />
        </span>
        <button data-ev-id="ev_d8c277dbd4" onClick={() => setOpen(!open)} className="flex-1 min-w-0 text-left flex flex-col" aria-expanded={open}>
          <span data-ev-id="ev_46841ca880" className="font-semibold text-text flex items-center gap-2">
            {SECTION_LABELS[s.type]}
            {!s.is_visible && <span data-ev-id="ev_21cc974e8d" className="text-xs font-medium px-2 py-0.5 rounded-md bg-surface-elevated text-text-secondary">Hidden</span>}
          </span>
          <span data-ev-id="ev_501a6596a5" className="text-sm text-text-secondary truncate">{summary(s)}</span>
        </button>
        <div data-ev-id="ev_63c9a3b345" className="flex items-center gap-1 shrink-0">
          {movable &&
          <>
              <IconBtn label="Move section up" disabled={!canMoveUp || busy} onClick={() => props.onMove(-1)}><ArrowUp className="w-4 h-4" /></IconBtn>
              <IconBtn label="Move section down" disabled={!canMoveDown || busy} onClick={() => props.onMove(1)}><ArrowDown className="w-4 h-4" /></IconBtn>
            </>
          }
          <IconBtn label={s.is_visible ? 'Hide section' : 'Show section'} disabled={busy} onClick={props.onToggleVisible}>
            {s.is_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </IconBtn>
          {repeatable &&
          <IconBtn label="Delete section" disabled={busy} onClick={props.onDelete} danger><Trash2 className="w-4 h-4" /></IconBtn>
          }
          <IconBtn label={open ? 'Collapse' : 'Expand'} onClick={() => setOpen(!open)}>
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </IconBtn>
        </div>
      </div>

      {open &&
      <div data-ev-id="ev_a4d48996d3" className="border-t border-border p-4 sm:p-5 flex flex-col gap-5">
          {HAS_TITLE.includes(s.type) &&
        <BilingualInput label={s.type === 'icons' ? 'Heading (optional)' : 'Heading'} en={title} es={titleEs} onEn={setTitle} onEs={setTitleEs} max={60} />
        }

          {s.type === 'hero' &&
        <Row label="Show weather in the sky header" desc="Weather also needs to be on in Settings.">
              <Toggle checked={settings.show_weather !== false} onChange={(v) => set({ show_weather: v })} label="Show weather" />
            </Row>
        }

          {s.type === 'alerts' &&
        <p data-ev-id="ev_9c7adffaef" className="text-sm text-text-secondary text-pretty">
              The “Get Chamber alerts” card shows only to people who haven’t turned on alerts yet, and hides for 14 days after “Not now”. Its text is part of the app. You can move or hide it.
            </p>
        }

          {s.type === 'ask_mule' &&
        <>
              <BilingualInput
            label="Search bar text"
            en={settings.placeholder ?? ''}
            es={settings.placeholder_es ?? ''}
            onEn={(v) => set({ placeholder: v })}
            onEs={(v) => set({ placeholder_es: v })}
            max={60} />
              <div data-ev-id="ev_ca73656f00" className="flex flex-col gap-3">
                <span data-ev-id="ev_29a669e9b1" className="text-sm font-medium text-text">Suggestion chips ({chips.length}/{LIMITS.chipsMax})</span>
                {chips.map((chip, i) =>
            <div data-ev-id="ev_5c70c9e10c" key={i} className="flex items-start gap-2">
                    <div data-ev-id="ev_5ac531d792" className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input data-ev-id="ev_f4def789ef" value={chip.text} maxLength={40} placeholder="English" aria-label={`Chip ${i + 1} English`} className={INPUT}
                onChange={(e) => set({ chips: chips.map((c, j) => j === i ? { ...c, text: e.target.value } : c) })} />
                      <input data-ev-id="ev_7cc4cb99e7" value={chip.text_es ?? ''} maxLength={40} placeholder="Español (optional)" aria-label={`Chip ${i + 1} Spanish`} className={INPUT}
                onChange={(e) => set({ chips: chips.map((c, j) => j === i ? { ...c, text_es: e.target.value } : c) })} />
                    </div>
                    <IconBtn label="Move chip up" disabled={i === 0} onClick={() => {
                const next = [...chips];[next[i - 1], next[i]] = [next[i], next[i - 1]];set({ chips: next });
              }}><ArrowUp className="w-4 h-4" /></IconBtn>
                    <IconBtn label="Remove chip" danger onClick={() => set({ chips: chips.filter((_, j) => j !== i) })}><X className="w-4 h-4" /></IconBtn>
                  </div>
            )}
                {chips.length < LIMITS.chipsMax &&
            <button data-ev-id="ev_90b3b36ac6" onClick={() => set({ chips: [...chips, { text: '', text_es: '' }] })} className="self-start min-h-[44px] px-3 rounded-[10px] border border-dashed border-border text-sm font-medium text-text flex items-center gap-2 hover:bg-surface-elevated">
                    <Plus className="w-4 h-4" />Add chip
                  </button>
            }
              </div>
            </>
        }

          {s.type === 'icons' &&
        <Field label="Buttons per row">
              <select data-ev-id="ev_f64a762cc7" value={settings.columns === 4 ? 4 : 3} onChange={(e) => set({ columns: Number(e.target.value) })} className={`${INPUT} max-w-[160px]`}>
                <option data-ev-id="ev_8f6e0ab6ba" value={3}>3</option>
                <option data-ev-id="ev_1b45ad316f" value={4}>4</option>
              </select>
            </Field>
        }

          {s.type === 'latest' &&
        <>
              <Field label="How many updates to show">
                <select data-ev-id="ev_ae96ab3f23" value={settings.count ?? 3} onChange={(e) => set({ count: Number(e.target.value) })} className={`${INPUT} max-w-[160px]`}>
                  {Array.from({ length: LIMITS.latestMax - LIMITS.latestMin + 1 }, (_, i) => LIMITS.latestMin + i).map((n) =>
              <option data-ev-id="ev_e3e6d83365" key={n} value={n}>{n}</option>
              )}
                </select>
              </Field>
              <BilingualInput label="When there are no updates: title" en={settings.empty_title ?? ''} es={settings.empty_title_es ?? ''}
          onEn={(v) => set({ empty_title: v })} onEs={(v) => set({ empty_title_es: v })} max={60} />
              <BilingualInput label="When there are no updates: text" en={settings.empty_text ?? ''} es={settings.empty_text_es ?? ''}
          onEn={(v) => set({ empty_text: v })} onEs={(v) => set({ empty_text_es: v })} max={120} multiline />
            </>
        }

          {s.type === 'text' &&
        <>
              <BilingualInput label="Text" en={settings.body ?? ''} es={settings.body_es ?? ''}
          onEn={(v) => set({ body: v })} onEs={(v) => set({ body_es: v })} max={LIMITS.bodyMax} multiline />
              <BilingualInput label="Button label (optional)" en={settings.button_label ?? ''} es={settings.button_label_es ?? ''}
          onEn={(v) => set({ button_label: v })} onEs={(v) => set({ button_label_es: v })} max={LIMITS.labelMax} />
              {!!settings.button_label?.trim() &&
          <LinkFields
            linkType={settings.link_type ?? 'portal'}
            linkValue={settings.link_value ?? '/news'}
            openMode={settings.open_mode ?? 'auto'}
            onChange={(l: {link_type: LinkType;link_value: string;open_mode: OpenMode;}) => set(l)} />
          }
              <Row label="Colored background" desc="Off uses the regular card look.">
                <Toggle checked={!!settings.bg_color} onChange={(v) => set({ bg_color: v ? '#2C6E73' : undefined })} label="Colored background" />
              </Row>
              {settings.bg_color !== undefined && <ColorPicker value={settings.bg_color} onChange={(v) => set({ bg_color: v })} />}
            </>
        }

          {s.type === 'banner' &&
        <>
              <div data-ev-id="ev_1ce1debbeb" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Display">
                  <select data-ev-id="ev_40032e56c7" value={settings.mode === 'static' ? 'static' : 'rotate'} onChange={(e) => set({ mode: e.target.value as 'static' | 'rotate' })} className={INPUT}>
                    <option data-ev-id="ev_1c3311a134" value="rotate">Rotate through slides</option>
                    <option data-ev-id="ev_6c98a15009" value="static">Static (first live slide only)</option>
                  </select>
                </Field>
                {settings.mode !== 'static' &&
            <Field label="Seconds per slide" hint={`${LIMITS.intervalMin} to ${LIMITS.intervalMax} seconds`}>
                    <input data-ev-id="ev_77edaf7e22"
              type="number"
              min={LIMITS.intervalMin}
              max={LIMITS.intervalMax}
              value={settings.interval_seconds ?? 6}
              onChange={(e) => set({ interval_seconds: Number(e.target.value) })}
              onBlur={() => set({ interval_seconds: bannerInterval(settings) })}
              className={`${INPUT} max-w-[160px]`} />
                  </Field>
            }
              </div>
              <Field label="Shape" hint={`Use images sized ${BANNER_SHAPES[bannerShape(settings)].w} × ${BANNER_SHAPES[bannerShape(settings)].h} px.`}>
                <select data-ev-id="ev_22d57b0e2a" value={bannerShape(settings)} onChange={(e) => set({ shape: e.target.value as 'wide' | 'medium' | 'square' })} className={`${INPUT} max-w-[220px]`}>
                  {(Object.keys(BANNER_SHAPES) as (keyof typeof BANNER_SHAPES)[]).map((k) =>
              <option data-ev-id="ev_09086d14bc" key={k} value={k}>{BANNER_SHAPES[k].label}</option>
              )}
                </select>
              </Field>
              <Row label="Show label on the banner" desc="A small tag in the top-left corner.">
                <Toggle checked={settings.show_label !== false} onChange={(v) => set({ show_label: v })} label="Show label" />
              </Row>
              {settings.show_label !== false &&
          <BilingualInput label="Label" en={settings.label ?? ''} es={settings.label_es ?? ''}
          onEn={(v) => set({ label: v })} onEs={(v) => set({ label_es: v })} max={LIMITS.bannerLabelMax} />
          }
              <BannerSlidesList
            slides={s.slides ?? []}
            busy={busy}
            onAdd={() => props.onAddSlide?.()}
            onEdit={(slide) => props.onEditSlide?.(slide)}
            onToggle={(slide) => props.onToggleSlide?.(slide)}
            onDelete={(slide) => props.onDeleteSlide?.(slide)}
            onReorder={(ids) => props.onReorderSlides?.(ids)} />
              <p data-ev-id="ev_ab6bd90e5d" className="text-xs text-text-tertiary">Slide changes save right away. Use “Save section” for the display settings above.</p>
            </>
        }

          {EXTRA_TYPES.includes(s.type) &&
        <ExtraSectionFields section={s} settings={settings} set={set} busy={busy} run={props.run} />
        }

          {s.type === 'footer' &&
        <BilingualInput label="Footer text" en={settings.text ?? ''} es={settings.text_es ?? ''}
        onEn={(v) => set({ text: v })} onEs={(v) => set({ text_es: v })} max={120} />
        }

          {(s.type === 'tiles' || s.type === 'icons') &&
        <div data-ev-id="ev_46a7544726" className="flex flex-col gap-2">
              <span data-ev-id="ev_1529c9a18a" className="text-sm font-medium text-text">{s.type === 'tiles' ? 'Tiles' : 'Buttons'} ({s.items.length}/{itemMax})</span>
              {s.items.length === 0 && <p data-ev-id="ev_0d8c215300" className="text-sm text-text-tertiary">Nothing here yet. This section stays hidden until it has a button.</p>}
              {s.items.map((item, i) => {
            const Icon = getHomeIcon(item.icon);
            return (
              <div data-ev-id="ev_cefca5c5f5"
              key={item.id}
              draggable
              onDragStart={(e) => {e.stopPropagation();setDragItem(item.id);}}
              onDragOver={(e) => {if (dragItem) {e.preventDefault();e.stopPropagation();}}}
              onDrop={(e) => {e.preventDefault();e.stopPropagation();dropItem(item.id);}}
              onDragEnd={() => setDragItem(null)}
              className={`flex items-center gap-2 p-2 rounded-[12px] border border-border ${dragItem === item.id ? 'opacity-50' : ''} ${item.is_visible ? '' : 'opacity-60'}`}>
                    <GripVertical className="w-4 h-4 text-text-tertiary cursor-grab shrink-0" aria-hidden="true" />
                    <span data-ev-id="ev_6b21b1bc85" className="w-9 h-9 rounded-[10px] flex items-center justify-center text-white shrink-0" style={{ backgroundColor: item.color }}>
                      <Icon className="w-5 h-5" />
                    </span>
                    <span data-ev-id="ev_7020c74de6" className="flex-1 min-w-0 flex flex-col">
                      <span data-ev-id="ev_b04ed8f7ef" className="text-sm font-semibold text-text truncate">{item.label}{!item.is_visible && ' (hidden)'}</span>
                      <span data-ev-id="ev_5c206298bd" className="text-xs text-text-tertiary truncate">
                        {item.link_type === 'tab' ? `App tab: ${item.link_value}` : item.link_value}
                        {item.updated_by_name ? ` · ${item.updated_by_name}` : ''}
                      </span>
                    </span>
                    <IconBtn label="Move up" disabled={i === 0 || busy} onClick={() => moveItem(i, -1)}><ArrowUp className="w-4 h-4" /></IconBtn>
                    <IconBtn label="Move down" disabled={i === s.items.length - 1 || busy} onClick={() => moveItem(i, 1)}><ArrowDown className="w-4 h-4" /></IconBtn>
                    <IconBtn label={item.is_visible ? 'Hide' : 'Show'} disabled={busy} onClick={() => props.onToggleItem(item)}>
                      {item.is_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </IconBtn>
                    <IconBtn label="Edit" onClick={() => props.onEditItem(item)}><Pencil className="w-4 h-4" /></IconBtn>
                    <IconBtn label="Delete" danger disabled={busy} onClick={() => props.onDeleteItem(item)}><Trash2 className="w-4 h-4" /></IconBtn>
                  </div>);
          })}
              {s.items.length < itemMax &&
          <button data-ev-id="ev_838678af25" onClick={props.onAddItem} className="self-start min-h-[44px] px-3 rounded-[10px] border border-dashed border-border text-sm font-medium text-text flex items-center gap-2 hover:bg-surface-elevated">
                  <Plus className="w-4 h-4" />Add {s.type === 'tiles' ? 'tile' : 'button'}
                </button>
          }
            </div>
        }

          {hasSettings && s.type !== 'alerts' &&
        <div data-ev-id="ev_b7494db4ae" className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border">
              <span data-ev-id="ev_5db4309dad" className="text-xs text-text-tertiary">{edited ?? 'Original layout'}</span>
              <div data-ev-id="ev_c34b2a1f89" className="flex items-center gap-3">
                {error && <span data-ev-id="ev_28bacaedc0" className="text-sm text-destructive">{error}</span>}
                {!error && savedAt > 0 && !dirty && <span data-ev-id="ev_31397ebb1a" className="text-sm text-success">Saved</span>}
                <button data-ev-id="ev_4c378e44be" onClick={save} disabled={!dirty || saving} className="min-h-[44px] px-4 rounded-[10px] bg-primary hover:bg-primary-hover text-white font-medium flex items-center gap-2 disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Save section
                </button>
              </div>
            </div>
        }
        </div>
      }
    </div>);
}

function Row({ label, desc, children }: {label: string;desc?: string;children: React.ReactNode;}) {
  return (
    <div data-ev-id="ev_ba36a6bd63" className="flex items-center justify-between gap-4">
      <div data-ev-id="ev_86630a57a5">
        <p data-ev-id="ev_b5979d689e" className="text-sm font-medium text-text">{label}</p>
        {desc && <p data-ev-id="ev_388ededfc3" className="text-xs text-text-tertiary">{desc}</p>}
      </div>
      {children}
    </div>);
}

function IconBtn({ label, onClick, disabled, danger, children }: {label: string;onClick: () => void;disabled?: boolean;danger?: boolean;children: React.ReactNode;}) {
  return (
    <button data-ev-id="ev_7fdb57532a"
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    title={label}
    className={`w-10 h-10 rounded-[10px] flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-default ${danger ? 'text-destructive hover:bg-destructive/10' : 'text-text-secondary hover:bg-surface-elevated'}`}>
      {children}
    </button>);
}