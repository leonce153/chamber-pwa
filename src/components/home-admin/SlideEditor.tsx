import { useRef, useState } from 'react';
import { X, Loader2, AlertCircle, Upload, ImageOff } from 'lucide-react';
import { BilingualInput, Field, INPUT, LinkFields, Toggle } from '@/components/home-admin/fields';
import { BannerFrame } from '@/components/pwa/home/BannerSection';
import { imageFileError, removeBannerImages, uploadBannerImage, type SlideInput } from '@/lib/banner-admin';
import { centralInputToIso, isoToCentralInput } from '@/lib/central-time';
import { deleteImageUrlsNow } from '@/lib/home-image-cleanup';
import {
  BANNER_SHAPES, LIMITS, linkError,
  type BannerShape, type LinkType, type OpenMode } from
'@/lib/home-layout';

interface SlideEditorProps {
  slide: SlideInput & {id?: string;};
  shape: BannerShape;
  label: {en: string | null;es: string | null;};
  onCancel: () => void;
  onSave: (slide: SlideInput) => Promise<string | null>;
}

const blank = (v: string) => v.trim() ? v.trim() : null;

function ImagePicker({ title, url, uploading, onPick, onClear, required

}: {title: string;url: string;uploading: boolean;onPick: (f: File) => void;onClear?: () => void;required?: boolean;}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div data-ev-id="ev_f12b71cb42" className="flex flex-col gap-1.5">
      <span data-ev-id="ev_1352c5aa1d" className="text-sm font-medium text-text">{title}{required && <span data-ev-id="ev_139bd4329d" className="text-destructive"> *</span>}</span>
      <div data-ev-id="ev_786dbfdc09" className="flex flex-wrap items-center gap-3">
        <div data-ev-id="ev_fe8adae02c" className="w-[120px] h-[60px] rounded-[10px] border border-border bg-input overflow-hidden flex items-center justify-center shrink-0">
          {url ? <img data-ev-id="ev_c0b47f9aa8" src={url} alt="" className="w-full h-full object-cover" /> : <ImageOff className="w-5 h-5 text-text-tertiary" />}
        </div>
        <input data-ev-id="ev_228b993740"
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-label={title}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          e.target.value = '';
        }} />
        <button data-ev-id="ev_1d53991b37"
        type="button"
        onClick={() => input.current?.click()}
        disabled={uploading}
        className="min-h-[44px] px-3 rounded-[10px] border border-border text-sm font-medium text-text flex items-center gap-2 hover:bg-surface-elevated disabled:opacity-50">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {url ? 'Replace' : 'Upload'}
        </button>
        {url && onClear &&
        <button data-ev-id="ev_2df8d1b6bd" type="button" onClick={onClear} className="min-h-[44px] px-3 rounded-[10px] text-sm font-medium text-destructive hover:bg-destructive/10">
            Remove
          </button>
        }
      </div>
    </div>);
}

