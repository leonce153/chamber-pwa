import { useState } from 'react';
import type { Tables } from '@/integrations/supabase/helpers';
import { FeatureContentPreview } from './FeatureContentPreview';
import {
  Globe,
  CloudSun,
  Layers,
  Facebook,
  User,
  Rss,
  Music,
  Image,
  MessageSquare,
  Gamepad2,
  Shield,
  FileText,
  Link,
  Code,
  X,
  ChevronLeft,
  RefreshCw,
  Loader2,
  Building2,
  Calendar,
  MessageCircle,
  Users,
  Video,
  Newspaper,
  Award,
  Grid3x3,
  Share2,
  Monitor } from
'lucide-react';

type App = Tables<'apps'>;
type AppFeature = Tables<'app_features'>;

interface PhonePreviewProps {
  app: App;
  features: AppFeature[];
}

const iconMap: Record<string, React.ComponentType<{className?: string;}>> = {
  Globe,
  CloudSun,
  Layers,
  Facebook,
  User,
  Rss,
  Music,
  Image,
  MessageSquare,
  Gamepad2,
  Shield,
  FileText,
  Link,
  Code,
  Building2,
  Calendar,
  MessageCircle,
  Users,
  Video,
  Newspaper,
  Award,
  Grid3x3,
  Share2,
  Monitor
};

