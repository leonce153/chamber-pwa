import { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronLeft, ExternalLink, Loader2 } from 'lucide-react';
import { openInBrowser, withChamberParams } from '@/components/pwa/linkRules';
import { useLanguage } from '@/hooks/use-language';

// Timeout for iframe loading fallback (6 seconds)
const IFRAME_LOAD_TIMEOUT = 6000;

interface InAppViewerProps {
  title: string;
  url: string;
  onBack: () => void;
  primaryColor: string;
  textColor: string;
  backgroundColor: string;
  backLabel?: string;
  className?: string;
}

/**
 * In-app page viewer: slim top bar (back arrow, title, open in browser)
 * with an iframe and a 6-second "Open in browser" fallback.
 */
export function InAppViewer({
  title,
  url,
  onBack,
  primaryColor,
  textColor,
  backgroundColor,
  backLabel,
  className = ''
}: InAppViewerProps) {
  const { t, lang } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [showFallback, setShowFallback] = useState(false);
  const loadingRef = useRef(true);

  // Chamber website pages: app=1 hides the site's header/footer, lang picks its language.
  // A language change gives a new src, which reloads the same page.
  const iframeSrc = useMemo(() => withChamberParams(url, { app: '1', lang }), [url, lang]);

  useEffect(() => {
    setLoading(true);
    setShowFallback(false);
    loadingRef.current = true;
    const timer = setTimeout(() => {
      if (loadingRef.current) setShowFallback(true);
    }, IFRAME_LOAD_TIMEOUT);
    return () => clearTimeout(timer);
  }, [iframeSrc]);

  const handleLoad = () => {
    loadingRef.current = false;
    setLoading(false);
    setShowFallback(false);
  };

  return (
    <div data-ev-id="ev_inapp_viewer" className={`flex flex-col h-full ${className}`} style={{ backgroundColor }}>
      {/* Slim top bar */}
      <div
        data-ev-id="ev_inapp_topbar"
        className="flex items-center gap-1 px-1 h-14 shrink-0 border-b"
        style={{ borderColor: primaryColor + '30', backgroundColor }}>
        <button
          data-ev-id="ev_inapp_back"
          onClick={onBack}
          className="w-11 h-11 flex items-center justify-center rounded-xl transition-opacity active:opacity-60"
          aria-label={backLabel ?? t('common.back')}>
          <ChevronLeft className="w-6 h-6" style={{ color: textColor }} />
        </button>
        <h2 data-ev-id="ev_inapp_title" className="flex-1 min-w-0 truncate text-base font-semibold" style={{ color: textColor }}>
          {title}
        </h2>
        <button
          data-ev-id="ev_inapp_open_browser"
          onClick={() => openInBrowser(url)}
          className="w-11 h-11 flex items-center justify-center rounded-xl transition-opacity active:opacity-60"
          aria-label={t('common.openInBrowser')}
          title={t('common.openInBrowser')}>
          <ExternalLink className="w-5 h-5" style={{ color: textColor }} />
        </button>
      </div>

      {/* Page */}
      <div data-ev-id="ev_inapp_content" className="flex-1 relative bg-white">
        <iframe
          data-ev-id="ev_inapp_iframe"
          src={iframeSrc}
          className="absolute inset-0 w-full h-full border-0"
          onLoad={handleLoad}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          title={title} />

        {loading && !showFallback &&
        <div data-ev-id="ev_inapp_loading" className="absolute inset-0 flex flex-col items-center justify-center gap-3" style={{ backgroundColor }}>
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} />
            <p data-ev-id="ev_inapp_loading_text" className="text-base opacity-70" style={{ color: textColor }}>{t('viewer.loading', { title })}</p>
          </div>
        }

        {showFallback &&
        <div data-ev-id="ev_timeout_fallback" className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center" style={{ backgroundColor }}>
            <Loader2 className="w-10 h-10 mb-4 animate-spin opacity-40" style={{ color: primaryColor }} />
            <p data-ev-id="ev_fallback_title" className="text-lg font-semibold mb-1" style={{ color: textColor }}>{t('viewer.slowTitle')}</p>
            <p data-ev-id="ev_fallback_desc" className="text-base opacity-70 mb-5 text-pretty" style={{ color: textColor }}>
              {t('viewer.slowDesc')}
            </p>
            <button
              data-ev-id="ev_fallback_open"
              onClick={() => openInBrowser(url)}
              className="flex items-center gap-2 px-5 min-h-11 rounded-xl text-base font-semibold text-white"
              style={{ backgroundColor: primaryColor }}>
              <ExternalLink className="w-5 h-5" />
              {t('common.openInBrowser')}
            </button>
          </div>
        }
      </div>
    </div>);
}
