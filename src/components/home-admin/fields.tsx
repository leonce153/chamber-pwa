import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { HOME_ICONS, HOME_ICON_NAMES } from '@/components/pwa/home/homeIcons';
import {
  BRAND_SWATCHES, PORTAL_PAGES, TAB_OPTIONS, isHexColor, linkError,
  type LinkType, type OpenMode } from
'@/lib/home-layout';

export const INPUT =
'w-full bg-input border border-border rounded-[10px] px-3 py-2.5 text-text placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50';

export function Field({ label, hint, children }: {label: string;hint?: ReactNode;children: ReactNode;}) {
  return (
    <label data-ev-id="ev_299dd4b8ab" className="flex flex-col gap-1.5">
      <span data-ev-id="ev_6811cb4001" className="text-sm font-medium text-text">{label}</span>
      {children}
      {hint && <span data-ev-id="ev_ebebd65384" className="text-xs text-text-tertiary">{hint}</span>}
    </label>);
}

/** English + Spanish inputs side by side. Spanish left empty falls back to English in the app. */
export function BilingualInput({
  label, en, es, onEn, onEs, max, multiline = false, required = false








}: {label: string;en: string;es: string;onEn: (v: string) => void;onEs: (v: string) => void;max: number;multiline?: boolean;required?: boolean;}) {
  const Tag = multiline ? 'textarea' : 'input';
  return (
    <div data-ev-id="ev_e21ff328ff" className="flex flex-col gap-1.5">
      <span data-ev-id="ev_616f3342e4" className="text-sm font-medium text-text">{label}{required && <span data-ev-id="ev_0f595bba8d" className="text-destructive"> *</span>}</span>
      <div data-ev-id="ev_302a38effd" className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div data-ev-id="ev_5a10f89c3f" className="flex flex-col gap-1">
          <Tag
            value={en}
            maxLength={max}
            rows={multiline ? 3 : undefined}
            onChange={(e) => onEn(e.target.value)}
            placeholder="English"
            aria-label={`${label} (English)`}
            className={`${INPUT} ${multiline ? 'resize-none' : ''}`} />
          <span data-ev-id="ev_9381fda98d" className="text-xs text-text-tertiary">English · {en.length}/{max}</span>
        </div>
        <div data-ev-id="ev_f5ad639b88" className="flex flex-col gap-1">
          <Tag
            value={es}
            maxLength={max}
            rows={multiline ? 3 : undefined}
            onChange={(e) => onEs(e.target.value)}
            placeholder="Español (optional)"
            aria-label={`${label} (Spanish)`}
            className={`${INPUT} ${multiline ? 'resize-none' : ''}`} />
          <span data-ev-id="ev_e555ec22ff" className="text-xs text-text-tertiary">Spanish · {es.length}/{max}</span>
        </div>
      </div>
    </div>);
}

