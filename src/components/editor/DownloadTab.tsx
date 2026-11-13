import { useState } from 'react';
import type { Tables } from '@/integrations/supabase/helpers';
import { Download, Globe, Copy, Check, ExternalLink, Loader2, CheckCircle, XCircle } from 'lucide-react';

type App = Tables<'apps'>;

interface DownloadTabProps {
  app: App;
  onUpdate: (updates: Partial<App>) => Promise<void>;
}

export function DownloadTab({ app, onUpdate }: DownloadTabProps) {
  const [copied, setCopied] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);
  const [publishStatus, setPublishStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const appUrl = `${window.location.origin}/preview/${app.slug}`;

  const handleCopy = () => {
    const textarea = document.createElement('textarea');
    textarea.value = appUrl;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePublish = async () => {
    setPublishing(true);
    setPublishStatus('idle');
    setErrorMessage('');

    try {
      await onUpdate({ status: 'active' });
      setPublishStatus('success');
      setTimeout(() => setPublishStatus('idle'), 3000);
    } catch (err) {
      setPublishStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Failed to publish app');
    } finally {
      setPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    setUnpublishing(true);
    setPublishStatus('idle');
    setErrorMessage('');

    try {
      await onUpdate({ status: 'draft' });
      setPublishStatus('success');
      setTimeout(() => setPublishStatus('idle'), 3000);
    } catch (err) {
      setPublishStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Failed to unpublish app');
    } finally {
      setUnpublishing(false);
    }
  };

  // Generate QR code URL using free API
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(appUrl)}&bgcolor=1e293b&color=ffffff`;

  const handleDownloadQR = async () => {
    try {
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${app.slug}-qr-code.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download QR code:', error);
    }
  };

  return (
    <div data-ev-id="ev_d97ec82dc4" className="max-w-4xl flex flex-col gap-8">
      {/* PWA Download */}
      <section data-ev-id="ev_bae0bff233" className="bg-surface border border-border rounded-xl overflow-hidden">
        <div data-ev-id="ev_0ac4cdddcf" className="px-6 py-4 border-b border-border border-l-4 border-l-primary flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary" />
          <h2 data-ev-id="ev_9c7e5c1a6c" className="text-lg font-semibold text-text">Progressive Web App (PWA)</h2>
        </div>
        <div data-ev-id="ev_e068a4dbcd" className="p-6">
          <p data-ev-id="ev_08f1b7039d" className="text-muted mb-6">
            Your app is automatically available as a PWA. Users can install it directly from their browser on any device.
          </p>

          <div data-ev-id="ev_a8d8ec8f7b" className="bg-surface-elevated border border-border rounded-xl p-6 mb-6">
            <div data-ev-id="ev_7de41d021a" className="flex items-center justify-between mb-4">
              <span data-ev-id="ev_19a013578e" className="text-sm font-medium text-muted">Your App URL</span>
              <span data-ev-id="ev_933799fed5" className={`text-xs font-medium px-2 py-1 rounded ${
              app.status === 'active' ?
              'bg-success/20 text-success' :
              'bg-warning/20 text-warning'}`
              }>
                {app.status === 'active' ? 'Live' : 'Draft'}
              </span>
            </div>
            <div data-ev-id="ev_e6efc43053" className="flex items-center gap-3">
              <div data-ev-id="ev_020aa11940" className="flex-1 bg-input border border-border rounded-lg px-4 py-3 font-mono text-text text-sm truncate">
                {appUrl}
              </div>
              <button data-ev-id="ev_83a1ab245b"
              onClick={handleCopy}
              className="bg-primary hover:bg-primary-hover text-white p-3 rounded-lg transition-colors">

                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
              <a data-ev-id="ev_84b73f5ce5"
              href={appUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-surface border border-border hover:bg-border text-text p-3 rounded-lg transition-colors">

                <ExternalLink className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div data-ev-id="ev_7560529921" className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* QR Code */}
            <div data-ev-id="ev_c667875fd2" className="bg-surface-elevated border border-border rounded-xl p-6 text-center">
              <div data-ev-id="ev_982b568bd0" className="w-32 h-32 mx-auto mb-4 rounded-lg overflow-hidden bg-[#1e293b]">
                <img data-ev-id="ev_11fb0c0804"
                src={qrCodeUrl}
                alt="QR Code to preview app"
                className="w-full h-full" />

              </div>
              <p data-ev-id="ev_5508122877" className="text-sm text-muted mb-3">Scan to preview on mobile</p>
              <button
                data-ev-id="ev_e705d222be"
                onClick={handleDownloadQR}
                className="text-primary hover:text-primary-hover text-sm font-medium">
                Download QR Code
              </button>
            </div>

            {/* Install Instructions */}
            <div data-ev-id="ev_119c1eeb9c" className="bg-surface-elevated border border-border rounded-xl p-6">
              <h3 data-ev-id="ev_53dfaec0d1" className="font-medium text-text mb-4">How to Install</h3>
              <div data-ev-id="ev_9d430c8414" className="flex flex-col gap-4 text-sm">
                <div data-ev-id="ev_6d16b96862" className="flex items-start gap-3">
                  <div data-ev-id="ev_81173230b8" className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                    1
                  </div>
                  <p data-ev-id="ev_497a6dbad0" className="text-muted">Open the URL in Chrome (Android) or Safari (iOS)</p>
                </div>
                <div data-ev-id="ev_e8e3bb8065" className="flex items-start gap-3">
                  <div data-ev-id="ev_10f09715ff" className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                    2
                  </div>
                  <p data-ev-id="ev_78268ffe45" className="text-muted">Tap the share button or menu icon</p>
                </div>
                <div data-ev-id="ev_2283267215" className="flex items-start gap-3">
                  <div data-ev-id="ev_b243103f03" className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                    3
                  </div>
                  <p data-ev-id="ev_7f5391f113" className="text-muted">Select "Add to Home Screen" or "Install App"</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Publish Button */}
      <section data-ev-id="ev_0c45c99987" className="bg-surface border border-border rounded-xl overflow-hidden">
        <div data-ev-id="ev_e03f8f1234" className="px-6 py-4 border-b border-border border-l-4 border-l-success flex items-center gap-2">
          <Download className="w-5 h-5 text-success" />
          <h2 data-ev-id="ev_514fbb7a22" className="text-lg font-semibold text-text">Publish Your App</h2>
        </div>
        <div data-ev-id="ev_3f9bdd124c" className="p-6">
          <p data-ev-id="ev_3abe302653" className="text-muted mb-6">
            When you're ready, publish your app to make it live. You can unpublish at any time.
          </p>

          <div data-ev-id="ev_a92ec44ed9" className="flex flex-col gap-4">
            <div data-ev-id="ev_d55d21c79f" className="flex items-center gap-4">
              <button data-ev-id="ev_5ffa2cabe9"
              onClick={handlePublish}
              disabled={publishing || unpublishing}
              className="bg-success hover:bg-success/90 text-white font-medium px-8 py-3 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50">

                {publishing ?
                <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Publishing...
                  </> :

                <>
                    <Download className="w-5 h-5" />
                    {app.status === 'active' ? 'Update App' : 'Publish App'}
                  </>
                }
              </button>
              
              {app.status === 'active' &&
              <button
                data-ev-id="ev_8b8bdc0e3f"
                onClick={handleUnpublish}
                disabled={publishing || unpublishing}
                className="bg-destructive/10 hover:bg-destructive/20 text-destructive font-medium px-6 py-3 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2">
                  {unpublishing ?
                <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Unpublishing...
                    </> :

                'Unpublish'
                }
                </button>
              }
            </div>
            
            {/* Status Messages */}
            {publishStatus === 'success' &&
            <div data-ev-id="ev_c5444da478" className="flex items-center gap-2 text-success text-sm">
                <CheckCircle className="w-4 h-4" />
                <span data-ev-id="ev_8a12926fea">{app.status === 'active' ? 'App published successfully!' : 'App unpublished successfully!'}</span>
              </div>
            }
            
            {publishStatus === 'error' &&
            <div data-ev-id="ev_1ddb5df2f4" className="flex items-center gap-2 text-destructive text-sm">
                <XCircle className="w-4 h-4" />
                <span data-ev-id="ev_ee2e156b03">{errorMessage}</span>
              </div>
            }
          </div>
        </div>
      </section>
    </div>);

}