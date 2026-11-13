import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { BilingualInput, ColorPicker, Field, INPUT, LinkFields, Toggle } from '@/components/home-admin/fields';
import { ExtraImagePicker } from '@/components/home-admin/ExtraImagePicker';
import { OptionalLink } from '@/components/home-admin/OptionalLink';
import { GalleryPhotosList } from '@/components/home-admin/GalleryPhotosList';
import { centralInputToIso, isoToCentralInput } from '@/lib/central-time';
import { SOCIAL_PLATFORMS, normalizeSocial, socialError, spotlightStatus } from '@/lib/home-extra';
import { LIMITS, type HomeSection, type ManualEvent, type SectionSettings, type Spotlight } from '@/lib/home-layout';

type Set = (patch: Partial<SectionSettings>) => void;
type Run = (action: () => Promise<string | null>, success: string) => Promise<string | null>;

const ADD_BTN = 'self-start min-h-[44px] px-3 rounded-[10px] border border-dashed border-border text-sm font-medium text-text flex items-center gap-2 hover:bg-surface-elevated';

function SmallBtn({ label, onClick, disabled, danger, children }: {label: string;onClick: () => void;disabled?: boolean;danger?: boolean;children: React.ReactNode;}) {
  return (
    <button data-ev-id="ev_84a8f3310b" type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label}
    className={`w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 disabled:opacity-30 ${danger ? 'text-destructive hover:bg-destructive/10' : 'text-text-secondary hover:bg-surface-elevated'}`}>
      {children}
    </button>);
}

function ToggleRow({ label, desc, checked, onChange }: {label: string;desc?: string;checked: boolean;onChange: (v: boolean) => void;}) {
  return (
    <div data-ev-id="ev_3d0d5c9828" className="flex items-center justify-between gap-4">
      <div data-ev-id="ev_3de5f587d9">
        <p data-ev-id="ev_fc3c9a66de" className="text-sm font-medium text-text">{label}</p>
        {desc && <p data-ev-id="ev_29dc8e789c" className="text-xs text-text-tertiary">{desc}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} label={label} />
    </div>);
}

