export interface Feature {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'portal' | 'community' | 'essentials' | 'engagement';
  tier: 'free' | 'pro';
  badge?: string;
  defaultUrl?: string; // Relative to base_portal_url
  embedType?: 'iframe' | 'link' | 'rss' | 'widget';
}

export const FEATURE_CATEGORIES = [
  { id: 'portal', label: 'Chamber Portal' },
  { id: 'community', label: 'Community & Events' },
  { id: 'engagement', label: 'Member Engagement' },
  { id: 'essentials', label: 'Essentials' },
] as const;

export const FEATURES: Feature[] = [
  // Chamber Portal Connectors
  {
    id: 'business-directory',
    name: 'Business Directory',
    description: 'Connect to your Chamber Portal\'s business directory listing page',
    icon: 'Building2',
    category: 'portal',
    tier: 'free',
    defaultUrl: '/business-directory',
    embedType: 'iframe',
  },
  {
    id: 'events-calendar',
    name: 'Events Calendar',
    description: 'Connect to your Chamber Portal\'s events and community calendar',
    icon: 'Calendar',
    category: 'portal',
    tier: 'free',
    defaultUrl: '/events',
    embedType: 'iframe',
  },
  {
    id: 'member-portal',
    name: 'Member Portal',
    description: 'Link to member login, registration, and virtual networking (GoBrunch)',
    icon: 'Users',
    category: 'portal',
    tier: 'free',
    defaultUrl: '/member-login',
    embedType: 'link',
  },
  {
    id: 'ai-concierge',
    name: 'AI Concierge',
    description: 'Embed or link to your Chamber Portal\'s AI assistant / chatbot widget',
    icon: 'MessageCircle',
    category: 'portal',
    tier: 'pro',
    defaultUrl: '/chat',
    embedType: 'widget',
  },
  // Community & Events
  {
    id: 'local-news',
    name: 'Local News & Announcements',
    description: 'RSS feed or link to local news, Chamber announcements, and updates',
    icon: 'Newspaper',
    category: 'community',
    tier: 'free',
    defaultUrl: '/news',
    embedType: 'rss',
  },
  {
    id: 'virtual-networking',
    name: 'Virtual Networking',
    description: 'Link to GoBrunch or virtual meeting room for member networking',
    icon: 'Video',
    category: 'community',
    tier: 'pro',
    embedType: 'link',
  },
  {
    id: 'sponsor-banner',
    name: 'Sponsor / Featured Business',
    description: 'Showcase a sponsor or featured business with image and link on the home screen',
    icon: 'Award',
    category: 'community',
    tier: 'free',
    embedType: 'link',
  },
  // Member Engagement
  {
    id: 'quick-links',
    name: 'Quick Links Grid',
    description: 'Customizable grid of external links to civic resources and portal sections',
    icon: 'Grid3x3',
    category: 'engagement',
    tier: 'free',
    embedType: 'link',
  },
  {
    id: 'websites',
    name: 'External Links',
    description: 'Add links to external websites, resources, and partner sites',
    icon: 'Globe',
    category: 'engagement',
    tier: 'free',
    embedType: 'link',
  },
  {
    id: 'social-media',
    name: 'Social Media',
    description: 'Links to Chamber social media profiles (Facebook, Instagram, etc.)',
    icon: 'Share2',
    category: 'engagement',
    tier: 'free',
    embedType: 'link',
  },
  // Essentials
  {
    id: 'weather',
    name: 'Weather Widget',
    description: 'Local weather forecast for your community',
    icon: 'CloudSun',
    category: 'essentials',
    tier: 'free',
    embedType: 'widget',
  },
  {
    id: 'privacy-policy',
    name: 'Privacy Policy',
    description: 'Required for App Store and Play Store compliance',
    icon: 'Shield',
    category: 'essentials',
    tier: 'free',
    embedType: 'link',
  },
  {
    id: 'custom-page',
    name: 'Custom Page',
    description: 'Create custom content pages (About, FAQ, Contact, etc.)',
    icon: 'FileText',
    category: 'essentials',
    tier: 'free',
    embedType: 'link',
  },
  {
    id: 'iframe',
    name: 'Embed (iFrame)',
    description: 'Embed any external page, map, or widget inside the app',
    icon: 'Monitor',
    category: 'essentials',
    tier: 'pro',
    embedType: 'iframe',
  },
];

export const FONT_CATEGORIES = [
  { id: 'serif', label: 'Serif', count: 6 },
  { id: 'sans-serif', label: 'Sans Serif', count: 16 },
  { id: 'display', label: 'Display', count: 5 },
  { id: 'handwriting', label: 'Handwriting', count: 6 },
  { id: 'monospace', label: 'Monospace', count: 5 },
] as const;

export const FONTS = [
  { name: 'System Default', family: 'system-ui', category: 'sans-serif' },
  { name: 'Inter', family: 'Inter', category: 'sans-serif' },
  { name: 'Jost', family: 'Jost', category: 'sans-serif' },
  { name: 'Montserrat', family: 'Montserrat', category: 'sans-serif' },
  { name: 'Open Sans', family: 'Open Sans', category: 'sans-serif' },
  { name: 'Lato', family: 'Lato', category: 'sans-serif' },
  { name: 'Roboto', family: 'Roboto', category: 'sans-serif' },
  { name: 'Poppins', family: 'Poppins', category: 'sans-serif' },
  { name: 'Playfair Display', family: 'Playfair Display', category: 'serif' },
  { name: 'Merriweather', family: 'Merriweather', category: 'serif' },
  { name: 'Lora', family: 'Lora', category: 'serif' },
  { name: 'Georgia', family: 'Georgia', category: 'serif' },
  { name: 'Fira Code', family: 'Fira Code', category: 'monospace' },
  { name: 'JetBrains Mono', family: 'JetBrains Mono', category: 'monospace' },
  { name: 'Source Code Pro', family: 'Source Code Pro', category: 'monospace' },
] as const;

export const LAYOUT_TEMPLATES = [
  { id: 'blank', name: 'Blank Template', preview: 'blank' },
  { id: 'grid-6', name: 'Grid 6 Icons', preview: 'grid' },
] as const;

// Default bottom navigation tabs for Chamber Portal PWA
export const DEFAULT_NAV_TABS = [
  { id: 'home', label: 'Home', icon: 'Home', isDefault: true },
  { id: 'directory', label: 'Directory', icon: 'Building2', featureId: 'business-directory' },
  { id: 'events', label: 'Events', icon: 'Calendar', featureId: 'events-calendar' },
  { id: 'chat', label: 'Concierge', icon: 'MessageCircle', featureId: 'ai-concierge' },
  { id: 'member', label: 'Member', icon: 'Users', featureId: 'member-portal' },
] as const;
