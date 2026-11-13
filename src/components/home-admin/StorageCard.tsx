import { useCallback, useEffect, useState } from 'react';
import { HardDrive, Loader2, Trash2, X, AlertCircle, Check } from 'lucide-react';
import { deleteOldImagesNow, fetchOldImages, formatBytes, type OldImage } from '@/lib/home-image-cleanup';

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

/** Old images waiting to be removed from storage, with a review list and manual delete. */
export function StorageCard({ version }: {version: number;}) {
  const [images, setImages] = useState<OldImage[] | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ok: boolean;text: string;} | null>(null);

  const load = useCallback(async () => setImages(await fetchOldImages()), []);
  useEffect(() => {load();}, [load, version]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {if (e.key === 'Escape') setOpen(false);};
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!images) return null;

  const total = images.reduce((n, i) => n + (i.size ?? 0), 0);
  const count = `${images.length} old image${images.length === 1 ? '' : 's'}`;

  const remove = async (list: OldImage[], key: string) => {
    setBusy(key);
    setMessage(null);
    const r = await deleteOldImagesNow(list.map((i) => i.storage_path));
    setBusy(null);
    const parts: string[] = [];
    if (r.deleted) parts.push(`${r.deleted} deleted`);
    if (r.kept) parts.push(`${r.kept} kept because ${r.kept === 1 ? 'it is' : 'they are'} still used on Home`);
    setMessage(r.error ? { ok: false, text: r.error } : { ok: true, text: parts.join(' · ') || 'Nothing to delete.' });
    await load();
  };

  return (
    <>
      <div data-ev-id="ev_5c0a1f7e21" className="bg-card border border-border rounded-[16px] p-4 flex flex-wrap items-center gap-3">
        <HardDrive className="w-5 h-5 text-primary shrink-0" />
        <div data-ev-id="ev_5c0a1f7e22" className="flex-1 min-w-[200px]">
          <p data-ev-id="ev_5c0a1f7e23" className="font-semibold text-text">Storage</p>
          <p data-ev-id="ev_5c0a1f7e24" className="text-sm text-text-secondary text-pretty">{count} · {formatBytes(total)} · removed automatically 180 days after they were replaced</p>
        </div>
        <button data-ev-id="ev_5c0a1f7e25" type="button" onClick={() => {setMessage(null);setOpen(true);}} className="min-h-[44px] px-4 rounded-[10px] border border-border text-sm font-medium text-text hover:bg-surface-elevated">
          Review old images
        </button>
      </div>

      {open &&
      <div data-ev-id="ev_5c0a1f7e26" className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-6" role="dialog" aria-modal="true" aria-label="Old images">
          <div data-ev-id="ev_5c0a1f7e27" className="bg-card border border-border w-full max-w-2xl max-h-[92vh] flex flex-col rounded-t-[20px] sm:rounded-[20px] overflow-hidden">
            <div data-ev-id="ev_5c0a1f7e28" className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div data-ev-id="ev_5c0a1f7e29">
                <h2 data-ev-id="ev_5c0a1f7e30" className="text-lg font-display font-bold text-text">Old images</h2>
                <p data-ev-id="ev_5c0a1f7e31" className="text-xs text-text-tertiary">{count} · {formatBytes(total)}</p>
              </div>
              <button data-ev-id="ev_5c0a1f7e32" onClick={() => setOpen(false)} aria-label="Close" className="w-11 h-11 rounded-[10px] flex items-center justify-center text-text-secondary hover:bg-surface-elevated">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div data-ev-id="ev_5c0a1f7e33" className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
              {images.length === 0 && <p data-ev-id="ev_5c0a1f7e34" className="text-sm text-text-secondary p-3">No old images. Nothing is waiting to be removed.</p>}
              {images.map((img) =>
            <div data-ev-id="ev_5c0a1f7e35" key={img.id} className="flex items-center gap-3 p-2 rounded-[12px] border border-border">
                  {img.image_url ?
              <img data-ev-id="ev_5c0a1f7e36" src={img.image_url} alt="" loading="lazy" className="w-16 h-12 rounded-[8px] object-cover bg-input shrink-0" /> :
              <span data-ev-id="ev_5c0a1f7e37" className="w-16 h-12 rounded-[8px] bg-input shrink-0" />}
                  <div data-ev-id="ev_5c0a1f7e38" className="flex-1 min-w-0">
                    <p data-ev-id="ev_5c0a1f7e39" className="text-sm font-semibold text-text truncate">{img.used_in || 'Home image'}</p>
                    <p data-ev-id="ev_5c0a1f7e40" className="text-xs text-text-tertiary">
                      Replaced {fmtDate(img.replaced_at)} · Removes on {fmtDate(img.delete_after)}{img.size != null ? ` · ${formatBytes(img.size)}` : ''}
                    </p>
                  </div>
                  <button data-ev-id="ev_5c0a1f7e41"
              type="button"
              disabled={!!busy}
              onClick={() => {if (window.confirm('Delete this image now? This can’t be undone.')) remove([img], img.id);}}
              className="min-h-[44px] px-3 rounded-[10px] text-sm font-medium text-destructive flex items-center gap-1.5 hover:bg-destructive/10 disabled:opacity-50 shrink-0">
                    {busy === img.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}Delete now
                  </button>
                </div>
            )}
            </div>

            <div data-ev-id="ev_5c0a1f7e42" className="px-5 py-4 border-t border-border flex flex-col gap-3">
              {message &&
            <div data-ev-id="ev_5c0a1f7e43" className={`flex items-start gap-2 text-sm ${message.ok ? 'text-success' : 'text-destructive'}`} role="status">
                  {message.ok ? <Check className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}{message.text}
                </div>
            }
              <div data-ev-id="ev_5c0a1f7e44" className="flex justify-end gap-2">
                <button data-ev-id="ev_5c0a1f7e45" onClick={() => setOpen(false)} className="min-h-[44px] px-4 rounded-[10px] border border-border text-text font-medium hover:bg-surface-elevated">Close</button>
                <button data-ev-id="ev_5c0a1f7e46"
              disabled={!!busy || images.length === 0}
              onClick={() => {if (window.confirm(`Delete all ${images.length} old images now? Images still used on Home are kept. This can’t be undone.`)) remove(images, 'all');}}
              className="min-h-[44px] px-5 rounded-[10px] bg-destructive text-white font-medium flex items-center gap-2 disabled:opacity-50">
                  {busy === 'all' && <Loader2 className="w-4 h-4 animate-spin" />}Delete all now
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    </>);
}