function swap<T>(list: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

const newId = () => crypto.randomUUID();

// ===== Upcoming events =====

function EventsFields({ settings, set }: {settings: SectionSettings;set: Set;}) {
  const events = settings.events ?? [];
  const [open, setOpen] = useState<string | null>(null);
  const update = (id: string, patch: Partial<ManualEvent>) => set({ events: events.map((e) => e.id === id ? { ...e, ...patch } : e) });

  return (
    <>
      <div data-ev-id="ev_abc8037842" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Where do the events come from?">
          <select data-ev-id="ev_9f4a979815" value={settings.source === 'feed' ? 'feed' : 'manual'} onChange={(e) => set({ source: e.target.value as 'manual' | 'feed' })} className={INPUT}>
            <option data-ev-id="ev_ff8b4eaf7b" value="manual">I’ll type them in</option>
            <option data-ev-id="ev_7656c04969" value="feed">A website feed (RSS, iCal or JSON)</option>
          </select>
        </Field>
        <Field label="How many to show">
          <select data-ev-id="ev_e1e247d51e" value={settings.event_count ?? 5} onChange={(e) => set({ event_count: Number(e.target.value) })} className={`${INPUT} max-w-[160px]`}>
            {Array.from({ length: LIMITS.eventsMax - LIMITS.eventsMin + 1 }, (_, i) => LIMITS.eventsMin + i).map((n) => <option data-ev-id="ev_6c109cdd79" key={n} value={n}>{n}</option>)}
          </select>
        </Field>
      </div>

      {settings.source === 'feed' ?
      <Field label="Feed address" hint="The app checks it every 30 minutes. Past events are left out automatically.">
          <input data-ev-id="ev_c48f1324fd" value={settings.feed_url ?? ''} onChange={(e) => set({ feed_url: e.target.value })} placeholder="https://…" maxLength={500} className={INPUT} inputMode="url" />
        </Field> :

      <div data-ev-id="ev_b07d8d1f8c" className="flex flex-col gap-2">
          <span data-ev-id="ev_3b7b4cee90" className="text-sm font-medium text-text">Events ({events.length}/{LIMITS.manualEventsMax})</span>
          {events.length === 0 && <p data-ev-id="ev_03bfae0ff9" className="text-sm text-text-tertiary">No events yet. This section stays off the Home screen until an upcoming event is added.</p>}
          {events.map((ev, i) =>
        <div data-ev-id="ev_d7bdec3d8e" key={ev.id} className="flex flex-col gap-3 p-2 rounded-[12px] border border-border">
              <div data-ev-id="ev_f362b07ac7" className="flex items-center gap-1">
                <button data-ev-id="ev_d0edace9da" type="button" onClick={() => setOpen(open === ev.id ? null : ev.id)} className="flex-1 min-w-0 min-h-[44px] px-2 text-left flex flex-col" aria-expanded={open === ev.id}>
                  <span data-ev-id="ev_2f774ecd0e" className="text-sm font-semibold text-text truncate">{ev.title || 'New event'}</span>
                  <span data-ev-id="ev_e05f52ea5b" className="text-xs text-text-tertiary">{ev.date || 'No date'}{ev.time ? ` · ${ev.time}` : ' · All day'}</span>
                </button>
                <SmallBtn label="Move up" disabled={i === 0} onClick={() => set({ events: swap(events, i, -1) })}><ArrowUp className="w-4 h-4" /></SmallBtn>
                <SmallBtn label="Move down" disabled={i === events.length - 1} onClick={() => set({ events: swap(events, i, 1) })}><ArrowDown className="w-4 h-4" /></SmallBtn>
                <SmallBtn label="Remove event" danger onClick={() => set({ events: events.filter((e) => e.id !== ev.id) })}><Trash2 className="w-4 h-4" /></SmallBtn>
                <SmallBtn label={open === ev.id ? 'Collapse' : 'Edit'} onClick={() => setOpen(open === ev.id ? null : ev.id)}>
                  {open === ev.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </SmallBtn>
              </div>
              {open === ev.id &&
          <div data-ev-id="ev_71afdfc573" className="flex flex-col gap-3 px-2 pb-2">
                  <BilingualInput label="Title" en={ev.title} es={ev.title_es ?? ''} onEn={(v) => update(ev.id, { title: v })} onEs={(v) => update(ev.id, { title_es: v })} max={80} />
                  <div data-ev-id="ev_8ec66ca859" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Field label="Date"><input data-ev-id="ev_ef10b8a86d" type="date" value={ev.date} onChange={(e) => update(ev.id, { date: e.target.value })} className={INPUT} /></Field>
                    <Field label="Time (optional)" hint="Central time. Empty = all day."><input data-ev-id="ev_b2d2cf63dc" type="time" value={ev.time ?? ''} onChange={(e) => update(ev.id, { time: e.target.value || null })} className={INPUT} /></Field>
                    <Field label="Place (optional)"><input data-ev-id="ev_9887570741" value={ev.place ?? ''} maxLength={80} onChange={(e) => update(ev.id, { place: e.target.value })} className={INPUT} /></Field>
                  </div>
                  <OptionalLink linkType={ev.link_type} linkValue={ev.link_value} openMode={ev.open_mode} onChange={(l) => update(ev.id, l)} />
                </div>
          }
            </div>
        )}
          {events.length < LIMITS.manualEventsMax &&
        <button data-ev-id="ev_a510b62778" type="button" className={ADD_BTN} onClick={() => {
          const id = newId();
          set({ events: [...events, { id, title: '', title_es: '', date: '', time: null, place: '', link_type: null, link_value: null, open_mode: 'auto' }] });
          setOpen(id);
        }}><Plus className="w-4 h-4" />Add event</button>
        }
        </div>
      }
      <p data-ev-id="ev_a3c7d2f6a0" className="text-xs text-text-tertiary">“See all” opens the Events tab.</p>
    </>);
}

// ===== Member spotlight =====

const SPOT_STATUS: Record<string, {label: string;cls: string;}> = {
  live: { label: 'Live', cls: 'bg-success/15 text-success' },
  scheduled: { label: 'Scheduled', cls: 'bg-primary/15 text-primary' },
  ended: { label: 'Ended', cls: 'bg-surface-elevated text-text-secondary' },
  hidden: { label: 'Hidden', cls: 'bg-surface-elevated text-text-secondary' },
  incomplete: { label: 'Needs photo, name or description', cls: 'bg-warning/15 text-warning' }
};

function SpotlightFields({ settings, set }: {settings: SectionSettings;set: Set;}) {
  const list = settings.spotlights ?? [];
  const [open, setOpen] = useState<string | null>(null);
  const update = (id: string, patch: Partial<Spotlight>) => set({ spotlights: list.map((s) => s.id === id ? { ...s, ...patch } : s) });

  return (
    <>
      <Field label="When there is more than one live spotlight">
        <select data-ev-id="ev_f0fdecdfbc" value={settings.spotlight_mode === 'first' ? 'first' : 'rotate'} onChange={(e) => set({ spotlight_mode: e.target.value as 'rotate' | 'first' })} className={INPUT}>
          <option data-ev-id="ev_874829767b" value="rotate">Show a different one each visit</option>
          <option data-ev-id="ev_4d1dc7a885" value="first">Always show the first live one</option>
        </select>
      </Field>
      <div data-ev-id="ev_baa4a94a23" className="flex flex-col gap-2">
        <span data-ev-id="ev_f607aa017b" className="text-sm font-medium text-text">Spotlights ({list.length}/{LIMITS.spotlightsMax})</span>
        {list.length === 0 && <p data-ev-id="ev_c0f6c66316" className="text-sm text-text-tertiary">No spotlights yet. This section stays off the Home screen until one is live.</p>}
        {list.map((sp, i) => {
          const st = SPOT_STATUS[spotlightStatus(sp)];
          return (
            <div data-ev-id="ev_faff994047" key={sp.id} className="flex flex-col gap-3 p-2 rounded-[12px] border border-border">
              <div data-ev-id="ev_7d03153769" className="flex items-center gap-1">
                {sp.image_url ? <img data-ev-id="ev_d7815f1945" src={sp.image_url} alt="" className="w-16 h-9 rounded-[8px] object-cover bg-input shrink-0" /> : <span data-ev-id="ev_5435fdc29b" className="w-16 h-9 rounded-[8px] bg-input shrink-0" />}
                <button data-ev-id="ev_8571242eda" type="button" onClick={() => setOpen(open === sp.id ? null : sp.id)} className="flex-1 min-w-0 min-h-[44px] px-2 text-left flex flex-col" aria-expanded={open === sp.id}>
                  <span data-ev-id="ev_4bd4dc4bda" className="text-sm font-semibold text-text truncate">{sp.name || 'New spotlight'}</span>
                  <span data-ev-id="ev_347d27851c" className={`self-start text-[11px] font-semibold px-1.5 py-0.5 rounded-md ${st.cls}`}>{st.label}</span>
                </button>
                <SmallBtn label="Move up" disabled={i === 0} onClick={() => set({ spotlights: swap(list, i, -1) })}><ArrowUp className="w-4 h-4" /></SmallBtn>
                <SmallBtn label="Move down" disabled={i === list.length - 1} onClick={() => set({ spotlights: swap(list, i, 1) })}><ArrowDown className="w-4 h-4" /></SmallBtn>
                <SmallBtn label="Remove spotlight" danger onClick={() => set({ spotlights: list.filter((s) => s.id !== sp.id) })}><Trash2 className="w-4 h-4" /></SmallBtn>
                <SmallBtn label={open === sp.id ? 'Collapse' : 'Edit'} onClick={() => setOpen(open === sp.id ? null : sp.id)}>
                  {open === sp.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </SmallBtn>
              </div>
              {open === sp.id &&
              <div data-ev-id="ev_f1e7f79f86" className="flex flex-col gap-3 px-2 pb-2">
                  <ToggleRow label="Show this spotlight" checked={sp.visible} onChange={(v) => update(sp.id, { visible: v })} />
                  <ExtraImagePicker label="Photo" value={sp.image_url} onChange={(url) => update(sp.id, { image_url: url })} hint="Shown 16:9, e.g. 1200 × 675 px. JPG, PNG or WebP, up to 2 MB." />
                  <BilingualInput label="Photo description (for screen readers)" en={sp.alt} es={sp.alt_es ?? ''} onEn={(v) => update(sp.id, { alt: v })} onEs={(v) => update(sp.id, { alt_es: v })} max={LIMITS.altMax} />
                  <Field label="Business name"><input data-ev-id="ev_99fedc00f6" value={sp.name} maxLength={60} onChange={(e) => update(sp.id, { name: e.target.value })} className={INPUT} /></Field>
                  <BilingualInput label="Short text (optional)" en={sp.text ?? ''} es={sp.text_es ?? ''} onEn={(v) => update(sp.id, { text: v })} onEs={(v) => update(sp.id, { text_es: v })} max={160} multiline />
                  <OptionalLink label="“Visit their page” button goes to" linkType={sp.link_type} linkValue={sp.link_value} openMode={sp.open_mode} onChange={(l) => update(sp.id, l)} />
                  <div data-ev-id="ev_543bb46363" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Show from (optional)" hint="Central time">
                      <input data-ev-id="ev_4c411ecb7f" type="datetime-local" value={isoToCentralInput(sp.start_at)} onChange={(e) => update(sp.id, { start_at: e.target.value ? centralInputToIso(e.target.value) : null })} className={INPUT} />
                    </Field>
                    <Field label="Show until (optional)" hint="Central time">
                      <input data-ev-id="ev_8bed96b102" type="datetime-local" value={isoToCentralInput(sp.end_at)} onChange={(e) => update(sp.id, { end_at: e.target.value ? centralInputToIso(e.target.value) : null })} className={INPUT} />
                    </Field>
                  </div>
                </div>
              }
            </div>);
        })}
        {list.length < LIMITS.spotlightsMax &&
        <button data-ev-id="ev_4700e3ef89" type="button" className={ADD_BTN} onClick={() => {
          const id = newId();
          set({ spotlights: [...list, { id, visible: true, image_url: '', alt: '', alt_es: '', name: '', text: '', text_es: '', link_type: null, link_value: null, open_mode: 'auto', start_at: null, end_at: null }] });
          setOpen(id);
        }}><Plus className="w-4 h-4" />Add spotlight</button>
        }
      </div>
    </>);
}

// ===== Countdown =====

function CountdownFields({ settings, set }: {settings: SectionSettings;set: Set;}) {
  return (
    <>
      <BilingualInput label="Event name" en={settings.name ?? ''} es={settings.name_es ?? ''} onEn={(v) => set({ name: v })} onEs={(v) => set({ name_es: v })} max={60} />
      <Field label="Starts at" hint="Central time">
        <input data-ev-id="ev_7eb32c0704" type="datetime-local" value={isoToCentralInput(settings.target_at)} onChange={(e) => set({ target_at: e.target.value ? centralInputToIso(e.target.value) ?? undefined : undefined })} className={`${INPUT} max-w-[260px]`} />
      </Field>
      <ExtraImagePicker label="Small image (optional)" value={settings.image_url ?? ''} onChange={(url) => set({ image_url: url || undefined })} />
      {!!settings.image_url &&
      <BilingualInput label="Image description (for screen readers)" en={settings.image_alt ?? ''} es={settings.image_alt_es ?? ''} onEn={(v) => set({ image_alt: v })} onEs={(v) => set({ image_alt_es: v })} max={LIMITS.altMax} />
      }
      <Field label="Card color" hint="Text switches to dark automatically on light colors.">
        <ColorPicker value={settings.color ?? '#2C6E73'} onChange={(v) => set({ color: v })} />
      </Field>
      <BilingualInput label="Text once it starts" en={settings.after_text ?? ''} es={settings.after_text_es ?? ''} onEn={(v) => set({ after_text: v })} onEs={(v) => set({ after_text_es: v })} max={60} />
      <Field label="Keep showing that text for (hours)" hint="1 to 72. Then the card hides by itself.">
        <input data-ev-id="ev_143e165b1c" type="number" min={1} max={72} value={settings.after_hours ?? 6} onChange={(e) => set({ after_hours: Number(e.target.value) })} className={`${INPUT} max-w-[160px]`} />
      </Field>
      <BilingualInput label="Button label (optional)" en={settings.button_label ?? ''} es={settings.button_label_es ?? ''} onEn={(v) => set({ button_label: v })} onEs={(v) => set({ button_label_es: v })} max={LIMITS.labelMax} />
      {!!settings.button_label?.trim() &&
      <LinkFields label="Where does it go?" linkType={settings.link_type ?? 'tab'} linkValue={settings.link_value ?? 'events'} openMode={settings.open_mode ?? 'auto'} onChange={(l) => set(l)} />
      }
    </>);
}

// ===== Social links =====

function SocialFields({ settings, set }: {settings: SectionSettings;set: Set;}) {
  const list = normalizeSocial(settings.social);
  const update = (i: number, patch: Partial<(typeof list)[number]>) => set({ social: list.map((l, j) => j === i ? { ...l, ...patch } : l) });
  return (
    <div data-ev-id="ev_94f5321eb4" className="flex flex-col gap-2">
      <span data-ev-id="ev_cffc0042dd" className="text-sm font-medium text-text">Buttons (turn on the ones you use, in the order shown)</span>
      {list.map((l, i) => {
        const p = SOCIAL_PLATFORMS.find((x) => x.key === l.platform)!;
        const err = l.enabled ? socialError(l) : null;
        return (
          <div data-ev-id="ev_90de8758ab" key={l.platform} className={`flex flex-col gap-2 p-2 rounded-[12px] border border-border ${l.enabled ? '' : 'opacity-70'}`}>
            <div data-ev-id="ev_e978f11ac2" className="flex items-center gap-2">
              <Toggle checked={l.enabled} onChange={(v) => update(i, { enabled: v })} label={`Show ${p.label}`} />
              <span data-ev-id="ev_e9b1a31406" className="w-24 text-sm font-semibold text-text shrink-0">{p.label}</span>
              <input data-ev-id="ev_16d5614b3d"
              value={l.value}
              onChange={(e) => update(i, { value: e.target.value })}
              placeholder={p.email ? 'name@example.com' : 'https://…'}
              inputMode={p.email ? 'email' : 'url'}
              maxLength={300}
              aria-label={`${p.label} ${p.email ? 'address' : 'link'}`}
              className={`${INPUT} flex-1 min-w-0`} />
              <SmallBtn label="Move up" disabled={i === 0} onClick={() => set({ social: swap(list, i, -1) })}><ArrowUp className="w-4 h-4" /></SmallBtn>
              <SmallBtn label="Move down" disabled={i === list.length - 1} onClick={() => set({ social: swap(list, i, 1) })}><ArrowDown className="w-4 h-4" /></SmallBtn>
            </div>
            {err && <span data-ev-id="ev_08f7f2ae08" className="text-xs text-destructive">{err}</span>}
          </div>);
      })}
      <p data-ev-id="ev_bbb91074b3" className="text-xs text-text-tertiary">Social links always open in the browser. Email opens the mail app.</p>
    </div>);
}

// ===== Gallery =====

function GalleryFields({ section, settings, set, busy, run }: {section: HomeSection;settings: SectionSettings;set: Set;busy: boolean;run?: Run;}) {
  return (
    <>
      <Field label="Photos on Home">
        <select data-ev-id="ev_f47250a4bf" value={settings.photo_count === 9 ? 9 : 6} onChange={(e) => set({ photo_count: Number(e.target.value) })} className={`${INPUT} max-w-[160px]`}>
          <option data-ev-id="ev_321e81ef19" value={6}>6 (2 rows)</option>
          <option data-ev-id="ev_cfcd459097" value={9}>9 (3 rows)</option>
        </select>
      </Field>
      <ToggleRow label="“See more” button" desc="Links to a full gallery page." checked={!!settings.see_more} onChange={(v) => set({ see_more: v, ...(v && !settings.link_type ? { link_type: 'portal', link_value: '/visit', open_mode: 'auto' } : {}) })} />
      {settings.see_more &&
      <LinkFields label="Where does it go?" linkType={settings.link_type ?? 'portal'} linkValue={settings.link_value ?? '/visit'} openMode={settings.open_mode ?? 'auto'} onChange={(l) => set(l)} />
      }
      {run && <GalleryPhotosList sectionId={section.id} photos={section.photos ?? []} busy={busy} run={run} />}
      <p data-ev-id="ev_3f46f06e00" className="text-xs text-text-tertiary">Photo changes save right away. Use “Save section” for the settings above.</p>
    </>);
}

/** Settings editor for the events, spotlight, countdown, social and gallery sections. */
export function ExtraSectionFields({ section, settings, set, busy, run }: {section: HomeSection;settings: SectionSettings;set: Set;busy: boolean;run?: Run;}) {
  switch (section.type) {
    case 'events':
      return <EventsFields settings={settings} set={set} />;
    case 'spotlight':
      return <SpotlightFields settings={settings} set={set} />;
    case 'countdown':
      return <CountdownFields settings={settings} set={set} />;
    case 'social':
      return <SocialFields settings={settings} set={set} />;
    case 'gallery':
      return <GalleryFields section={section} settings={settings} set={set} busy={busy} run={run} />;
    default:
      return null;
  }
}