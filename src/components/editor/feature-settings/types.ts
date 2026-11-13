import type { Tables } from '@/integrations/supabase/helpers';

export type App = Tables<'apps'>;
export type AppFeature = Tables<'app_features'>;
export type FeatureLink = Tables<'feature_links'>;
export type FeatureRSSFeed = Tables<'feature_rss_feeds'>;
export type FeatureCustomPage = Tables<'feature_custom_pages'>;

export interface FeatureSettingsProps {
  app: App;
  feature: AppFeature;
  settings: Record<string, unknown>;
  onUpdateSettings: (settings: Partial<Record<string, unknown>>) => void;
}

export interface WebsitesSettingsData {
  theme: 'list' | 'grid' | 'capsule' | 'glass';
  layout: 'list' | 'grid';
  enableSearch: boolean;
  coverImageUrl?: string;
  colors: {
    background?: string;
    surface?: string;
    accentStart?: string;
    accentEnd?: string;
    text?: string;
    headerBackground?: string;
    headerText?: string;
    headerIcons?: string;
    headerSeparator?: string;
  };
}

export interface LinkItemData {
  id?: string;
  title: string;
  url: string;
  iconUrl?: string;
  openMode: 'in_app' | 'custom_tab' | 'external';
  showProgressBar: boolean;
  enablePullRefresh: boolean;
  allowDownloads: boolean;
  rememberSession: boolean;
  customUserAgent?: string;
  injectCookies?: string;
  customHeaders?: string;
}

export interface RSSFeedSettingsData {
  displayStyle: 'cards' | 'list' | 'magazine';
  showImages: boolean;
  showDate: boolean;
  showAuthor: boolean;
  excerptLength: number;
  refreshInterval: number;
}

export interface WeatherSettingsData {
  locationMode: 'auto' | 'manual';
  manualLocation?: string;
  units: 'celsius' | 'fahrenheit';
  showHourly: boolean;
  showDaily: boolean;
  showAlerts: boolean;
}

export interface AIChatSettingsData {
  systemPrompt: string;
  welcomeMessage: string;
  placeholder: string;
  enableHistory: boolean;
  maxMessages: number;
}

export interface IframeSettingsData {
  url: string;
  showNavBar: boolean;
  showProgressBar: boolean;
  enablePullRefresh: boolean;
  allowFullscreen: boolean;
  customCss?: string;
  customJs?: string;
}

export interface SocialMediaSettingsData {
  displayStyle: 'icons' | 'buttons' | 'list';
  platforms: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
    tiktok?: string;
    github?: string;
    website?: string;
  };
}

export interface PrivacyPolicySettingsData {
  appName: string;
  companyName: string;
  contactEmail: string;
  effectiveDate: string;
  collectsPersonalData: boolean;
  collectsLocationData: boolean;
  collectsDeviceInfo: boolean;
  usesAnalytics: boolean;
  usesAdvertising: boolean;
  sharesWithThirdParties: boolean;
}

export interface GamesSettingsData {
  selectedGames: string[];
  showHighScores: boolean;
  enableSound: boolean;
}

export interface AudioSettingsData {
  sourceType: 'rss' | 'manual';
  rssFeedUrl?: string;
  playerStyle: 'mini' | 'full';
  enableBackgroundPlayback: boolean;
  enableDownload: boolean;
  showArtwork: boolean;
}
