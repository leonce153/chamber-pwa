import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/hooks/useApp';
import { useAppSettings } from '@/hooks/useAppSettings';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatusPill } from '@/components/StatusPill';
import {
  Loader2,
  Globe,
  Link as LinkIcon,
  Copy,
  Check,
  ExternalLink,
  Smartphone,
  QrCode,
  Share2,
  AlertCircle } from
'lucide-react';

export default function Distribute() {
  const { app, updateApp, loading: appLoading } = useApp();
  const { settings } = useAppSettings();
  const [publishing, setPublishing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  const isPublished = app?.status === 'active';
  // In single-tenant mode, the public PWA is always at root
  const appUrl = window.location.origin;

  const handlePublish = async () => {
    if (!app) return;
    setPublishing(true);
    setPublishError(null);

    const success = await updateApp({ status: 'active' });
    if (!success) {
      setPublishError('Failed to publish app. Please try again.');
    }
    setPublishing(false);
  };

  const handleUnpublish = async () => {
    if (!app) return;
    setPublishing(true);
    await updateApp({ status: 'draft' });
    setPublishing(false);
  };

  const handleCopyLink = () => {
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

  if (appLoading) {
    return (
      <AppLayout>
        <div data-ev-id="ev_688824749d" className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>);

  }

  return (
    <AppLayout>
      <div data-ev-id="distribute_page" className="p-4 sm:p-8 max-w-4xl">
        {/* Header */}
        <div data-ev-id="ev_6b4079f4a7" className="mb-8">
          <h1 data-ev-id="ev_d376f5ddf8" className="text-[28px] font-display font-bold text-text tracking-tight">Distribute</h1>
          <p data-ev-id="ev_ff1e0f4235" className="text-text-secondary mt-1">Publish your app and share it with the world</p>
        </div>

        {/* Status Card */}
        <div data-ev-id="ev_cf3ff344d2" className="bg-card border border-border rounded-[16px] p-6 mb-6">
          <div data-ev-id="ev_6d23257e08" className="flex items-center justify-between">
            <div data-ev-id="ev_060202c329" className="flex items-center gap-4">
              <div data-ev-id="ev_5753a4bd48"
              className={`w-14 h-14 rounded-[12px] flex items-center justify-center ${
              isPublished ? 'bg-success/10' : 'bg-warning/10'}`
              }>

                <Globe className={`w-7 h-7 ${isPublished ? 'text-success' : 'text-warning'}`} />
              </div>
              <div data-ev-id="ev_b08545c8ca">
                <div data-ev-id="ev_63ca72918e" className="flex items-center gap-3">
                  <h2 data-ev-id="ev_56766d6e22" className="text-xl font-display font-bold text-text">
                    {settings?.app_name || app?.name || 'My App'}
                  </h2>
                  <StatusPill status={isPublished ? 'published' : 'draft'} />
                </div>
                <p data-ev-id="ev_522532229c" className="text-text-secondary mt-0.5">
                  {isPublished ? 'Your app is live and accessible to users' : 'Your app is not yet published'}
                </p>
              </div>
            </div>

            <div data-ev-id="ev_97629377d0" className="flex gap-3">
              {isPublished ?
              <button data-ev-id="ev_22a5deb8f7"
              onClick={handleUnpublish}
              disabled={publishing}
              className="bg-surface-raised hover:bg-border-strong text-text font-medium px-5 py-2.5 rounded-[10px] flex items-center gap-2 transition-colors min-h-[44px] border border-border disabled:opacity-50">

                  {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Unpublish'}
                </button> :

              <button data-ev-id="ev_2eacfb4e7e"
              onClick={handlePublish}
              disabled={publishing}
              className="bg-primary hover:bg-primary-hover text-white font-medium px-5 py-2.5 rounded-[10px] flex items-center gap-2 transition-colors min-h-[44px] disabled:opacity-50">

                  {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Publish app'}
                </button>
              }
            </div>
          </div>

          {publishError &&
          <div data-ev-id="ev_9430ff2d44" className="mt-4 bg-destructive/10 border border-destructive/20 rounded-[10px] p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <p data-ev-id="ev_0675561603" className="text-sm text-destructive">{publishError}</p>
            </div>
          }
        </div>

        {/* App URL */}
        {appUrl &&
        <div data-ev-id="ev_bc48ea2c0a" className="bg-card border border-border rounded-[16px] p-6 mb-6">
            <div data-ev-id="ev_65c5c0d23a" className="flex items-center gap-3 mb-4">
              <LinkIcon className="w-5 h-5 text-primary" />
              <h3 data-ev-id="ev_ebd0124d3b" className="text-lg font-display font-bold text-text">App URL</h3>
            </div>

            <div data-ev-id="ev_e4f5801c56" className="flex items-center gap-3">
              <div data-ev-id="ev_a59f39f8e6" className="flex-1 bg-surface-raised border border-border rounded-[10px] px-4 py-3 font-mono text-sm text-text">
                {appUrl}
              </div>
              <button data-ev-id="ev_434dee9522"
            onClick={handleCopyLink}
            className="bg-surface-raised hover:bg-border-strong text-text font-medium px-4 py-3 rounded-[10px] flex items-center gap-2 transition-colors min-h-[44px] border border-border">

                {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <a data-ev-id="ev_e6f7d0ac85"
            href={appUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-surface-raised hover:bg-border-strong text-text font-medium px-4 py-3 rounded-[10px] flex items-center gap-2 transition-colors min-h-[44px] border border-border">

                <ExternalLink className="w-4 h-4" />
                Open
              </a>
            </div>
          </div>
        }

        {/* Installation Instructions */}
        <div data-ev-id="ev_f07811b4f1" className="bg-card border border-border rounded-[16px] p-6">
          <div data-ev-id="ev_c73328b6bf" className="flex items-center gap-3 mb-6">
            <Smartphone className="w-5 h-5 text-primary" />
            <h3 data-ev-id="ev_290042d924" className="text-lg font-display font-bold text-text">How to install</h3>
          </div>

          <div data-ev-id="ev_6536d33129" className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div data-ev-id="ev_2b21da0857" className="bg-surface-raised rounded-[12px] p-5">
              <h4 data-ev-id="ev_3825e45318" className="font-semibold text-text mb-3">iOS (Safari)</h4>
              <ol data-ev-id="ev_63ced1a81d" className="text-sm text-text-secondary flex flex-col gap-2">
                <li data-ev-id="ev_6dbe6672c4" className="flex items-start gap-2">
                  <span data-ev-id="ev_7ba93f83d8" className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
                  Open the app URL in Safari
                </li>
                <li data-ev-id="ev_32ac2ed064" className="flex items-start gap-2">
                  <span data-ev-id="ev_b8a68babc5" className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
                  Tap the Share button at the bottom
                </li>
                <li data-ev-id="ev_737b5bfe0c" className="flex items-start gap-2">
                  <span data-ev-id="ev_d714482589" className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
                  Select "Add to Home Screen"
                </li>
              </ol>
            </div>

            <div data-ev-id="ev_49d1285174" className="bg-surface-raised rounded-[12px] p-5">
              <h4 data-ev-id="ev_23135006ee" className="font-semibold text-text mb-3">Android (Chrome)</h4>
              <ol data-ev-id="ev_dcc20e70c9" className="text-sm text-text-secondary flex flex-col gap-2">
                <li data-ev-id="ev_0b8f328397" className="flex items-start gap-2">
                  <span data-ev-id="ev_81d3ce4568" className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
                  Open the app URL in Chrome
                </li>
                <li data-ev-id="ev_0c95e7f6df" className="flex items-start gap-2">
                  <span data-ev-id="ev_4421357bd2" className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
                  Tap the menu (three dots)
                </li>
                <li data-ev-id="ev_3a928103bf" className="flex items-start gap-2">
                  <span data-ev-id="ev_859657cd3f" className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
                  Select "Install app" or "Add to Home screen"
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>);

}