export function Toggle({ checked, onChange, label }: {checked: boolean;onChange: (v: boolean) => void;label: string;}) {
  return (
    <button data-ev-id="ev_cbc47c0a8e"
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={() => onChange(!checked)}
    className={`relative w-12 h-7 shrink-0 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-border-strong'}`}>
      <span data-ev-id="ev_66134284f5" className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${checked ? 'left-6' : 'left-1'}`} />
    </button>);
}

export function ColorPicker({ value, onChange }: {value: string;onChange: (v: string) => void;}) {
  const valid = isHexColor(value);
  return (
    <div data-ev-id="ev_4076fb198e" className="flex flex-col gap-2">
      <div data-ev-id="ev_8f09addd48" className="flex flex-wrap gap-2">
        {BRAND_SWATCHES.map((c) => {
          const active = value.toLowerCase() === c.toLowerCase();
          return (
            <button data-ev-id="ev_ae64d95768"
            key={c}
            type="button"
            onClick={() => onChange(c)}
            aria-label={`Color ${c}`}
            aria-pressed={active}
            className="w-9 h-9 rounded-[10px] flex items-center justify-center border border-black/10"
            style={{ backgroundColor: c }}>
              {active && <Check className="w-4 h-4 text-white drop-shadow" />}
            </button>);
        })}
      </div>
      <div data-ev-id="ev_0f4c1872fc" className="flex items-center gap-2">
        <input data-ev-id="ev_0ed591b74a"
        type="color"
        value={valid ? value : '#2C6E73'}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        aria-label="Pick any color"
        className="w-11 h-11 rounded-[10px] border border-border bg-input cursor-pointer" />
        <input data-ev-id="ev_ca281cc302"
        value={value}
        onChange={(e) => onChange(e.target.value.trim())}
        maxLength={7}
        placeholder="#2C6E73"
        aria-label="Hex color"
        className={`${INPUT} max-w-[140px] font-mono uppercase`} />
        {!valid && <span data-ev-id="ev_11040886ca" className="text-xs text-destructive">Use a hex color like #2C6E73</span>}
      </div>
    </div>);
}

export function IconPicker({ value, onChange }: {value: string;onChange: (v: string) => void;}) {
  return (
    <div data-ev-id="ev_82d191360e" className="grid grid-cols-8 sm:grid-cols-10 gap-1.5 max-h-[188px] overflow-y-auto p-1 border border-border rounded-[10px] bg-input">
      {HOME_ICON_NAMES.map((name) => {
        const Icon = HOME_ICONS[name];
        const active = value === name;
        return (
          <button data-ev-id="ev_3b8a2f2d90"
          key={name}
          type="button"
          onClick={() => onChange(name)}
          title={name}
          aria-label={`Icon ${name}`}
          aria-pressed={active}
          className={`h-10 rounded-lg flex items-center justify-center transition-colors ${active ? 'bg-primary text-white' : 'text-text hover:bg-surface-elevated'}`}>
            <Icon className="w-5 h-5" />
          </button>);
      })}
    </div>);
}

const LINK_TYPES: {value: LinkType;label: string;}[] = [
{ value: 'portal', label: 'Chamber website page' },
{ value: 'url', label: 'Other website' },
{ value: 'tab', label: 'App tab' }];

const OPEN_MODES: {value: OpenMode;label: string;}[] = [
{ value: 'auto', label: 'Automatic (follow app settings)' },
{ value: 'in_app', label: 'Inside the app' },
{ value: 'browser', label: 'In the browser' }];

export function LinkFields({
  linkType, linkValue, openMode, onChange, label = 'Link goes to', none = false, onNoneChange





}: {linkType: LinkType;linkValue: string;openMode: OpenMode;onChange: (next: {link_type: LinkType;link_value: string;open_mode: OpenMode;}) => void;label?: string;none?: boolean;onNoneChange?: (none: boolean) => void;}) {
  const set = (patch: Partial<{link_type: LinkType;link_value: string;open_mode: OpenMode;}>) =>
  onChange({ link_type: linkType, link_value: linkValue, open_mode: openMode, ...patch });
  const knownPortal = PORTAL_PAGES.some((p) => p.path === linkValue);
  const error = linkValue.trim() ? linkError(linkType, linkValue) : 'Choose where this goes.';

  return (
    <div data-ev-id="ev_a7763d5d4a" className="flex flex-col gap-3">
      <Field label={label}>
        <select data-ev-id="ev_0dc6007edd"
        value={none ? '__none' : linkType}
        onChange={(e) => {
          if (e.target.value === '__none') {
            onNoneChange?.(true);
            return;
          }
          onNoneChange?.(false);
          const t = e.target.value as LinkType;
          set({ link_type: t, link_value: t === 'portal' ? '/news' : t === 'tab' ? 'events' : 'https://' });
        }}
        className={INPUT}>
          {onNoneChange && <option data-ev-id="ev_1f0eee61c3" value="__none">No link (not clickable)</option>}
          {LINK_TYPES.map((o) => <option data-ev-id="ev_e24b335551" key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </Field>

      {!none && linkType === 'portal' &&
      <div data-ev-id="ev_4d33d42ef5" className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Field label="Page">
            <select data-ev-id="ev_a6ca55bda3"
          value={knownPortal ? linkValue : '__custom'}
          onChange={(e) => set({ link_value: e.target.value === '__custom' ? '/' : e.target.value })}
          className={INPUT}>
              {PORTAL_PAGES.map((p) => <option data-ev-id="ev_5304acff34" key={p.path} value={p.path}>{p.label} ({p.path})</option>)}
              <option data-ev-id="ev_cb03cf93de" value="__custom">Other page…</option>
            </select>
          </Field>
          {!knownPortal &&
        <Field label="Page path">
              <input data-ev-id="ev_14374b0f89" value={linkValue} onChange={(e) => set({ link_value: e.target.value })} placeholder="/page" className={INPUT} />
            </Field>
        }
        </div>
      }

      {!none && linkType === 'url' &&
      <Field label="Web address">
          <input data-ev-id="ev_6b273c0837" value={linkValue} onChange={(e) => set({ link_value: e.target.value })} placeholder="https://" className={INPUT} />
        </Field>
      }

      {!none && linkType === 'tab' &&
      <Field label="Tab">
          <select data-ev-id="ev_5dbbfe6d20" value={linkValue} onChange={(e) => set({ link_value: e.target.value })} className={INPUT}>
            {TAB_OPTIONS.map((o) => <option data-ev-id="ev_9bac6b55b5" key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
      }

      {!none && linkType !== 'tab' &&
      <Field label="Opens" hint="Sign-in pages (Member Portal, Sign in, Register) always open in the browser.">
          <select data-ev-id="ev_8fb2e02deb" value={openMode} onChange={(e) => set({ open_mode: e.target.value as OpenMode })} className={INPUT}>
            {OPEN_MODES.map((o) => <option data-ev-id="ev_fb926f02f1" key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
      }

      {error && !none && <p data-ev-id="ev_b7b5067b31" className="text-xs text-destructive">{error}</p>}
    </div>);
}