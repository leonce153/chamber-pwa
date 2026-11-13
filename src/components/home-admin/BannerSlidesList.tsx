import { ArrowUp, ArrowDown, Eye, EyeOff, Pencil, Trash2, Plus, MousePointerClick, BarChart3 } from 'lucide-react';
import { formatCentralRange } from '@/lib/central-time';
import { LIMITS, slideStatus, type BannerSlide, type SlideStatus } from '@/lib/home-layout';

const STATUS: Record<SlideStatus, {label: string;cls: string;}> = {
  live: { label: 'Live', cls: 'bg-success/15 text-success' },
  scheduled: { label: 'Scheduled', cls: 'bg-primary/15 text-primary' },
  ended: { label: 'Ended', cls: 'bg-surface-elevated text-text-secondary' },
  hidden: { label: 'Hidden', cls: 'bg-surface-elevated text-text-secondary' }
};

interface Props {
  slides: BannerSlide[];
  busy: boolean;
  onAdd: () => void;
  onEdit: (slide: BannerSlide) => void;
  onToggle: (slide: BannerSlide) => void;
  onDelete: (slide: BannerSlide) => void;
  onReorder: (ids: string[]) => void;
}

function Btn({ label, onClick, disabled, danger, children }: {label: string;onClick: () => void;disabled?: boolean;danger?: boolean;children: React.ReactNode;}) {
  return (
    <button data-ev-id="ev_1ad7edc170"
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    title={label}
    className={`w-10 h-10 rounded-[10px] flex items-center justify-center transition-colors disabled:opacity-30 ${danger ? 'text-destructive hover:bg-destructive/10' : 'text-text-secondary hover:bg-surface-elevated'}`}>
      {children}
    </button>);
}

export function BannerSlidesList({ slides, busy, onAdd, onEdit, onToggle, onDelete, onReorder }: Props) {
  const move = (i: number, dir: -1 | 1) => {
    const ids = slides.map((s) => s.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    onReorder(ids);
  };

  return (
    <div data-ev-id="ev_19fba769fb" className="flex flex-col gap-2">
      <span data-ev-id="ev_bb625e1965" className="text-sm font-medium text-text">Slides ({slides.length}/{LIMITS.slidesMax})</span>
      {slides.length === 0 &&
      <p data-ev-id="ev_237e6ee6f9" className="text-sm text-text-tertiary">No slides yet. This section stays off the Home screen until a slide is live.</p>
      }
      {slides.map((slide, i) => {
        const status = STATUS[slideStatus(slide)];
        return (
          <div data-ev-id="ev_478c7e017c" key={slide.id} className={`flex flex-wrap sm:flex-nowrap items-center gap-2 p-2 rounded-[12px] border border-border ${slide.is_visible ? '' : 'opacity-60'}`}>
            <img data-ev-id="ev_29db99a419" src={slide.image_url} alt="" className="w-[72px] h-[36px] rounded-[8px] object-cover bg-input shrink-0" />
            <span data-ev-id="ev_5437281335" className="flex-1 min-w-[140px] flex flex-col gap-0.5">
              <span data-ev-id="ev_35ecb19cd6" className="flex items-center gap-2 min-w-0">
                <span data-ev-id="ev_2ce4e70bca" className="text-sm font-semibold text-text truncate">{slide.sponsor_name || slide.alt_text}</span>
                <span data-ev-id="ev_51df1a8bc6" className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-md shrink-0 ${status.cls}`}>{status.label}</span>
              </span>
              <span data-ev-id="ev_d67e8b1b4a" className="text-xs text-text-tertiary truncate">
                {slide.link_type ? slide.link_type === 'tab' ? `App tab: ${slide.link_value}` : slide.link_value : 'Not clickable'}
                {' · '}{formatCentralRange(slide.start_at, slide.end_at)}
              </span>
              <span data-ev-id="ev_cd00b2c229" className="text-xs text-text-tertiary flex items-center gap-3">
                <span data-ev-id="ev_af3f32682e" className="flex items-center gap-1"><BarChart3 className="w-3 h-3" aria-hidden="true" />{slide.view_count ?? 0} views</span>
                <span data-ev-id="ev_274c3ce832" className="flex items-center gap-1"><MousePointerClick className="w-3 h-3" aria-hidden="true" />{slide.tap_count ?? 0} taps</span>
                {slide.updated_by_name && <span data-ev-id="ev_a49b578b82" className="truncate">{slide.updated_by_name}</span>}
              </span>
            </span>
            <span data-ev-id="ev_1f65a88cb7" className="flex items-center">
              <Btn label="Move up" disabled={i === 0 || busy} onClick={() => move(i, -1)}><ArrowUp className="w-4 h-4" /></Btn>
              <Btn label="Move down" disabled={i === slides.length - 1 || busy} onClick={() => move(i, 1)}><ArrowDown className="w-4 h-4" /></Btn>
              <Btn label={slide.is_visible ? 'Hide' : 'Show'} disabled={busy} onClick={() => onToggle(slide)}>
                {slide.is_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </Btn>
              <Btn label="Edit" onClick={() => onEdit(slide)}><Pencil className="w-4 h-4" /></Btn>
              <Btn label="Delete" danger disabled={busy} onClick={() => onDelete(slide)}><Trash2 className="w-4 h-4" /></Btn>
            </span>
          </div>);
      })}
      {slides.length < LIMITS.slidesMax &&
      <button data-ev-id="ev_8a619c2288" onClick={onAdd} className="self-start min-h-[44px] px-3 rounded-[10px] border border-dashed border-border text-sm font-medium text-text flex items-center gap-2 hover:bg-surface-elevated">
          <Plus className="w-4 h-4" />Add slide
        </button>
      }
    </div>);
}