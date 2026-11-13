import { useState, useRef } from 'react';
import type { LinkItemData } from './types';
import {
  X,
  Globe,
  ExternalLink,
  Smartphone,
  Upload,
  Loader2 } from
'lucide-react';

interface LinkEditorProps {
  link?: LinkItemData;
  onSave: (data: LinkItemData) => void;
  onClose: () => void;
}

export function LinkEditor({ link, onSave, onClose }: LinkEditorProps) {
  const [data, setData] = useState<LinkItemData>(link ?? {
    title: '',
    url: '',
    openMode: 'in_app',
    showProgressBar: true,
    enablePullRefresh: true,
    allowDownloads: false,
    rememberSession: false
  });
  const [saving, setSaving] = useState(false);
  const iconInputRef = useRef<HTMLInputElement>(null);

  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(file.type)) {
      alert('Please select a PNG, JPG, GIF, or WebP image');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('Icon must be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setData({ ...data, iconUrl: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!data.title.trim() || !data.url.trim()) return;
    setSaving(true);
    await onSave(data);
    setSaving(false);
  };

  const openModes = [
  {
    id: 'in_app' as const,
    name: 'In-App Browser',
    description: 'Opens in a WebView overlay with configurable toolbar and options',
    icon: Smartphone
  },
  {
    id: 'custom_tab' as const,
    name: 'Custom Tab',
    description: 'Chrome Custom Tab (Android) / SFSafariViewController (iOS)',
    icon: Globe
  },
  {
    id: 'external' as const,
    name: 'External Browser',
    description: 'Opens in Chrome, Safari, etc.',
    icon: ExternalLink
  }];


  return (
    <div data-ev-id="ev_4f43383df1" className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div data-ev-id="ev_9d1f2a5d41" className="bg-surface border border-border rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div data-ev-id="ev_9993dd604e" className="flex items-center justify-between p-6 border-b border-border">
          <div data-ev-id="ev_a7d14677d3" className="flex items-center gap-3">
            <div data-ev-id="ev_37fa80e9f2" className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
              {data.iconUrl ?
              <img data-ev-id="ev_1f1a515524" src={data.iconUrl} alt="" className="w-6 h-6 rounded" /> :

              <Globe className="w-5 h-5 text-primary" />
              }
            </div>
            <div data-ev-id="ev_b358696d3a">
              <h2 data-ev-id="ev_15e8d7b398" className="text-lg font-semibold text-text">
                {link ? 'Edit Link' : 'Add Link'}
              </h2>
              {data.url && <p data-ev-id="ev_b919ce26df" className="text-sm text-muted truncate max-w-xs">{data.url}</p>}
            </div>
          </div>
          <button data-ev-id="ev_fcff67fafa" onClick={onClose} className="text-muted hover:text-text transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div data-ev-id="ev_8e33d5fdda" className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {/* Title & URL */}
          <div data-ev-id="ev_441f03302a" className="grid grid-cols-2 gap-4">
            <div data-ev-id="ev_f960b74a7a">
              <label data-ev-id="ev_ace388e33a" className="block text-sm font-medium text-text mb-1.5">Title</label>
              <input data-ev-id="ev_563d036fcd"
              type="text"
              value={data.title}
              onChange={(e) => setData({ ...data, title: e.target.value })}
              className="w-full bg-input border border-border rounded-lg px-4 py-2.5 text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="My Website" />

            </div>
            <div data-ev-id="ev_d1f0228ef8">
              <label data-ev-id="ev_3cd7db944c" className="block text-sm font-medium text-text mb-1.5">
                URL <span data-ev-id="ev_ef19abee87" className="text-destructive">*</span>
              </label>
              <input data-ev-id="ev_146cb5133e"
              type="url"
              value={data.url}
              onChange={(e) => setData({ ...data, url: e.target.value })}
              className="w-full bg-input border border-border rounded-lg px-4 py-2.5 text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="https://example.com"
              required />

            </div>
          </div>

          {/* Icon */}
          <div data-ev-id="ev_89149a005b">
            <label data-ev-id="ev_5c71bddfcc" className="block text-sm font-medium text-text mb-1.5">Icon (256x256)</label>
            <input data-ev-id="ev_aa2a8ed730"
            ref={iconInputRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            onChange={handleIconUpload}
            className="hidden" />

            <div data-ev-id="ev_1cd1a3de11" className="flex items-center gap-3">
              <div data-ev-id="ev_209da67c37" className="w-12 h-12 bg-surface-elevated border border-border rounded-lg flex items-center justify-center">
                {data.iconUrl ?
                <img data-ev-id="ev_d3c72baeaa" src={data.iconUrl} alt="" className="w-8 h-8 rounded" /> :

                <Globe className="w-6 h-6 text-muted" />
                }
              </div>
              <button
                data-ev-id="ev_1d5e7000e6"
                onClick={() => iconInputRef.current?.click()}
                className="px-4 py-2 bg-surface-elevated hover:bg-border text-text font-medium rounded-lg border border-border transition-colors">

                Change
              </button>
              {data.iconUrl &&
              <button data-ev-id="ev_80fe699e9e"
              onClick={() => setData({ ...data, iconUrl: undefined })}
              className="px-4 py-2 bg-destructive/10 hover:bg-destructive/20 text-destructive font-medium rounded-lg transition-colors">

                  Remove
                </button>
              }
            </div>
          </div>

          {/* Open Mode */}
          <div data-ev-id="ev_a39242afd0">
            <h3 data-ev-id="ev_26fb63ccbc" className="text-sm font-medium text-text mb-1.5">Open Mode</h3>
            <p data-ev-id="ev_1bbad78123" className="text-sm text-muted mb-3">Choose how the link opens on the user's device.</p>
            
            <div data-ev-id="ev_3a869eca8d" className="grid grid-cols-3 gap-3">
              {openModes.map((mode) =>
              <button data-ev-id="ev_95a8c43430"
              key={mode.id}
              onClick={() => setData({ ...data, openMode: mode.id })}
              className={`p-4 rounded-xl border-2 text-left transition-colors ${
              data.openMode === mode.id ?
              'border-primary bg-primary/5' :
              'border-border hover:border-primary/50'}`
              }>

                  <mode.icon className={`w-6 h-6 mb-2 ${
                data.openMode === mode.id ? 'text-primary' : 'text-muted'}`
                } />
                  <p data-ev-id="ev_6c2487ebb6" className={`font-medium text-sm ${
                data.openMode === mode.id ? 'text-primary' : 'text-text'}`
                }>
                    {mode.name}
                  </p>
                  <p data-ev-id="ev_eaf8ed4b2b" className="text-xs text-muted mt-1 line-clamp-2">{mode.description}</p>
                </button>
              )}
            </div>
          </div>

          {/* Display Options */}
          <div data-ev-id="ev_bc68c7bb6e">
            <h3 data-ev-id="ev_44c3b60474" className="text-sm font-medium text-text mb-3">Display Options</h3>
            
            <div data-ev-id="ev_fa84055d5f" className="grid grid-cols-2 gap-4">
              {[
              { key: 'showProgressBar', label: 'Show Loading Progress Bar' },
              { key: 'enablePullRefresh', label: 'Enable Pull-to-Refresh' },
              { key: 'allowDownloads', label: 'Allow File Downloads', description: 'Permit users to download files opened in the in-app browser' },
              { key: 'rememberSession', label: 'Remember Login Session', description: 'Persist cookies so users stay logged in between visits' }].
              map(({ key, label, description }) =>
              <label data-ev-id="ev_0514044b6f" key={key} className="flex items-start gap-3 cursor-pointer">
                  <div data-ev-id="ev_d8099e34f9"
                onClick={() => setData({ ...data, [key]: !data[key as keyof LinkItemData] })}
                className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer shrink-0 mt-0.5 ${
                data[key as keyof LinkItemData] ? 'bg-primary' : 'bg-surface-elevated'}`
                }>

                    <div data-ev-id="ev_b415c4f642"
                  className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                  data[key as keyof LinkItemData] ? 'translate-x-5' : 'translate-x-0.5'}`
                  } />

                  </div>
                  <div data-ev-id="ev_bef629734f">
                    <span data-ev-id="ev_511b9205fc" className="text-text text-sm">{label}</span>
                    {description && <p data-ev-id="ev_364abca17a" className="text-xs text-muted mt-0.5">{description}</p>}
                  </div>
                </label>
              )}
            </div>
          </div>

          {/* Advanced Browser Options */}
          <div data-ev-id="ev_4d33b64094">
            <h3 data-ev-id="ev_9174f039b9" className="text-sm font-medium text-text mb-1.5">Advanced Browser Options</h3>
            <p data-ev-id="ev_7470d58c51" className="text-sm text-muted mb-4">Fine-tune the In-App Browser behavior with custom user-agent, cookies, headers, and JavaScript injection.</p>
            
            <div data-ev-id="ev_7c2ad25c29" className="flex flex-col gap-4">
              <div data-ev-id="ev_abd0401ca2">
                <label data-ev-id="ev_b4dd977def" className="block text-sm font-medium text-text mb-1.5">Custom User-Agent</label>
                <input data-ev-id="ev_5dfff07b62"
                type="text"
                value={data.customUserAgent ?? ''}
                onChange={(e) => setData({ ...data, customUserAgent: e.target.value || undefined })}
                className="w-full bg-input border border-border rounded-lg px-4 py-2.5 text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Leave empty for default device user-agent" />

                <p data-ev-id="ev_c03f587276" className="text-xs text-muted mt-1">Override the browser user-agent string sent with requests</p>
              </div>

              <div data-ev-id="ev_9bda761274">
                <label data-ev-id="ev_472de2bc6b" className="block text-sm font-medium text-text mb-1.5">Inject Cookies</label>
                <textarea data-ev-id="ev_a1c4c6cd69"
                value={data.injectCookies ?? ''}
                onChange={(e) => setData({ ...data, injectCookies: e.target.value || undefined })}
                className="w-full bg-input border border-border rounded-lg px-4 py-2.5 text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                placeholder="key1=value1; key2=value2"
                rows={2} />

                <p data-ev-id="ev_7e8447da82" className="text-xs text-muted mt-1">Cookies to set before loading the URL (semicolon-separated)</p>
              </div>

              <div data-ev-id="ev_a4d9efca38">
                <label data-ev-id="ev_258350f802" className="block text-sm font-medium text-text mb-1.5">Custom HTTP Headers</label>
                <textarea data-ev-id="ev_32813af8a8"
                value={data.customHeaders ?? ''}
                onChange={(e) => setData({ ...data, customHeaders: e.target.value || undefined })}
                className="w-full bg-input border border-border rounded-lg px-4 py-2.5 text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                placeholder={"X-Custom-Header: value\nAuthorization: Bearer token123"}
                rows={3} />

                <p data-ev-id="ev_a6a1bf958e" className="text-xs text-muted mt-1">Additional headers sent with the request (one per line, Header: Value format)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div data-ev-id="ev_6e22236184" className="flex items-center justify-end gap-3 p-6 border-t border-border">
          <button data-ev-id="ev_c859e3a1e7"
          onClick={onClose}
          className="px-6 py-2.5 text-muted hover:text-text font-medium transition-colors">

            Cancel
          </button>
          <button data-ev-id="ev_3dcc918196"
          onClick={handleSave}
          disabled={saving || !data.title.trim() || !data.url.trim()}
          className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2">

            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {link ? 'Save Changes' : 'Add Link'}
          </button>
        </div>
      </div>
    </div>);

}