export function SlideEditor({ slide, shape, label, onCancel, onSave }: SlideEditorProps) {
  const [imageUrl, setImageUrl] = useState(slide.image_url);
  const [imageUrlEs, setImageUrlEs] = useState(slide.image_url_es ?? '');
  const [alt, setAlt] = useState(slide.alt_text);
  const [altEs, setAltEs] = useState(slide.alt_text_es ?? '');
  const [sponsor, setSponsor] = useState(slide.sponsor_name ?? '');
  const [noLink, setNoLink] = useState(!slide.link_type);
  const [link, setLink] = useState<{link_type: LinkType;link_value: string;open_mode: OpenMode;}>({
    link_type: slide.link_type ?? 'url',
    link_value: slide.link_value ?? 'https://',
    open_mode: slide.open_mode ?? 'auto'
  });
  const [start, setStart] = useState(isoToCentralInput(slide.start_at));
  const [end, setEnd] = useState(isoToCentralInput(slide.end_at));
  const [visible, setVisible] = useState(slide.is_visible);
  const [previewLang, setPreviewLang] = useState<'en' | 'es'>('en');
  const [uploading, setUploading] = useState<'en' | 'es' | null>(null);
  const [uploaded, setUploaded] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleteOld, setDeleteOld] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const size = BANNER_SHAPES[shape];

  const pick = async (which: 'en' | 'es', file: File) => {
    const bad = imageFileError(file);
    if (bad) return setError(bad);
    setError(null);
    setUploading(which);
    const { url, error: err } = await uploadBannerImage(file);
    setUploading(null);
    if (err || !url) return setError(err ?? 'Upload failed.');
    setUploaded((u) => [...u, url]);
    if (which === 'en') setImageUrl(url);else
    setImageUrlEs(url);
  };

  const cancel = () => {
    // Uploaded in this dialog but never saved
    removeBannerImages(uploaded);
    onCancel();
  };

  const handleSave = async () => {
    if (!imageUrl) return setError('Upload an image.');
    if (!alt.trim()) return setError('Describe the image for people using screen readers.');
    if (!noLink) {
      const err = linkError(link.link_type, link.link_value);
      if (err) return setError(err);
    }
    const startIso = start ? centralInputToIso(start) : null;
    const endIso = end ? centralInputToIso(end) : null;
    if (startIso && endIso && new Date(endIso) <= new Date(startIso)) return setError('The end must be after the start.');
    setSaving(true);
    setError(null);
    const err = await onSave({
      section_id: slide.section_id,
      position: slide.position,
      is_visible: visible,
      image_url: imageUrl,
      image_url_es: blank(imageUrlEs),
      alt_text: alt.trim(),
      alt_text_es: blank(altEs),
      sponsor_name: blank(sponsor),
      link_type: noLink ? null : link.link_type,
      link_value: noLink ? null : link.link_value.trim(),
      open_mode: noLink || link.link_type === 'tab' ? 'auto' : link.open_mode,
      start_at: startIso,
      end_at: endIso
    });
    setSaving(false);
    if (err) return setError(err);
    // Uploaded here but replaced before saving: never used, delete now.
    // Replaced saved images are queued by the database (or deleted now if asked).
    const kept = [imageUrl, imageUrlEs];
    removeBannerImages(uploaded.filter((u) => !kept.includes(u)));
    const replaced = [slide.image_url, slide.image_url_es].filter((u) => u && !kept.includes(u));
    if (deleteOld && replaced.length) await deleteImageUrlsNow(replaced);
  };

  const previewSrc = previewLang === 'es' && imageUrlEs ? imageUrlEs : imageUrl;
  const previewAlt = previewLang === 'es' && altEs.trim() ? altEs : alt;
  const previewLabel = previewLang === 'es' ? label.es : label.en;

  return (
    <div data-ev-id="ev_49970d5883" className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-6" role="dialog" aria-modal="true" aria-label={slide.id ? 'Edit slide' : 'Add slide'}>
      <div data-ev-id="ev_939b7016f8" className="bg-card border border-border w-full max-w-3xl max-h-[92vh] flex flex-col rounded-t-[20px] sm:rounded-[20px] overflow-hidden">
        <div data-ev-id="ev_732f4574b2" className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 data-ev-id="ev_f02735dd9a" className="text-lg font-display font-bold text-text">{slide.id ? 'Edit' : 'Add'} slide</h2>
          <button data-ev-id="ev_3a8d82501a" onClick={cancel} aria-label="Close" className="w-11 h-11 rounded-[10px] flex items-center justify-center text-text-secondary hover:bg-surface-elevated">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div data-ev-id="ev_c232533d3b" className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
          <div data-ev-id="ev_4ff804ec2c" className="flex flex-col gap-2">
            <div data-ev-id="ev_cbedc558ac" className="flex items-center justify-between">
              <span data-ev-id="ev_f2cee1c1cf" className="text-sm font-medium text-text">Preview</span>
              <div data-ev-id="ev_c3a9e428bc" className="flex rounded-[8px] border border-border overflow-hidden text-xs">
                {(['en', 'es'] as const).map((l) =>
                <button data-ev-id="ev_88387070b1" key={l} onClick={() => setPreviewLang(l)} className={`px-2.5 py-1.5 font-semibold ${previewLang === l ? 'bg-primary text-white' : 'text-text-secondary'}`}>
                    {l.toUpperCase()}
                  </button>
                )}
              </div>
            </div>
            <div data-ev-id="ev_6facdd8841" className="max-w-[360px]">
              <BannerFrame shape={shape} imageUrl={previewSrc} alt={previewAlt} label={previewLabel} />
            </div>
          </div>

          <ImagePicker title="Image" required url={imageUrl} uploading={uploading === 'en'} onPick={(f) => pick('en', f)} />
          <p data-ev-id="ev_68b53d4e26" className="text-xs text-text-tertiary -mt-3">
            {size.label}: use {size.w} × {size.h} px. JPG, PNG or WebP, up to 2 MB. Keep text away from the top-left corner (the label sits there).
          </p>
          <ImagePicker title="Spanish image (optional)" url={imageUrlEs} uploading={uploading === 'es'} onPick={(f) => pick('es', f)} onClear={() => setImageUrlEs('')} />

          {!!slide.id &&
          <label data-ev-id="ev_d2f8b1c0a1" className="flex items-center gap-2 text-sm text-text-secondary min-h-[44px] cursor-pointer -mt-2">
              <input data-ev-id="ev_d2f8b1c0a2" type="checkbox" checked={deleteOld} onChange={(e) => setDeleteOld(e.target.checked)} className="w-4 h-4 accent-primary" />
              Delete the old image now <span data-ev-id="ev_d2f8b1c0a3" className="text-text-tertiary">(when replaced; otherwise removed after 180 days)</span>
            </label>
          }

          <BilingualInput label="Image description (for screen readers)" en={alt} es={altEs} onEn={setAlt} onEs={setAltEs} max={LIMITS.altMax} required />

          <Field label="Sponsor name (only you see this)">
            <input data-ev-id="ev_1634df9593" value={sponsor} onChange={(e) => setSponsor(e.target.value)} maxLength={LIMITS.sponsorMax} className={INPUT} placeholder="e.g. First Bank of Muleshoe" />
          </Field>

          <LinkFields
            label="When tapped"
            none={noLink}
            onNoneChange={setNoLink}
            linkType={link.link_type}
            linkValue={link.link_value}
            openMode={link.open_mode}
            onChange={setLink} />

          <div data-ev-id="ev_2c48d497a7" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Start (optional)" hint="Central time. Empty starts now.">
              <input data-ev-id="ev_2feee54e3f" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className={INPUT} />
            </Field>
            <Field label="End (optional)" hint="Central time. Empty runs until you hide it.">
              <input data-ev-id="ev_71fe9a3f6c" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} className={INPUT} />
            </Field>
          </div>

          <div data-ev-id="ev_ee24c8608b" className="flex items-center justify-between gap-4">
            <div data-ev-id="ev_85a7d2d784">
              <p data-ev-id="ev_bb0cb292d4" className="text-sm font-medium text-text">Show this slide</p>
              <p data-ev-id="ev_a53d669db4" className="text-xs text-text-tertiary">Hidden slides stay saved here.</p>
            </div>
            <Toggle checked={visible} onChange={setVisible} label="Show this slide" />
          </div>
        </div>

        <div data-ev-id="ev_797c3ec57b" className="px-5 py-4 border-t border-border flex flex-col gap-3">
          {error &&
          <div data-ev-id="ev_b64344dd3c" className="flex items-start gap-2 text-sm text-destructive" role="alert">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{error}
            </div>
          }
          <div data-ev-id="ev_e1e0f6c557" className="flex justify-end gap-2">
            <button data-ev-id="ev_3e9bd19f77" onClick={cancel} className="min-h-[44px] px-4 rounded-[10px] border border-border text-text font-medium hover:bg-surface-elevated">Cancel</button>
            <button data-ev-id="ev_01f09d384e" onClick={handleSave} disabled={saving || !!uploading} className="min-h-[44px] px-5 rounded-[10px] bg-primary hover:bg-primary-hover text-white font-medium flex items-center gap-2 disabled:opacity-50">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}Save
            </button>
          </div>
        </div>
      </div>
    </div>);
}