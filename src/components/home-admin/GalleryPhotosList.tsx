import { useRef, useState } from 'react';
import { AlertTriangle, ArrowDown, ArrowUp, Eye, EyeOff, ImagePlus, Loader2, Pencil, Save, Trash2 } from 'lucide-react';
import { BilingualInput } from '@/components/home-admin/fields';
import { imageFileError } from '@/lib/banner-admin';
import { deletePhoto, savePhotoPositions, updatePhoto, uploadGalleryPhotos } from '@/lib/gallery-admin';
import { LIMITS, type GalleryPhoto } from '@/lib/home-layout';

type Run = (action: () => Promise<string | null>, success: string) => Promise<string | null>;

function Btn({ label, onClick, disabled, danger, children }: {label: string;onClick: () => void;disabled?: boolean;danger?: boolean;children: React.ReactNode;}) {
  return (
    <button data-ev-id="ev_db8792008c"
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    title={label}
    className={`w-10 h-10 rounded-[10px] flex items-center justify-center transition-colors disabled:opacity-30 ${danger ? 'text-destructive hover:bg-destructive/10' : 'text-text-secondary hover:bg-surface-elevated'}`}>
      {children}
    </button>);
}

function PhotoEditor({ photo, run, onDone }: {photo: GalleryPhoto;run: Run;onDone: () => void;}) {
  const [alt, setAlt] = useState(photo.alt_text);
  const [altEs, setAltEs] = useState(photo.alt_text_es ?? '');
  const [cap, setCap] = useState(photo.caption ?? '');
  const [capEs, setCapEs] = useState(photo.caption_es ?? '');
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    const err = await run(() => updatePhoto(photo.id, {
      alt_text: alt.trim(),
      alt_text_es: altEs.trim() || null,
      caption: cap.trim() || null,
      caption_es: capEs.trim() || null
    }), 'Photo saved');
    setSaving(false);
    if (!err) onDone();
  };
  return (
    <div data-ev-id="ev_167fe51344" className="flex flex-col gap-3 p-3 rounded-[12px] bg-surface-elevated">
      <BilingualInput label="Photo description (for screen readers, required to show)" en={alt} es={altEs} onEn={setAlt} onEs={setAltEs} max={LIMITS.altMax} />
      <BilingualInput label="Caption (optional, shown in the full-screen view)" en={cap} es={capEs} onEn={setCap} onEs={setCapEs} max={200} multiline />
      <div data-ev-id="ev_3adcafdc57" className="flex justify-end gap-2">
        <button data-ev-id="ev_f4f123de01" type="button" onClick={onDone} className="min-h-[44px] px-4 rounded-[10px] border border-border text-text font-medium hover:bg-card">Cancel</button>
        <button data-ev-id="ev_e7e6df8b92" type="button" onClick={save} disabled={saving} className="min-h-[44px] px-4 rounded-[10px] bg-primary hover:bg-primary-hover text-white font-medium flex items-center gap-2 disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Save photo
        </button>
      </div>
    </div>);
}

