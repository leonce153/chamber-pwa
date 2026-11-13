import type { FeatureSettingsProps, AudioSettingsData } from './types';
import { Music, Rss, List, Maximize2, Download, Image, PlayCircle } from 'lucide-react';

export function AudioSettings({ settings, onUpdateSettings }: FeatureSettingsProps) {
  const audioSettings: AudioSettingsData = {
    sourceType: settings.sourceType as AudioSettingsData['sourceType'] ?? 'rss',
    rssFeedUrl: settings.rssFeedUrl as string | undefined,
    playerStyle: settings.playerStyle as AudioSettingsData['playerStyle'] ?? 'full',
    enableBackgroundPlayback: settings.enableBackgroundPlayback as boolean ?? true,
    enableDownload: settings.enableDownload as boolean ?? false,
    showArtwork: settings.showArtwork as boolean ?? true
  };

  return (
    <div data-ev-id="ev_3b28c642be" className="p-6 flex flex-col gap-8">
      {/* Source Type */}
      <section data-ev-id="ev_55422ab25f">
        <h3 data-ev-id="ev_2b5e8ecbf1" className="text-lg font-semibold text-text mb-2">Audio Source</h3>
        <p data-ev-id="ev_21d30a1066" className="text-sm text-muted mb-4">Choose how to load audio content.</p>
        
        <div data-ev-id="ev_a3502085f0" className="grid grid-cols-2 gap-4">
          <button data-ev-id="ev_5e3eb0361f"
          onClick={() => onUpdateSettings({ sourceType: 'rss' })}
          className={`p-4 rounded-xl border-2 text-left transition-colors ${
          audioSettings.sourceType === 'rss' ?
          'border-primary bg-primary/5' :
          'border-border hover:border-primary/50'}`
          }>

            <Rss className={`w-6 h-6 mb-2 ${
            audioSettings.sourceType === 'rss' ? 'text-primary' : 'text-muted'}`
            } />
            <p data-ev-id="ev_40791e9b34" className="font-medium text-text">Podcast RSS Feed</p>
            <p data-ev-id="ev_5309e37afb" className="text-xs text-muted mt-1">Load episodes from an RSS feed URL</p>
          </button>
          <button data-ev-id="ev_14325db594"
          onClick={() => onUpdateSettings({ sourceType: 'manual' })}
          className={`p-4 rounded-xl border-2 text-left transition-colors ${
          audioSettings.sourceType === 'manual' ?
          'border-primary bg-primary/5' :
          'border-border hover:border-primary/50'}`
          }>

            <List className={`w-6 h-6 mb-2 ${
            audioSettings.sourceType === 'manual' ? 'text-primary' : 'text-muted'}`
            } />
            <p data-ev-id="ev_3cf09d88a7" className="font-medium text-text">Manual Playlist</p>
            <p data-ev-id="ev_241c88c104" className="text-xs text-muted mt-1">Add audio files manually</p>
          </button>
        </div>
      </section>

      {/* RSS Feed URL */}
      {audioSettings.sourceType === 'rss' &&
      <section data-ev-id="ev_a9751c2d88">
          <h3 data-ev-id="ev_2760cfb2b3" className="text-lg font-semibold text-text mb-2">RSS Feed URL</h3>
          <p data-ev-id="ev_a89b4c3569" className="text-sm text-muted mb-4">Enter your podcast or audio RSS feed URL.</p>
          
          <input data-ev-id="ev_ce76475a58"
        type="url"
        value={audioSettings.rssFeedUrl ?? ''}
        onChange={(e) => onUpdateSettings({ rssFeedUrl: e.target.value || undefined })}
        className="w-full bg-input border border-border rounded-lg px-4 py-2.5 text-text placeholder:text-muted"
        placeholder="https://example.com/podcast/feed.xml" />

        </section>
      }

      {/* Player Style */}
      <section data-ev-id="ev_ba5b51466f">
        <h3 data-ev-id="ev_19c14a9fb8" className="text-lg font-semibold text-text mb-2">Player Style</h3>
        <p data-ev-id="ev_1a7becefa3" className="text-sm text-muted mb-4">Choose the audio player appearance.</p>
        
        <div data-ev-id="ev_0a410bf808" className="grid grid-cols-2 gap-4">
          <button data-ev-id="ev_f0d5cd6069"
          onClick={() => onUpdateSettings({ playerStyle: 'mini' })}
          className={`p-4 rounded-xl border-2 text-left transition-colors ${
          audioSettings.playerStyle === 'mini' ?
          'border-primary bg-primary/5' :
          'border-border hover:border-primary/50'}`
          }>

            <div data-ev-id="ev_43836a225e" className="h-16 bg-surface-elevated rounded-lg mb-3 flex items-center justify-center gap-3 px-4">
              <div data-ev-id="ev_4b5b6f6925" className="w-10 h-10 bg-primary/30 rounded-lg" />
              <div data-ev-id="ev_696fbb6956" className="flex-1 flex flex-col gap-1">
                <div data-ev-id="ev_9635ea9441" className="h-2 bg-primary/30 rounded w-3/4" />
                <div data-ev-id="ev_0b714ca6df" className="h-1.5 bg-primary/20 rounded w-1/2" />
              </div>
              <PlayCircle className="w-6 h-6 text-primary/50" />
            </div>
            <p data-ev-id="ev_3125b08b8b" className="font-medium text-text">Mini Player</p>
            <p data-ev-id="ev_9546e6ad52" className="text-xs text-muted mt-1">Compact bottom bar</p>
          </button>
          <button data-ev-id="ev_a67dc017b8"
          onClick={() => onUpdateSettings({ playerStyle: 'full' })}
          className={`p-4 rounded-xl border-2 text-left transition-colors ${
          audioSettings.playerStyle === 'full' ?
          'border-primary bg-primary/5' :
          'border-border hover:border-primary/50'}`
          }>

            <div data-ev-id="ev_fdea16d7f5" className="h-16 bg-surface-elevated rounded-lg mb-3 flex flex-col items-center justify-center gap-1">
              <div data-ev-id="ev_12b7b46ea3" className="w-8 h-8 bg-primary/30 rounded" />
              <div data-ev-id="ev_a88420f123" className="h-1 w-12 bg-primary/20 rounded" />
            </div>
            <p data-ev-id="ev_5af190eb73" className="font-medium text-text">Full Screen</p>
            <p data-ev-id="ev_f358e0163a" className="text-xs text-muted mt-1">Large album art & controls</p>
          </button>
        </div>
      </section>

      {/* Playback Options */}
      <section data-ev-id="ev_436c596e68">
        <h3 data-ev-id="ev_7d06c04e36" className="text-lg font-semibold text-text mb-4">Playback Options</h3>
        
        <div data-ev-id="ev_6c426012d7" className="flex flex-col gap-3">
          <label data-ev-id="ev_82fd4a605f" className="flex items-start gap-4 cursor-pointer p-4 bg-surface-elevated rounded-xl">
            <Music className="w-5 h-5 text-muted mt-0.5" />
            <div data-ev-id="ev_1d579bdfa0" className="flex-1">
              <span data-ev-id="ev_0f773599bf" className="text-text font-medium">Background Playback</span>
              <p data-ev-id="ev_2650913fe7" className="text-sm text-muted mt-0.5">Continue playing when app is minimized</p>
            </div>
            <div data-ev-id="ev_1b123c3083"
            onClick={() => onUpdateSettings({ enableBackgroundPlayback: !audioSettings.enableBackgroundPlayback })}
            className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
            audioSettings.enableBackgroundPlayback ? 'bg-primary' : 'bg-background'}`
            }>

              <div data-ev-id="ev_e43788d56b"
              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
              audioSettings.enableBackgroundPlayback ? 'translate-x-5' : 'translate-x-0.5'}`
              } />

            </div>
          </label>

          <label data-ev-id="ev_16b98ce3b7" className="flex items-start gap-4 cursor-pointer p-4 bg-surface-elevated rounded-xl">
            <Download className="w-5 h-5 text-muted mt-0.5" />
            <div data-ev-id="ev_723892b0cf" className="flex-1">
              <span data-ev-id="ev_192d2de9de" className="text-text font-medium">Allow Downloads</span>
              <p data-ev-id="ev_a8eaff53c4" className="text-sm text-muted mt-0.5">Let users download episodes for offline listening</p>
            </div>
            <div data-ev-id="ev_39d8de252b"
            onClick={() => onUpdateSettings({ enableDownload: !audioSettings.enableDownload })}
            className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
            audioSettings.enableDownload ? 'bg-primary' : 'bg-background'}`
            }>

              <div data-ev-id="ev_0ddc97b387"
              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
              audioSettings.enableDownload ? 'translate-x-5' : 'translate-x-0.5'}`
              } />

            </div>
          </label>

          <label data-ev-id="ev_72ccfa3c1d" className="flex items-start gap-4 cursor-pointer p-4 bg-surface-elevated rounded-xl">
            <Image className="w-5 h-5 text-muted mt-0.5" />
            <div data-ev-id="ev_6e6a134ee8" className="flex-1">
              <span data-ev-id="ev_01ef651a4a" className="text-text font-medium">Show Artwork</span>
              <p data-ev-id="ev_deee538319" className="text-sm text-muted mt-0.5">Display album/episode artwork</p>
            </div>
            <div data-ev-id="ev_cb0c8c7839"
            onClick={() => onUpdateSettings({ showArtwork: !audioSettings.showArtwork })}
            className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
            audioSettings.showArtwork ? 'bg-primary' : 'bg-background'}`
            }>

              <div data-ev-id="ev_d3e7640825"
              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
              audioSettings.showArtwork ? 'translate-x-5' : 'translate-x-0.5'}`
              } />

            </div>
          </label>
        </div>
      </section>
    </div>);

}