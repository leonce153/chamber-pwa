import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { FeatureSettingsProps, RSSFeedSettingsData } from './types';
import {
  Plus,
  GripVertical,
  Trash2,
  Settings,
  Rss,
  Loader2,
  LayoutGrid,
  List,
  Newspaper,
  Eye,
  Calendar,
  User } from
'lucide-react';

interface RSSFeedRow {
  id: string;
  feature_id: string;
  title: string;
  feed_url: string;
  max_items: number | null;
  show_images: boolean | null;
  show_date: boolean | null;
  show_author: boolean | null;
  excerpt_length: number | null;
  position: number | null;
  created_at: string;
  updated_at: string;
}

export function RSSFeedSettings({ app, feature, settings, onUpdateSettings }: FeatureSettingsProps) {
  const [feeds, setFeeds] = useState<RSSFeedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddFeed, setShowAddFeed] = useState(false);
  const [newFeed, setNewFeed] = useState({ title: '', feedUrl: '' });
  const [saving, setSaving] = useState(false);

  const rssSettings: RSSFeedSettingsData = {
    displayStyle: settings.displayStyle as RSSFeedSettingsData['displayStyle'] ?? 'cards',
    showImages: settings.showImages as boolean ?? true,
    showDate: settings.showDate as boolean ?? true,
    showAuthor: settings.showAuthor as boolean ?? false,
    excerptLength: settings.excerptLength as number ?? 150,
    refreshInterval: settings.refreshInterval as number ?? 30
  };

  useEffect(() => {
    const loadFeeds = async () => {
      if (!supabase) return;
      
      const { data } = await supabase
        .from('feature_rss_feeds')
        .select('*')
        .eq('feature_id', feature.id)
        .order('position');
      
      setFeeds((data as RSSFeedRow[]) ?? []);
      setLoading(false);
    };
    loadFeeds();
  }, [feature.id]);

  const fetchFeeds = async () => {
    if (!supabase) return;

    const { data } = await supabase.
    from('feature_rss_feeds').
    select('*').
    eq('feature_id', feature.id).
    order('position');

    setFeeds(data as RSSFeedRow[] ?? []);
    setLoading(false);
  };

  const addFeed = async () => {
    if (!supabase || !newFeed.title.trim() || !newFeed.feedUrl.trim()) return;
    setSaving(true);

    const { data } = await supabase.
    from('feature_rss_feeds').
    insert({
      feature_id: feature.id,
      title: newFeed.title,
      feed_url: newFeed.feedUrl,
      max_items: 20,
      show_images: rssSettings.showImages,
      show_date: rssSettings.showDate,
      show_author: rssSettings.showAuthor,
      excerpt_length: rssSettings.excerptLength,
      position: feeds.length
    }).
    select().
    single();

    if (data) {
      setFeeds([...feeds, data as RSSFeedRow]);
      setNewFeed({ title: '', feedUrl: '' });
      setShowAddFeed(false);
    }
    setSaving(false);
  };

  const deleteFeed = async (feedId: string) => {
    if (!supabase || !confirm('Delete this feed?')) return;
    await supabase.from('feature_rss_feeds').delete().eq('id', feedId);
    setFeeds(feeds.filter((f) => f.id !== feedId));
  };

  const displayStyles = [
  { id: 'cards' as const, name: 'Cards', icon: LayoutGrid, description: 'Large cards with images' },
  { id: 'list' as const, name: 'List', icon: List, description: 'Compact list view' },
  { id: 'magazine' as const, name: 'Magazine', icon: Newspaper, description: 'Editorial layout' }];


  return (
    <div data-ev-id="ev_3b2d99d968" className="p-6 flex flex-col gap-8">
      {/* Display Style */}
      <section data-ev-id="ev_a94f302cb2">
        <h3 data-ev-id="ev_bf181ba792" className="text-lg font-semibold text-text mb-2">Display Style</h3>
        <p data-ev-id="ev_097f59f031" className="text-sm text-muted mb-4">Choose how RSS articles are displayed.</p>
        
        <div data-ev-id="ev_740b6aa876" className="grid grid-cols-3 gap-4">
          {displayStyles.map((style) =>
          <button data-ev-id="ev_2b470d24d9"
          key={style.id}
          onClick={() => onUpdateSettings({ displayStyle: style.id })}
          className={`p-4 rounded-xl border-2 text-left transition-colors ${
          rssSettings.displayStyle === style.id ?
          'border-primary bg-primary/5' :
          'border-border hover:border-primary/50'}`
          }>

              <style.icon className={`w-6 h-6 mb-2 ${
            rssSettings.displayStyle === style.id ? 'text-primary' : 'text-muted'}`
            } />
              <p data-ev-id="ev_f227a9a245" className="font-medium text-text">{style.name}</p>
              <p data-ev-id="ev_9e72ce50c1" className="text-xs text-muted mt-1">{style.description}</p>
            </button>
          )}
        </div>
      </section>

      {/* Display Options */}
      <section data-ev-id="ev_86319b2c27">
        <h3 data-ev-id="ev_eb8ac18661" className="text-lg font-semibold text-text mb-4">Display Options</h3>
        
        <div data-ev-id="ev_c438076761" className="grid grid-cols-2 gap-4">
          {[
          { key: 'showImages', label: 'Show Images', icon: Eye },
          { key: 'showDate', label: 'Show Date', icon: Calendar },
          { key: 'showAuthor', label: 'Show Author', icon: User }].
          map(({ key, label, icon: Icon }) =>
          <label data-ev-id="ev_fc2951bd1a" key={key} className="flex items-center gap-3 cursor-pointer p-3 bg-surface-elevated rounded-lg">
              <Icon className="w-5 h-5 text-muted" />
              <span data-ev-id="ev_c163ac8721" className="flex-1 text-text">{label}</span>
              <div data-ev-id="ev_e7ac5b5c88"
            onClick={() => onUpdateSettings({ [key]: !rssSettings[key as keyof RSSFeedSettingsData] })}
            className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
            rssSettings[key as keyof RSSFeedSettingsData] ? 'bg-primary' : 'bg-background'}`
            }>

                <div data-ev-id="ev_43af099500"
              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
              rssSettings[key as keyof RSSFeedSettingsData] ? 'translate-x-5' : 'translate-x-0.5'}`
              } />

              </div>
            </label>
          )}
        </div>
      </section>

      {/* Excerpt Length */}
      <section data-ev-id="ev_976b1beb46">
        <h3 data-ev-id="ev_da88025e90" className="text-lg font-semibold text-text mb-2">Excerpt Length</h3>
        <p data-ev-id="ev_39571af13a" className="text-sm text-muted mb-4">Number of characters to show for article previews.</p>
        
        <div data-ev-id="ev_ebf4d8f5fc" className="flex items-center gap-4">
          <input data-ev-id="ev_02295b75a0"
          type="range"
          min="50"
          max="500"
          step="10"
          value={rssSettings.excerptLength}
          onChange={(e) => onUpdateSettings({ excerptLength: parseInt(e.target.value) })}
          className="flex-1" />

          <span data-ev-id="ev_ff4d9a7b0d" className="text-text font-medium w-20 text-right">
            {rssSettings.excerptLength} chars
          </span>
        </div>
      </section>

      {/* Refresh Interval */}
      <section data-ev-id="ev_ff533530dc">
        <h3 data-ev-id="ev_224891e39c" className="text-lg font-semibold text-text mb-2">Refresh Interval</h3>
        <p data-ev-id="ev_1bfd765564" className="text-sm text-muted mb-4">How often to check for new articles (in minutes).</p>
        
        <select data-ev-id="ev_5708e7e1ce"
        value={rssSettings.refreshInterval}
        onChange={(e) => onUpdateSettings({ refreshInterval: parseInt(e.target.value) })}
        className="w-full bg-input border border-border rounded-lg px-4 py-2.5 text-text">

          <option data-ev-id="ev_2bd92590a2" value={15}>15 minutes</option>
          <option data-ev-id="ev_4a693ec86a" value={30}>30 minutes</option>
          <option data-ev-id="ev_2aaf01c874" value={60}>1 hour</option>
          <option data-ev-id="ev_b6b198488a" value={120}>2 hours</option>
          <option data-ev-id="ev_1152a4d56f" value={360}>6 hours</option>
          <option data-ev-id="ev_ae01fe8942" value={720}>12 hours</option>
          <option data-ev-id="ev_4f4ac6cc5d" value={1440}>24 hours</option>
        </select>
      </section>

      {/* Feeds */}
      <section data-ev-id="ev_5f80d00d6a">
        <div data-ev-id="ev_f92166212f" className="flex items-center justify-between mb-4">
          <h3 data-ev-id="ev_8aa5d357d5" className="text-lg font-semibold text-text">RSS Feeds</h3>
          <button data-ev-id="ev_9110002f11"
          onClick={() => setShowAddFeed(true)}
          className="flex items-center gap-2 px-4 py-2 bg-success hover:bg-success/90 text-white font-medium rounded-lg transition-colors">

            <Plus className="w-4 h-4" />
            Add Feed
          </button>
        </div>

        {loading ?
        <div data-ev-id="ev_24fd6fb4ce" className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div> :
        feeds.length === 0 ?
        <div data-ev-id="ev_8e5aa57383" className="bg-surface-elevated border border-border rounded-xl p-8 text-center">
            <Rss className="w-12 h-12 text-muted mx-auto mb-3" />
            <p data-ev-id="ev_66941a6c3a" className="text-text font-medium mb-1">No feeds yet</p>
            <p data-ev-id="ev_c653ed406f" className="text-sm text-muted">Add an RSS feed to get started</p>
          </div> :

        <div data-ev-id="ev_aa3d00f503" className="flex flex-col gap-3">
            {feeds.map((feed) =>
          <div data-ev-id="ev_f486cc57a7"
          key={feed.id}
          className="bg-surface-elevated border border-border rounded-xl p-4">

                <div data-ev-id="ev_1c90e0a31d" className="flex items-center gap-4">
                  <button data-ev-id="ev_8f55921308" className="text-muted hover:text-text cursor-grab">
                    <GripVertical className="w-5 h-5" />
                  </button>
                  
                  <div data-ev-id="ev_c84049483f" className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                    <Rss className="w-5 h-5 text-orange-500" />
                  </div>

                  <div data-ev-id="ev_bcdd55cdd7" className="flex-1 min-w-0">
                    <p data-ev-id="ev_637664703b" className="font-medium text-text truncate">{feed.title}</p>
                    <p data-ev-id="ev_f5bac38613" className="text-sm text-muted truncate">{feed.feed_url}</p>
                  </div>

                  <span data-ev-id="ev_2d40a2f610" className="text-xs font-medium px-2 py-1 rounded bg-primary/20 text-primary">
                    {feed.max_items ?? 20} items
                  </span>

                  <button data-ev-id="ev_5c18e500fd"
              onClick={() => deleteFeed(feed.id)}
              className="p-2 text-muted hover:text-destructive bg-background hover:bg-destructive/10 rounded-lg transition-colors">

                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
          )}
          </div>
        }

        {/* Add Feed Modal */}
        {showAddFeed &&
        <div data-ev-id="ev_4bf4df2813" className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div data-ev-id="ev_fe486a2959" className="bg-surface border border-border rounded-xl w-full max-w-md p-6">
              <h3 data-ev-id="ev_359663124b" className="text-lg font-semibold text-text mb-4">Add RSS Feed</h3>
              
              <div data-ev-id="ev_350be990c7" className="flex flex-col gap-4 mb-6">
                <div data-ev-id="ev_fb28735d42">
                  <label data-ev-id="ev_1587ba4155" className="block text-sm font-medium text-text mb-1.5">Feed Title</label>
                  <input data-ev-id="ev_f73feddcde"
                type="text"
                value={newFeed.title}
                onChange={(e) => setNewFeed({ ...newFeed, title: e.target.value })}
                className="w-full bg-input border border-border rounded-lg px-4 py-2.5 text-text placeholder:text-muted"
                placeholder="My Blog" />

                </div>
                <div data-ev-id="ev_a0193221f8">
                  <label data-ev-id="ev_8afea0292c" className="block text-sm font-medium text-text mb-1.5">Feed URL</label>
                  <input data-ev-id="ev_e1c661fb3f"
                type="url"
                value={newFeed.feedUrl}
                onChange={(e) => setNewFeed({ ...newFeed, feedUrl: e.target.value })}
                className="w-full bg-input border border-border rounded-lg px-4 py-2.5 text-text placeholder:text-muted"
                placeholder="https://example.com/feed.xml" />

                </div>
              </div>

              <div data-ev-id="ev_21215f6b16" className="flex justify-end gap-3">
                <button data-ev-id="ev_74c195c539"
              onClick={() => {
                setShowAddFeed(false);
                setNewFeed({ title: '', feedUrl: '' });
              }}
              className="px-4 py-2 text-muted hover:text-text font-medium">

                  Cancel
                </button>
                <button data-ev-id="ev_7b212abb63"
              onClick={addFeed}
              disabled={saving || !newFeed.title.trim() || !newFeed.feedUrl.trim()}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-white font-medium rounded-lg disabled:opacity-50 flex items-center gap-2">

                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Add Feed
                </button>
              </div>
            </div>
          </div>
        }
      </section>
    </div>);

}