export function PhonePreview({ app, features }: PhonePreviewProps) {
  const [activeFeature, setActiveFeature] = useState<AppFeature | null>(null);
  const [activeInAppLink, setActiveInAppLink] = useState<{
    title: string;
    url: string;
    show_progress_bar?: boolean | null;
  } | null>(null);
  const [iframeLoading, setIframeLoading] = useState(false);
  const enabledFeatures = features.filter((f) => f.is_enabled);

  return (
    <div data-ev-id="ev_97de667606" className="relative">
      {/* Phone Frame */}
      <div data-ev-id="ev_ebcd16899e" className="w-72 h-[580px] bg-white rounded-[3rem] shadow-2xl overflow-hidden border-8 border-gray-800 relative">
        {/* Notch */}
        <div data-ev-id="ev_3f3e0ba2d2" className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-gray-800 rounded-b-2xl z-10" />

        {/* Status Bar */}
        <div data-ev-id="ev_e0108c558e" className="h-12 bg-gray-100 flex items-center justify-between px-6 pt-2">
          <span data-ev-id="ev_86260a4fa5" className="text-xs font-medium text-gray-800">18:07</span>
          <div data-ev-id="ev_e773a81e07" className="flex items-center gap-1">
            <div data-ev-id="ev_04fd0df7b0" className="w-4 h-3 border border-gray-800 rounded-sm relative">
              <div data-ev-id="ev_d02ca444e8" className="absolute inset-0.5 bg-gray-800 rounded-sm" style={{ width: '70%' }} />
            </div>
          </div>
        </div>

        {/* App Content */}
        <div data-ev-id="ev_bf40fca1a4"
        className="h-full flex flex-col"
        style={{ backgroundColor: app.background_color ?? '#0f172a' }}>

          {/* App Logo/Image Area */}
          <div data-ev-id="ev_4560e53e76" className="flex-1 flex flex-col items-center justify-center px-6">
            {app.homepage_image_url ?
            <img data-ev-id="ev_8258a68492"
            src={app.homepage_image_url}
            alt={app.name}
            className="w-32 h-32 object-contain rounded-2xl" /> :


            <div data-ev-id="ev_08039302f2"
            className="w-32 h-32 rounded-2xl flex items-center justify-center text-4xl font-bold"
            style={{ backgroundColor: (app.theme_color ?? '#B8956B') + '40', color: app.theme_color ?? '#B8956B' }}>

                {app.name.charAt(0).toUpperCase()}
              </div>
            }
            <h2 data-ev-id="ev_1711a480b7"
            className="text-xl font-bold mt-4 text-center"
            style={{ color: app.text_color ?? '#ffffff' }}>

              {app.name.toUpperCase()}
            </h2>
          </div>

          {/* Feature Icons Grid */}
          <div data-ev-id="ev_99f8a1fcf3" className="p-6">
            <div data-ev-id="ev_2ab77e15ef" className="grid grid-cols-3 gap-4">
              {enabledFeatures.slice(0, 6).map((feature) => {
                const IconComponent = iconMap[feature.icon ?? 'Globe'] ?? Globe;
                return (
                  <button data-ev-id="ev_fc05b27e82"
                  key={feature.id}
                  onClick={() => setActiveFeature(feature)}
                  className="flex flex-col items-center gap-2 p-3 rounded-2xl transition-all hover:bg-white/10 active:scale-95">

                    <div data-ev-id="ev_88cbcb3875"
                    className="w-14 h-14 rounded-2xl flex items-center justify-center"
                    style={{ backgroundColor: (app.theme_color ?? '#B8956B') + '30' }}>

                      <IconComponent
                        className="w-7 h-7"
                        style={{ color: app.theme_color ?? '#B8956B' }} />

                    </div>
                    {app.icon_titles_visible &&
                    <span data-ev-id="ev_ae2b9b4a80"
                    className="text-xs font-medium text-center truncate w-full"
                    style={{ color: app.text_color ?? '#ffffff' }}>

                        {feature.name.length > 10 ? feature.name.slice(0, 10) + '...' : feature.name}
                      </span>
                    }
                  </button>);

              })}
            </div>
          </div>

          {/* Home Indicator */}
          <div data-ev-id="ev_f4ae8c64d6" className="pb-2 flex justify-center">
            <div data-ev-id="ev_6b85f44e83" className="w-32 h-1 bg-white/30 rounded-full" />
          </div>

          {/* Feature Content Modal */}
          {activeFeature &&
          <div data-ev-id="ev_29ae195f57"
          className="absolute inset-0 flex flex-col z-20"
          style={{ backgroundColor: app.background_color ?? '#0f172a' }}>

              {/* Modal Header */}
              <div data-ev-id="ev_6d438cb621" className="flex items-center gap-3 p-4 pt-14">
                <button data-ev-id="ev_88e4af7fe4"
              onClick={() => setActiveFeature(null)}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">

                  <ChevronLeft className="w-5 h-5" style={{ color: app.text_color ?? '#ffffff' }} />
                </button>
                <h3 data-ev-id="ev_5932f7bdb8" className="font-semibold text-lg" style={{ color: app.text_color ?? '#ffffff' }}>
                  {activeFeature.name}
                </h3>
                <button data-ev-id="ev_f89c8c554b"
              onClick={() => setActiveFeature(null)}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors ml-auto">

                  <X className="w-4 h-4" style={{ color: app.text_color ?? '#ffffff' }} />
                </button>
              </div>

              {/* Modal Content */}
              <div data-ev-id="ev_a2b66bf6fb" className="flex-1 overflow-y-auto px-4 pb-4">
                <FeatureContentPreview
                app={app}
                feature={activeFeature}
                onOpenInAppBrowser={(link) => {
                  setIframeLoading(true);
                  setActiveInAppLink(link);
                }} />

              </div>
            </div>
          }

          {/* In-App Browser Overlay */}
          {activeInAppLink &&
          <div data-ev-id="ev_phone_inapp_browser" className="absolute inset-0 flex flex-col z-30" style={{ backgroundColor: app.background_color ?? '#0f172a' }}>
              {/* Browser toolbar */}
              <div data-ev-id="ev_99d5a5f395" className="flex items-center gap-2 px-3 py-2 pt-12 border-b" style={{ borderColor: (app.theme_color ?? '#B8956B') + '40' }}>
                <button data-ev-id="ev_d6d2ef03ed"
              onClick={() => setActiveInAppLink(null)}
              className="p-1.5 rounded-lg transition-colors hover:bg-white/10">
                  <ChevronLeft className="w-5 h-5" style={{ color: app.text_color ?? '#ffffff' }} />
                </button>
                <div data-ev-id="ev_1a521eff72" className="flex-1 min-w-0">
                  <p data-ev-id="ev_28bfe73fb1" className="text-xs font-medium truncate" style={{ color: app.text_color ?? '#ffffff' }}>
                    {activeInAppLink.title}
                  </p>
                  <p data-ev-id="ev_0fc689b425" className="text-[10px] truncate opacity-60" style={{ color: app.text_color ?? '#ffffff' }}>
                    {activeInAppLink.url}
                  </p>
                </div>
                <button data-ev-id="ev_4dcc511eb2"
              onClick={() => {
                setIframeLoading(true);
                const iframe = document.querySelector('#phone-in-app-iframe') as HTMLIFrameElement;
                if (iframe) iframe.src = activeInAppLink.url;
              }}
              className="p-1.5 rounded-lg transition-colors hover:bg-white/10">
                  <RefreshCw className="w-4 h-4" style={{ color: app.text_color ?? '#ffffff' }} />
                </button>
                <button data-ev-id="ev_9baa5a6856"
              onClick={() => setActiveInAppLink(null)}
              className="p-1.5 rounded-lg transition-colors hover:bg-white/10">
                  <X className="w-4 h-4" style={{ color: app.text_color ?? '#ffffff' }} />
                </button>
              </div>
              
              {/* Progress bar */}
              {iframeLoading && activeInAppLink.show_progress_bar !== false &&
            <div data-ev-id="ev_d6a228ad3a" className="h-0.5 animate-pulse" style={{ backgroundColor: app.theme_color ?? '#B8956B' }} />
            }
              
              {/* Iframe content */}
              <div data-ev-id="ev_8acf901096" className="flex-1 relative bg-white">
                <iframe data-ev-id="ev_5cb7077704"
              id="phone-in-app-iframe"
              src={activeInAppLink.url}
              className="absolute inset-0 w-full h-full border-0"
              onLoad={() => setIframeLoading(false)}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              title={activeInAppLink.title} />
                {iframeLoading &&
              <div data-ev-id="ev_b2b46ac0b1" className="absolute inset-0 flex items-center justify-center bg-white">
                    <Loader2 className="w-8 h-8 animate-spin" style={{ color: app.theme_color ?? '#B8956B' }} />
                  </div>
              }
              </div>
            </div>
          }
        </div>
      </div>
    </div>);

}