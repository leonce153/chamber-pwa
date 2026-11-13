import { useState } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { BilingualInput, ColorPicker, Field, IconPicker, LinkFields, Toggle } from '@/components/home-admin/fields';
import { HomeIconButton, HomeTileButton } from '@/components/pwa/home/HomeSections';
import {
  LIMITS, contrastWithWhite, ICON_DARK_BELOW, isHexColor, linkError,
  type HomeItem } from
'@/lib/home-layout';
import type { ItemInput } from '@/lib/home-admin';

interface ItemEditorProps {
  kind: 'tiles' | 'icons';
  /** Existing item, or a new draft (id empty). */
  item: ItemInput & {id?: string;};
  onCancel: () => void;
  onSave: (item: ItemInput) => Promise<string | null>;
}

const blank = (v: string) => v.trim() ? v.trim() : null;

export function ItemEditor({ kind, item, onCancel, onSave }: ItemEditorProps) {
  const [label, setLabel] = useState(item.label);
  const [labelEs, setLabelEs] = useState(item.label_es ?? '');
  const [hint, setHint] = useState(item.hint ?? '');
  const [hintEs, setHintEs] = useState(item.hint_es ?? '');
  const [viewer, setViewer] = useState(item.viewer_title ?? '');
  const [viewerEs, setViewerEs] = useState(item.viewer_title_es ?? '');
  const [icon, setIcon] = useState(item.icon);
  const [color, setColor] = useState(item.color);
  const [link, setLink] = useState({ link_type: item.link_type, link_value: item.link_value, open_mode: item.open_mode });
  const [visible, setVisible] = useState(item.is_visible);
  const [previewLang, setPreviewLang] = useState<'en' | 'es'>('en');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isTile = kind === 'tiles';
  const ratio = isHexColor(color) ? contrastWithWhite(color) : 21;
  const contrastNote = isTile ?
  ratio < 4.5 ? 'This color is light, so the text and icon will show dark for readability.' : null :
  ratio < ICON_DARK_BELOW ? 'This color is very light, so the icon will show dark for readability.' : null;

  const draft: HomeItem = {
    id: item.id || 'preview',
    section_id: item.section_id,
    position: item.position,
    is_visible: visible,
    label: label || 'Label',
    label_es: blank(labelEs),
    hint: isTile ? blank(hint) : null,
    hint_es: isTile ? blank(hintEs) : null,
    viewer_title: blank(viewer),
    viewer_title_es: blank(viewerEs),
    icon,
    color: isHexColor(color) ? color : '#2C6E73',
    ...link
  };

  const handleSave = async () => {
    if (!label.trim()) return setError('Add a button label.');
    if (!isHexColor(color)) return setError('Use a hex color like #2C6E73.');
    const linkErr = linkError(link.link_type, link.link_value);
    if (linkErr) return setError(linkErr);
    setSaving(true);
    setError(null);
    const err = await onSave({
      section_id: item.section_id,
      position: item.position,
      is_visible: visible,
      label: label.trim(),
      label_es: blank(labelEs),
      hint: isTile ? blank(hint) : null,
      hint_es: isTile ? blank(hintEs) : null,
      viewer_title: link.link_type === 'tab' ? null : blank(viewer),
      viewer_title_es: link.link_type === 'tab' ? null : blank(viewerEs),
      icon,
      color: color.toUpperCase(),
      link_type: link.link_type,
      link_value: link.link_value.trim(),
      open_mode: link.link_type === 'tab' ? 'auto' : link.open_mode
    });
    setSaving(false);
    if (err) setError(err);
  };

  return (
    <div data-ev-id="ev_df924d3d0d" className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-6" role="dialog" aria-modal="true" aria-label={item.id ? 'Edit button' : 'Add button'}>
      <div data-ev-id="ev_0f278d58cb" className="bg-card border border-border w-full max-w-3xl max-h-[92vh] flex flex-col rounded-t-[20px] sm:rounded-[20px] overflow-hidden">
        <div data-ev-id="ev_f6e9cd8d2a" className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 data-ev-id="ev_6a6ec05cfc" className="text-lg font-display font-bold text-text">
            {item.id ? 'Edit' : 'Add'} {isTile ? 'tile' : 'icon button'}
          </h2>
          <button data-ev-id="ev_e05d2f1577" onClick={onCancel} aria-label="Close" className="w-11 h-11 rounded-[10px] flex items-center justify-center text-text-secondary hover:bg-surface-elevated">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div data-ev-id="ev_d34a7c3615" className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-6">
          <div data-ev-id="ev_eb5887b261" className="flex flex-col gap-5 min-w-0">
            <BilingualInput label="Button label" en={label} es={labelEs} onEn={setLabel} onEs={setLabelEs} max={LIMITS.labelMax} required />
            {isTile &&
            <BilingualInput label="Short description" en={hint} es={hintEs} onEn={setHint} onEs={setHintEs} max={LIMITS.hintMax} />
            }
            <Field label="Icon"><IconPicker value={icon} onChange={setIcon} /></Field>
            <Field label="Color" hint={contrastNote ?? undefined}><ColorPicker value={color} onChange={setColor} /></Field>
            <LinkFields linkType={link.link_type} linkValue={link.link_value} openMode={link.open_mode} onChange={setLink} />
            {link.link_type !== 'tab' &&
            <div data-ev-id="ev_89a2d26e76" className="flex flex-col gap-1">
                <BilingualInput label="Page title in the app (optional)" en={viewer} es={viewerEs} onEn={setViewer} onEs={setViewerEs} max={LIMITS.viewerTitleMax} />
                <span data-ev-id="ev_426c3dd5b3" className="text-xs text-text-tertiary">Shown in the top bar when the page opens inside the app. Empty uses the button label.</span>
              </div>
            }
            <div data-ev-id="ev_311809fb41" className="flex items-center justify-between gap-4">
              <div data-ev-id="ev_548afca91a">
                <p data-ev-id="ev_772c171d20" className="text-sm font-medium text-text">Show on the Home screen</p>
                <p data-ev-id="ev_9e4c9af290" className="text-xs text-text-tertiary">Hidden buttons stay saved here.</p>
              </div>
              <Toggle checked={visible} onChange={setVisible} label="Show on the Home screen" />
            </div>
          </div>

          <div data-ev-id="ev_86ffab6237" className="flex flex-col gap-3 lg:sticky lg:top-0 self-start w-full">
            <div data-ev-id="ev_9ef6e878df" className="flex items-center justify-between">
              <span data-ev-id="ev_1ca1087047" className="text-sm font-medium text-text">Preview</span>
              <div data-ev-id="ev_b7c9553869" className="flex rounded-[8px] border border-border overflow-hidden text-xs">
                {(['en', 'es'] as const).map((l) =>
                <button data-ev-id="ev_a8b23ac8e7" key={l} onClick={() => setPreviewLang(l)} className={`px-2.5 py-1.5 font-semibold ${previewLang === l ? 'bg-primary text-white' : 'text-text-secondary'}`}>
                    {l.toUpperCase()}
                  </button>
                )}
              </div>
            </div>
            <div data-ev-id="ev_67c466cbe6" className="rounded-[16px] p-4 bg-white border border-border">
              {isTile ?
              <HomeTileButton item={draft} lang={previewLang} ariaLabel="Preview" onClick={() => undefined} /> :
              <div data-ev-id="ev_df786e150e" className="flex justify-center"><HomeIconButton item={draft} lang={previewLang} ariaLabel="Preview" onClick={() => undefined} textColor="#1A1A1A" /></div>
              }
            </div>
          </div>
        </div>

        <div data-ev-id="ev_8eb8ad8581" className="px-5 py-4 border-t border-border flex flex-col gap-3">
          {error &&
          <div data-ev-id="ev_a9ec44583f" className="flex items-start gap-2 text-sm text-destructive">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{error}
            </div>
          }
          <div data-ev-id="ev_ab89568b40" className="flex justify-end gap-2">
            <button data-ev-id="ev_9f3afabacb" onClick={onCancel} className="min-h-[44px] px-4 rounded-[10px] border border-border text-text font-medium hover:bg-surface-elevated">Cancel</button>
            <button data-ev-id="ev_817f620038" onClick={handleSave} disabled={saving} className="min-h-[44px] px-5 rounded-[10px] bg-primary hover:bg-primary-hover text-white font-medium flex items-center gap-2 disabled:opacity-50">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}Save
            </button>
          </div>
        </div>
      </div>
    </div>);
}