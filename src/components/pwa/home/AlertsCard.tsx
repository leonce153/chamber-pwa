import { Bell, Share, Plus } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import { FOCUS, homePalette } from '@/components/pwa/home/homeStyles';

interface AlertsCardProps {
  isDark: boolean;
  textColor: string;
  needsIOSInstall: boolean;
  isIOSSafari: boolean;
  loading: boolean;
  initialized: boolean;
  error: string | null;
  onEnable: () => void;
  onDismiss: () => void;
}

/** "Get Chamber alerts" card (same design as before; HomeTab decides when it shows). */
export function AlertsCard({ isDark, textColor, needsIOSInstall, isIOSSafari, loading, initialized, error, onEnable, onDismiss }: AlertsCardProps) {
  const { t } = useLanguage();
  const { card, muted } = homePalette(isDark);

  return (
    <section data-ev-id="ev_alerts_card" className="flex flex-col gap-3 p-4 rounded-2xl" style={card}>
      <div data-ev-id="ev_alerts_head" className="flex items-start gap-3">
        <span data-ev-id="ev_alerts_icon" className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#FCE9C8' }}>
          <Bell size={20} color="#8A5A12" aria-hidden="true" />
        </span>
        <div data-ev-id="ev_alerts_text" className="flex-1 min-w-0">
          <h3 data-ev-id="ev_alerts_title" className="text-base font-semibold" style={{ color: textColor }}>{t('alerts.title')}</h3>
          <p data-ev-id="ev_alerts_desc" className="text-[15px] text-pretty" style={{ color: muted }}>
            {needsIOSInstall ? t('alerts.descIOS') : t('alerts.desc')}
          </p>
        </div>
      </div>

      {needsIOSInstall ?
      <ol data-ev-id="ev_alerts_ios_steps" className="flex flex-col gap-3">
          {[
        { n: 1, text: <>{t('alerts.step1a')} <Share className="w-5 h-5 inline-block mx-1 align-text-bottom" /> {t('alerts.step1b')}</> },
        { n: 2, text: <>{t('alerts.step2a')} <strong data-ev-id="ev_90405474c2">{t('alerts.step2b')}</strong> <Plus className="w-5 h-5 inline-block mx-1 align-text-bottom" /></> },
        { n: 3, text: <>{t('alerts.step3a')} <strong data-ev-id="ev_a6fa24e4f4">{t('alerts.step3b')}</strong></> }].
        map((step) =>
        <li key={step.n} data-ev-id={`ev_alerts_step_${step.n}`} className="flex items-start gap-3">
              <span data-ev-id="ev_alerts_step_num" className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-base font-bold text-white" style={{ backgroundColor: '#2C6E73' }}>
                {step.n}
              </span>
              <span data-ev-id="ev_alerts_step_text" className="text-[15px] pt-1" style={{ color: textColor }}>{step.text}</span>
            </li>
        )}
          {!isIOSSafari &&
        <li data-ev-id="ev_alerts_safari_note" className="p-3 rounded-xl border text-[15px]" style={{ backgroundColor: '#FEF3C7', borderColor: '#F59E0B', color: '#92400E' }}>
              {t('alerts.safariNote')}
            </li>
        }
        </ol> :

      <button
        data-ev-id="ev_alerts_enable"
        onClick={onEnable}
        disabled={loading || !initialized}
        className={`w-full min-h-11 px-4 rounded-xl text-base font-semibold text-white disabled:opacity-60 ${FOCUS}`}
        style={{ backgroundColor: '#2C6E73' }}>
          {loading ? t('alerts.turningOn') : initialized ? t('alerts.turnOn') : t('common.loading')}
        </button>
      }
      {error && <p data-ev-id="ev_alerts_error" className="text-[15px]" style={{ color: '#C0392B' }}>{error}</p>}
      <button
        data-ev-id="ev_alerts_not_now"
        onClick={onDismiss}
        className={`self-center min-h-11 px-4 text-[13px] font-semibold rounded-lg ${FOCUS}`}
        style={{ color: muted }}>
        {t('alerts.notNow')}
      </button>
    </section>);
}
