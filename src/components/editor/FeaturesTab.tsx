import { useState } from 'react';
import type { Tables } from '@/integrations/supabase/helpers';
import { FEATURES, FEATURE_CATEGORIES, type Feature } from '@/data/features';
import { FeatureSettingsModal } from './feature-settings/FeatureSettingsModal';
import {
  Search,
  Plus,
  Settings,
  Eye,
  Trash2,
  GripVertical,
  Check,
  X,
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
} from 'lucide-react';

type App = Tables<'apps'>;
type AppFeature = Tables<'app_features'>;

interface FeaturesTabProps {
  app: App;
  features: AppFeature[];
  onAddFeature: (feature: Omit<AppFeature, 'id' | 'app_id' | 'created_at' | 'updated_at'>) => void;
  onRemoveFeature: (featureId: string) => void;
  onUpdateFeature: (featureId: string, updates: Partial<AppFeature>) => void;
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

export function FeaturesTab({
  app,
  features,
  onAddFeature,
  onRemoveFeature,
  onUpdateFeature
}: FeaturesTabProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingFeature, setEditingFeature] = useState<AppFeature | null>(null);

  const enabledFeatures = features.filter((f) => f.is_enabled);

  return (
    <div data-ev-id="ev_8c89371808" className="max-w-4xl">
      {/* Current Features */}
      <section data-ev-id="ev_b0747880ee" className="mb-8">
        <div data-ev-id="ev_6dc43234fe" className="flex items-center justify-between mb-4">
          <div data-ev-id="ev_b25b056bb7" className="flex items-center gap-2">
            <h2 data-ev-id="ev_b76e5e570b" className="text-lg font-semibold text-text">Features</h2>
            <span data-ev-id="ev_aa7ba3681d" className="bg-primary/20 text-primary text-sm font-medium px-2 py-0.5 rounded-full">
              {enabledFeatures.length}
            </span>
          </div>
          <button data-ev-id="ev_479ef390c6"
          onClick={() => setShowAddModal(true)}
          className="bg-success hover:bg-success/90 text-white font-medium px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">

            <Plus className="w-4 h-4" />
            Add Feature
          </button>
        </div>

        {features.length === 0 ?
        <div data-ev-id="ev_290c509bbb" className="bg-surface border border-border rounded-xl p-12 text-center">
            <Layers className="w-12 h-12 text-muted mx-auto mb-4" />
            <h3 data-ev-id="ev_7baf6626e8" className="text-lg font-medium text-text mb-2">No features yet</h3>
            <p data-ev-id="ev_dfb3350136" className="text-muted mb-4">Add features to build your app</p>
            <button data-ev-id="ev_7d81238cb2"
          onClick={() => setShowAddModal(true)}
          className="bg-primary hover:bg-primary-hover text-white font-medium px-6 py-2 rounded-lg inline-flex items-center gap-2 transition-colors">

              <Plus className="w-4 h-4" />
              Add Feature
            </button>
          </div> :

        <div data-ev-id="ev_38ef060dda" className="flex flex-col gap-3">
            {features.map((feature) => {
            const IconComponent = iconMap[feature.icon ?? 'Globe'] ?? Globe;
            const templateFeature = FEATURES.find((f) => f.id === feature.feature_type);

            return (
              <div data-ev-id="ev_64cb8df65a"
              key={feature.id}
              className="bg-surface border border-border rounded-xl p-4 flex items-center gap-4 hover:border-primary/30 transition-colors">

                  <button data-ev-id="ev_1b2408cee0" className="text-muted hover:text-text cursor-grab">
                    <GripVertical className="w-5 h-5" />
                  </button>
                  
                  <div data-ev-id="ev_dc3cc51a21"
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: (app.theme_color ?? '#B8956B') + '20' }}>

                    <IconComponent className="w-6 h-6" style={{ color: app.theme_color ?? '#B8956B' }} />
                  </div>

                  <div data-ev-id="ev_14d4310be1" className="flex-1">
                    <div data-ev-id="ev_dfcbe91937" className="flex items-center gap-2 mb-1">
                      <h3 data-ev-id="ev_62bbaa8e6d" className="font-medium text-text">{feature.name}</h3>
                      {feature.is_enabled &&
                    <Check className="w-4 h-4 text-success" />
                    }
                    </div>
                    <p data-ev-id="ev_3b0b1f378d" className="text-sm text-muted">
                      {templateFeature?.description ?? 'Custom feature'}
                    </p>
                  </div>

                  <div data-ev-id="ev_50d223de45" className="flex items-center gap-2">
                    <button data-ev-id="ev_1c4e021251"
                  onClick={() => setEditingFeature(feature)}
                  className="p-2 text-muted hover:text-text bg-surface-elevated hover:bg-border rounded-lg transition-colors"
                  title="Settings">

                      <Settings className="w-5 h-5" />
                    </button>
                    <button data-ev-id="ev_c1bf3006ad"
                  onClick={() => onUpdateFeature(feature.id, { is_enabled: !feature.is_enabled })}
                  className={`p-2 rounded-lg transition-colors ${
                  feature.is_enabled ?
                  'text-success bg-success/10 hover:bg-success/20' :
                  'text-muted bg-surface-elevated hover:bg-border'}`
                  }
                  title={feature.is_enabled ? 'Disable' : 'Enable'}>

                      <Eye className="w-5 h-5" />
                    </button>
                    <button data-ev-id="ev_f5142c07f9"
                  onClick={() => onRemoveFeature(feature.id)}
                  className="p-2 text-muted hover:text-destructive bg-surface-elevated hover:bg-destructive/10 rounded-lg transition-colors"
                  title="Delete">

                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>);

          })}
          </div>
        }
      </section>

      {/* Add Feature Modal */}
      {showAddModal && (
        <AddFeatureModal
          existingFeatures={features}
          onClose={() => setShowAddModal(false)}
          onAdd={(feature) => {
            onAddFeature({
              feature_type: feature.id,
              name: feature.name,
              icon: feature.icon,
              is_enabled: true,
              position: features.length,
              settings: {}
            });
          }}
        />
      )}

      {/* Feature Settings Modal */}
      {editingFeature && (
        <FeatureSettingsModal
          app={app}
          feature={editingFeature}
          onClose={() => setEditingFeature(null)}
          onUpdate={(settings) => {
            onUpdateFeature(editingFeature.id, { settings: settings as AppFeature['settings'] });
            setEditingFeature(null);
          }}
        />
      )}
    </div>);

}