/** Gallery photos: multi-upload, describe, reorder, hide, delete. Changes save right away. */
export function GalleryPhotosList({ sectionId, photos, busy, run }: {sectionId: string;photos: GalleryPhoto[];busy: boolean;run: Run;}) {
  const input = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);
  const missing = photos.filter((p) => !p.alt_text.trim()).length;
  const room = LIMITS.galleryMax - photos.length;

  const pick = (list: FileList | null) => {
    setPickError(null);
    const files = Array.from(list ?? []);
    if (input.current) input.current.value = '';
    if (!files.length) return;
    const bad = files.map((f) => {
      const e = imageFileError(f);
      return e ? `${f.name}: ${e}` : null;
    }).filter(Boolean);
    const good = files.filter((f) => !imageFileError(f));
    const take = good.slice(0, room);
    const notes = [...bad];
    if (good.length > room) notes.push(`Only ${room} more photo${room === 1 ? '' : 's'} fit (30 max). The rest were skipped.`);
    if (notes.length) setPickError(notes.join(' '));
    if (!take.length) return;
    const start = Math.max(0, ...photos.map((p) => p.position)) + 1;
    run(() => uploadGalleryPhotos(sectionId, start, take), `${take.length} photo${take.length === 1 ? '' : 's'} added. Add a description so they show.`);
  };

  const move = (i: number, dir: -1 | 1) => {
    const ids = photos.map((p) => p.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    run(() => savePhotoPositions(ids), 'Order saved');
  };

  return (
    <div data-ev-id="ev_f7ff0065bf" className="flex flex-col gap-2">
      <span data-ev-id="ev_5642987ea2" className="text-sm font-medium text-text">Photos ({photos.length}/{LIMITS.galleryMax})</span>
      {missing > 0 &&
      <div data-ev-id="ev_a5ba83a50a" className="flex items-start gap-2 p-3 rounded-[10px] bg-warning/10 border border-warning/30 text-sm text-text" role="status">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" aria-hidden="true" />
          <span data-ev-id="ev_fc9b355320">{missing} photo{missing === 1 ? ' needs' : 's need'} a description. Photos without one don’t show in the app.</span>
        </div>
      }
      {photos.length === 0 && <p data-ev-id="ev_e8d1182e47" className="text-sm text-text-tertiary">No photos yet. This section stays off the Home screen until a described photo is showing.</p>}
      {photos.map((p, i) =>
      <div data-ev-id="ev_fcf857dd66" key={p.id} className="flex flex-col gap-2">
          <div data-ev-id="ev_a492995471" className={`flex flex-wrap sm:flex-nowrap items-center gap-2 p-2 rounded-[12px] border ${p.alt_text.trim() ? 'border-border' : 'border-warning'} ${p.is_visible ? '' : 'opacity-60'}`}>
            <img data-ev-id="ev_8890701127" src={p.image_url} alt="" className="w-12 h-12 rounded-[8px] object-cover bg-input shrink-0" />
            <span data-ev-id="ev_fc172812ae" className="flex-1 min-w-[140px] flex flex-col gap-0.5">
              <span data-ev-id="ev_db1532a5f3" className="text-sm font-semibold text-text truncate">
                {p.alt_text.trim() || <span data-ev-id="ev_77f6055578" className="text-warning">Needs a description</span>}{!p.is_visible && ' (hidden)'}
              </span>
              <span data-ev-id="ev_23d9c7414e" className="text-xs text-text-tertiary truncate">{p.caption || 'No caption'}{p.updated_by_name ? ` · ${p.updated_by_name}` : ''}</span>
            </span>
            <span data-ev-id="ev_86ca82271a" className="flex items-center">
              <Btn label="Move up" disabled={i === 0 || busy} onClick={() => move(i, -1)}><ArrowUp className="w-4 h-4" /></Btn>
              <Btn label="Move down" disabled={i === photos.length - 1 || busy} onClick={() => move(i, 1)}><ArrowDown className="w-4 h-4" /></Btn>
              <Btn label={p.is_visible ? 'Hide' : 'Show'} disabled={busy} onClick={() => run(() => updatePhoto(p.id, { is_visible: !p.is_visible }), p.is_visible ? 'Photo hidden' : 'Photo showing')}>
                {p.is_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </Btn>
              <Btn label="Edit description" onClick={() => setEditing(editing === p.id ? null : p.id)}><Pencil className="w-4 h-4" /></Btn>
              <Btn label="Delete" danger disabled={busy} onClick={() => {
              if (window.confirm('Delete this photo? This can’t be undone.')) run(() => deletePhoto(p), 'Photo deleted');
            }}><Trash2 className="w-4 h-4" /></Btn>
            </span>
          </div>
          {editing === p.id && <PhotoEditor photo={p} run={run} onDone={() => setEditing(null)} />}
        </div>
      )}
      {room > 0 &&
      <button data-ev-id="ev_7b97548381" type="button" onClick={() => input.current?.click()} disabled={busy} className="self-start min-h-[44px] px-3 rounded-[10px] border border-dashed border-border text-sm font-medium text-text flex items-center gap-2 hover:bg-surface-elevated disabled:opacity-50">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}Add photos
        </button>
      }
      <input data-ev-id="ev_9448c365ea" ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => pick(e.target.files)} />
      <span data-ev-id="ev_e21b9f819f" className="text-xs text-text-tertiary">Pick several at once. JPG, PNG or WebP, up to 2 MB each.</span>
      {pickError && <span data-ev-id="ev_0879ddba7f" className="text-xs text-destructive" role="alert">{pickError}</span>}
    </div>);
}