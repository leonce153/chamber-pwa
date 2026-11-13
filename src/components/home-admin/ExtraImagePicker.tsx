import { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { bucketPath, uploadBannerImage } from '@/lib/banner-admin';
import { deleteImageUrlsNow, markDeleteNow } from '@/lib/home-image-cleanup';

/** One image: upload (JPG, PNG or WebP, up to 2 MB) or remove. */
export function ExtraImagePicker({ value, onChange, label, hint }: {value: string;onChange: (url: string) => void;label: string;hint?: string;}) {
  const input = useRef<HTMLInputElement>(null);
  const uploads = useRef(new Set<string>());
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteOld, setDeleteOld] = useState(false);

  /** The old image is going away: delete now if asked (after save), or right away if it was never saved. */
  const dropOld = (old: string) => {
    if (!old) return;
    if (deleteOld) markDeleteNow(old);else
    if (uploads.current.has(old)) deleteImageUrlsNow([old]);
  };

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    const { url, error: err } = await uploadBannerImage(file);
    setUploading(false);
    if (input.current) input.current.value = '';
    if (err || !url) return setError(err ?? 'Upload failed.');
    uploads.current.add(url);
    dropOld(value);
    onChange(url);
  };

  const remove = () => {
    dropOld(value);
    onChange('');
  };

  return (
    <div data-ev-id="ev_ff62f73c57" className="flex flex-col gap-2">
      <span data-ev-id="ev_214a3bc7d1" className="text-sm font-medium text-text">{label}</span>
      <div data-ev-id="ev_10e594bf2c" className="flex items-center gap-3">
        {value ?
        <img data-ev-id="ev_dfad3c4a75" src={value} alt="" className="w-24 h-16 rounded-[10px] object-cover bg-input shrink-0" /> :

        <span data-ev-id="ev_ff4e190132" className="w-24 h-16 rounded-[10px] bg-input shrink-0" aria-hidden="true" />
        }
        <button data-ev-id="ev_a133ffb3a9"
        type="button"
        onClick={() => input.current?.click()}
        disabled={uploading}
        className="min-h-[44px] px-3 rounded-[10px] border border-border text-sm font-medium text-text flex items-center gap-2 hover:bg-surface-elevated disabled:opacity-50">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
          {value ? 'Replace' : 'Upload'}
        </button>
        {value &&
        <button data-ev-id="ev_93e58a1c46" type="button" onClick={remove} className="min-h-[44px] px-3 rounded-[10px] text-sm font-medium text-destructive flex items-center gap-1 hover:bg-destructive/10">
            <X className="w-4 h-4" />Remove
          </button>
        }
        <input data-ev-id="ev_fa26396c92" ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      </div>
      {!!bucketPath(value) &&
      <label data-ev-id="ev_c1e7a0d4b2" className="flex items-center gap-2 text-sm text-text-secondary min-h-[44px] cursor-pointer">
          <input data-ev-id="ev_c1e7a0d4b3" type="checkbox" checked={deleteOld} onChange={(e) => setDeleteOld(e.target.checked)} className="w-4 h-4 accent-primary" />
          Delete the old image now <span data-ev-id="ev_c1e7a0d4b4" className="text-text-tertiary">(otherwise removed 180 days after you replace it)</span>
        </label>
      }
      <span data-ev-id="ev_fd89dbb3cd" className="text-xs text-text-tertiary">{hint ?? 'JPG, PNG or WebP, up to 2 MB.'}</span>
      {error && <span data-ev-id="ev_8d64ccde48" className="text-xs text-destructive" role="alert">{error}</span>}
    </div>);
}