function AddFeatureModal({
  existingFeatures,
  onClose,
  onAdd




}: {existingFeatures: AppFeature[];onClose: () => void;onAdd: (feature: Feature) => void;}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const existingIds = new Set(existingFeatures.map((f) => f.feature_type));

  const filteredFeatures = FEATURES.filter((feature) => {
    const matchesSearch = feature.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    feature.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || feature.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div data-ev-id="ev_cb4d51eca4" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div data-ev-id="ev_2f3c91a12c" className="bg-surface border border-border rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div data-ev-id="ev_9a5c419c6e" className="flex items-center justify-between p-6 border-b border-border">
          <div data-ev-id="ev_0204732e04" className="flex items-center gap-2">
            <h2 data-ev-id="ev_aa72abe3fb" className="text-xl font-semibold text-text">Add Features</h2>
            <span data-ev-id="ev_e8e700d06e" className="bg-primary/20 text-primary text-sm font-medium px-2 py-0.5 rounded-full">
              {FEATURES.length}
            </span>
          </div>
          <button data-ev-id="ev_177e404324" onClick={onClose} className="text-muted hover:text-text transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search & Filters */}
        <div data-ev-id="ev_e80b5a3f2e" className="p-4 border-b border-border">
          <div data-ev-id="ev_9aef385597" className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
            <input data-ev-id="ev_ce8f56491e"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search pages..."
            className="w-full bg-input border border-border rounded-lg pl-10 pr-4 py-2.5 text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary" />

          </div>
          <div data-ev-id="ev_92d0c45bfb" className="flex flex-wrap gap-2">
            {FEATURE_CATEGORIES.map((cat) =>
            <button data-ev-id="ev_7188c639c5"
            key={cat.id}
            onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedCategory === cat.id ?
            'bg-primary/20 text-primary' :
            'bg-surface-elevated text-muted hover:text-text'}`
            }>

                {cat.label}
              </button>
            )}
          </div>
        </div>

        {/* Features List */}
        <div data-ev-id="ev_201fe4bb6e" className="flex-1 overflow-y-auto p-4">
          <div data-ev-id="ev_2f326dc667" className="flex flex-col gap-3">
            {filteredFeatures.map((feature) => {
              const IconComponent = iconMap[feature.icon] ?? Globe;
              const isAdded = existingIds.has(feature.id);

              return (
                <div data-ev-id="ev_6c5d480456"
                key={feature.id}
                className="bg-surface-elevated border border-border rounded-xl p-4 flex items-center gap-4">

                  <div data-ev-id="ev_ee82f91bbf" className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <IconComponent className="w-6 h-6 text-primary" />
                  </div>

                  <div data-ev-id="ev_46e8826071" className="flex-1">
                    <div data-ev-id="ev_30ef163202" className="flex items-center gap-2 mb-1">
                      <h3 data-ev-id="ev_96f1e857d0" className="font-medium text-text">{feature.name}</h3>
                    </div>
                    <p data-ev-id="ev_87ebc0fe04" className="text-sm text-muted line-clamp-2">{feature.description}</p>
                  </div>

                  <div data-ev-id="ev_e58530df1a" className="flex items-center gap-2">
                    <button data-ev-id="ev_f657234a4b" className="p-2 text-muted hover:text-text bg-background hover:bg-surface rounded-lg transition-colors">
                      <FileText className="w-5 h-5" />
                    </button>
                    <button data-ev-id="ev_4fc9b4b883"
                    onClick={() => {
                      if (!isAdded) {
                        onAdd(feature);
                      }
                    }}
                    disabled={isAdded}
                    className={`p-2 rounded-lg transition-colors ${
                    isAdded ?
                    'bg-success/20 text-success cursor-not-allowed' :
                    'bg-success hover:bg-success/90 text-white'}`
                    }>

                      {isAdded ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                    </button>
                  </div>
                </div>);

            })}
          </div>
        </div>
      </div>
    </div>);

}