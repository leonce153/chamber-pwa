import type { FeatureSettingsProps, IframeSettingsData } from './types';
import { Globe, RefreshCw, Maximize, Code, Eye } from 'lucide-react';

export function IframeSettings({ settings, onUpdateSettings }: FeatureSettingsProps) {
  const iframeSettings: IframeSettingsData = {
    url: settings.url as string ?? '',
    showNavBar: settings.showNavBar as boolean ?? true,
    showProgressBar: settings.showProgressBar as boolean ?? true,
    enablePullRefresh: settings.enablePullRefresh as boolean ?? true,
    allowFullscreen: settings.allowFullscreen as boolean ?? false,
    customCss: settings.customCss as string | undefined,
    customJs: settings.customJs as string | undefined
  };

  return (
    <div data-ev-id="ev_ecef2b7a17" className="p-6 flex flex-col gap-8">
      {/* URL */}
      <section data-ev-id="ev_8132bfcfdb">
        <h3 data-ev-id="ev_5cb40e384e" className="text-lg font-semibold text-text mb-2">Website URL</h3>
        <p data-ev-id="ev_114bf01593" className="text-sm text-muted mb-4">The website to embed in your app. Must be HTTPS and allow iframe embedding.</p>
        
        <input data-ev-id="ev_2bb3c4cfba"
        type="url"
        value={iframeSettings.url}
        onChange={(e) => onUpdateSettings({ url: e.target.value })}
        className="w-full bg-input border border-border rounded-lg px-4 py-2.5 text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
        placeholder="https://example.com" />

        <p data-ev-id="ev_a34cbcf4e8" className="text-xs text-muted mt-2">Note: Some sites block iframe embedding (e.g., Google, Facebook). Test your URL before publishing.</p>
      </section>

      {/* Display Options */}
      <section data-ev-id="ev_7430d0514c">
        <h3 data-ev-id="ev_c1861dc30e" className="text-lg font-semibold text-text mb-4">Display Options</h3>
        
        <div data-ev-id="ev_434fa28190" className="flex flex-col gap-4">
          {[
          { key: 'showNavBar', label: 'Show Navigation Bar', description: 'Display back/forward/reload buttons', icon: Globe },
          { key: 'showProgressBar', label: 'Show Loading Progress', description: 'Display loading indicator while page loads', icon: Eye },
          { key: 'enablePullRefresh', label: 'Enable Pull-to-Refresh', description: 'Allow users to refresh by pulling down', icon: RefreshCw },
          { key: 'allowFullscreen', label: 'Allow Fullscreen', description: 'Let the embedded site request fullscreen mode', icon: Maximize }].
          map(({ key, label, description, icon: Icon }) =>
          <label data-ev-id="ev_199c968985" key={key} className="flex items-start gap-4 cursor-pointer p-4 bg-surface-elevated rounded-xl">
              <Icon className="w-5 h-5 text-muted mt-0.5" />
              <div data-ev-id="ev_c2e7d60cc3" className="flex-1">
                <span data-ev-id="ev_5e0104cc6c" className="text-text font-medium">{label}</span>
                <p data-ev-id="ev_ff8a75984a" className="text-sm text-muted mt-0.5">{description}</p>
              </div>
              <div data-ev-id="ev_e0577b28de"
            onClick={() => onUpdateSettings({ [key]: !iframeSettings[key as keyof IframeSettingsData] })}
            className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
            iframeSettings[key as keyof IframeSettingsData] ? 'bg-primary' : 'bg-background'}`
            }>

                <div data-ev-id="ev_9809246298"
              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
              iframeSettings[key as keyof IframeSettingsData] ? 'translate-x-5' : 'translate-x-0.5'}`
              } />

              </div>
            </label>
          )}
        </div>
      </section>

      {/* Custom CSS */}
      <section data-ev-id="ev_d73ab32acc">
        <h3 data-ev-id="ev_0c58421043" className="text-lg font-semibold text-text mb-2">Custom CSS</h3>
        <p data-ev-id="ev_a9f50ea0ad" className="text-sm text-muted mb-4">Inject custom CSS into the embedded page (may not work on all sites).</p>
        
        <textarea data-ev-id="ev_7c519cf8c4"
        value={iframeSettings.customCss ?? ''}
        onChange={(e) => onUpdateSettings({ customCss: e.target.value || undefined })}
        className="w-full bg-input border border-border rounded-lg px-4 py-3 text-text font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
        rows={6}
        placeholder={`/* Hide header */\n.header { display: none; }\n\n/* Custom styles */\nbody { background: #fff; }`} />

      </section>

      {/* Custom JavaScript */}
      <section data-ev-id="ev_3f29fc9371">
        <h3 data-ev-id="ev_67ef4c9dfe" className="text-lg font-semibold text-text mb-2">Custom JavaScript</h3>
        <p data-ev-id="ev_39ce85d65e" className="text-sm text-muted mb-4">Inject custom JavaScript into the embedded page (use with caution).</p>
        
        <textarea data-ev-id="ev_8851e160da"
        value={iframeSettings.customJs ?? ''}
        onChange={(e) => onUpdateSettings({ customJs: e.target.value || undefined })}
        className="w-full bg-input border border-border rounded-lg px-4 py-3 text-text font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
        rows={6}
        placeholder={`// Remove unwanted elements\ndocument.querySelector('.banner')?.remove();\n\n// Custom initialization\nconsole.log('Loaded in PWA');`} />

      </section>

      {/* Warning */}
      <section data-ev-id="ev_477080bce2" className="bg-warning/10 border border-warning/30 rounded-xl p-4">
        <div data-ev-id="ev_71780ed6f8" className="flex items-start gap-3">
          <Code className="w-5 h-5 text-warning mt-0.5" />
          <div data-ev-id="ev_b8d9d85224">
            <p data-ev-id="ev_9513686c36" className="text-sm text-warning font-medium mb-1">Custom Code Warning</p>
            <p data-ev-id="ev_965fddec25" className="text-sm text-muted">
              Custom CSS and JavaScript injection may not work on all websites due to Content Security Policy restrictions. Always test thoroughly before publishing.
            </p>
          </div>
        </div>
      </section>
    </div>);

}