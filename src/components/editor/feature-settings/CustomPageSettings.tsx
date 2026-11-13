import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { FeatureSettingsProps } from './types';
import {
  Plus,
  GripVertical,
  Trash2,
  FileText,
  Loader2,
  X,
  Upload,
  Edit3 } from
'lucide-react';

interface CustomPageRow {
  id: string;
  feature_id: string;
  title: string;
  content: string | null;
  page_type: string | null;
  show_header: boolean | null;
  header_image_url: string | null;
  created_at: string;
  updated_at: string;
}

export function CustomPageSettings({ feature }: FeatureSettingsProps) {
  const [pages, setPages] = useState<CustomPageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPage, setEditingPage] = useState<CustomPageRow | null>(null);
  const [showAddPage, setShowAddPage] = useState(false);

  useEffect(() => {
    const loadPages = async () => {
      if (!supabase) return;
      
      const { data } = await supabase
        .from('feature_custom_pages')
        .select('*')
        .eq('feature_id', feature.id);
      
      setPages((data as CustomPageRow[]) ?? []);
      setLoading(false);
    };
    loadPages();
  }, [feature.id]);

  const fetchPages = async () => {
    if (!supabase) return;

    const { data } = await supabase.
    from('feature_custom_pages').
    select('*').
    eq('feature_id', feature.id);

    setPages(data as CustomPageRow[] ?? []);
    setLoading(false);
  };

  const addPage = async (title: string, pageType: string) => {
    if (!supabase) return;

    const { data } = await supabase.
    from('feature_custom_pages').
    insert({
      feature_id: feature.id,
      title,
      page_type: pageType,
      content: '',
      show_header: true
    }).
    select().
    single();

    if (data) {
      setPages([...pages, data as CustomPageRow]);
      setShowAddPage(false);
      setEditingPage(data as CustomPageRow);
    }
  };

  const updatePage = async (pageId: string, updates: Partial<CustomPageRow>) => {
    if (!supabase) return;

    const { data } = await supabase.
    from('feature_custom_pages').
    update(updates).
    eq('id', pageId).
    select().
    single();

    if (data) {
      setPages(pages.map((p) => p.id === pageId ? data as CustomPageRow : p));
      setEditingPage(null);
    }
  };

  const deletePage = async (pageId: string) => {
    if (!supabase || !confirm('Delete this page?')) return;
    await supabase.from('feature_custom_pages').delete().eq('id', pageId);
    setPages(pages.filter((p) => p.id !== pageId));
  };

  const pageTypes = [
  { id: 'about', name: 'About', description: 'About us/company info' },
  { id: 'faq', name: 'FAQ', description: 'Frequently asked questions' },
  { id: 'terms', name: 'Terms', description: 'Terms of service' },
  { id: 'contact', name: 'Contact', description: 'Contact information' },
  { id: 'custom', name: 'Custom', description: 'Free-form content' }];


  return (
    <div data-ev-id="ev_77b6145055" className="p-6 flex flex-col gap-8">
      {/* Pages */}
      <section data-ev-id="ev_7c74365d1f">
        <div data-ev-id="ev_37ff2570d2" className="flex items-center justify-between mb-4">
          <div data-ev-id="ev_c31b2c0fec">
            <h3 data-ev-id="ev_9cba328207" className="text-lg font-semibold text-text">Pages</h3>
            <p data-ev-id="ev_61b90a076a" className="text-sm text-muted">Create and manage custom content pages.</p>
          </div>
          <button data-ev-id="ev_a101fda85a"
          onClick={() => setShowAddPage(true)}
          className="flex items-center gap-2 px-4 py-2 bg-success hover:bg-success/90 text-white font-medium rounded-lg transition-colors">

            <Plus className="w-4 h-4" />
            Add Page
          </button>
        </div>

        {loading ?
        <div data-ev-id="ev_b1adbe2c6d" className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div> :
        pages.length === 0 ?
        <div data-ev-id="ev_17ee583092" className="bg-surface-elevated border border-border rounded-xl p-8 text-center">
            <FileText className="w-12 h-12 text-muted mx-auto mb-3" />
            <p data-ev-id="ev_af7dbed4b7" className="text-text font-medium mb-1">No pages yet</p>
            <p data-ev-id="ev_eaddb8e3b9" className="text-sm text-muted">Create custom pages for about, FAQ, terms, and more</p>
          </div> :

        <div data-ev-id="ev_d02ef888d6" className="flex flex-col gap-3">
            {pages.map((page) =>
          <div data-ev-id="ev_0d447d10ff"
          key={page.id}
          className="bg-surface-elevated border border-border rounded-xl p-4">

                <div data-ev-id="ev_280d78db89" className="flex items-center gap-4">
                  <button data-ev-id="ev_599f837dde" className="text-muted hover:text-text cursor-grab">
                    <GripVertical className="w-5 h-5" />
                  </button>
                  
                  <div data-ev-id="ev_34e0d166da" className="w-10 h-10 bg-amber-600/20 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-amber-600" />
                  </div>

                  <div data-ev-id="ev_f62426c220" className="flex-1 min-w-0">
                    <p data-ev-id="ev_3abcba4a8b" className="font-medium text-text truncate">{page.title}</p>
                    <p data-ev-id="ev_3ad96ef546" className="text-sm text-muted capitalize">{page.page_type}</p>
                  </div>

                  <span data-ev-id="ev_26575ae71e" className="text-xs font-medium px-2 py-1 rounded bg-primary/20 text-primary">
                    {(page.content?.length ?? 0) > 0 ? 'Has content' : 'Empty'}
                  </span>

                  <button data-ev-id="ev_9f8d28ab6d"
              onClick={() => setEditingPage(page)}
              className="p-2 text-muted hover:text-text bg-background hover:bg-surface rounded-lg transition-colors">

                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button data-ev-id="ev_63544520b9"
              onClick={() => deletePage(page.id)}
              className="p-2 text-muted hover:text-destructive bg-background hover:bg-destructive/10 rounded-lg transition-colors">

                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
          )}
          </div>
        }
      </section>

      {/* Add Page Modal */}
      {showAddPage &&
      <div data-ev-id="ev_6ec9799243" className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div data-ev-id="ev_988dc9c21f" className="bg-surface border border-border rounded-xl w-full max-w-md p-6">
            <div data-ev-id="ev_f98554c44b" className="flex items-center justify-between mb-4">
              <h3 data-ev-id="ev_9750473826" className="text-lg font-semibold text-text">Add Page</h3>
              <button data-ev-id="ev_5f0452396b" onClick={() => setShowAddPage(false)} className="text-muted hover:text-text">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p data-ev-id="ev_5ea6b54436" className="text-sm text-muted mb-4">Choose a page type to get started.</p>

            <div data-ev-id="ev_bd7cc56c3c" className="flex flex-col gap-2">
              {pageTypes.map((type) =>
            <button data-ev-id="ev_e836c1436a"
            key={type.id}
            onClick={() => addPage(type.name + ' Page', type.id)}
            className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 text-left transition-colors">

                  <FileText className="w-5 h-5 text-muted" />
                  <div data-ev-id="ev_d3d15ada68">
                    <p data-ev-id="ev_03e186f4a2" className="font-medium text-text">{type.name}</p>
                    <p data-ev-id="ev_6a35be538a" className="text-xs text-muted">{type.description}</p>
                  </div>
                </button>
            )}
            </div>
          </div>
        </div>
      }

      {/* Edit Page Modal */}
      {editingPage &&
      <PageEditor
        page={editingPage}
        onSave={(updates) => updatePage(editingPage.id, updates)}
        onClose={() => setEditingPage(null)} />

      }
    </div>);

}

function PageEditor({
  page,
  onSave,
  onClose




}: {page: CustomPageRow;onSave: (updates: Partial<CustomPageRow>) => void;onClose: () => void;}) {
  const [title, setTitle] = useState(page.title);
  const [content, setContent] = useState(page.content ?? '');
  const [showHeader, setShowHeader] = useState(page.show_header ?? true);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave({ title, content, show_header: showHeader });
    setSaving(false);
  };

  return (
    <div data-ev-id="ev_f23218b666" className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div data-ev-id="ev_1def1511e7" className="bg-surface border border-border rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div data-ev-id="ev_ac6f221231" className="flex items-center justify-between p-6 border-b border-border">
          <div data-ev-id="ev_0df238a2ef">
            <h3 data-ev-id="ev_93fca8aec1" className="text-lg font-semibold text-text">Edit Page</h3>
            <p data-ev-id="ev_33f8d0e565" className="text-sm text-muted capitalize">{page.page_type}</p>
          </div>
          <button data-ev-id="ev_5aeb994b82" onClick={onClose} className="text-muted hover:text-text">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div data-ev-id="ev_e082283c89" className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          <div data-ev-id="ev_2d01cac412">
            <label data-ev-id="ev_374afc1304" className="block text-sm font-medium text-text mb-1.5">Page Title</label>
            <input data-ev-id="ev_c6602280d8"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-input border border-border rounded-lg px-4 py-2.5 text-text" />

          </div>

          <div data-ev-id="ev_c8c5d5ff9e">
            <label data-ev-id="ev_6ea8357841" className="block text-sm font-medium text-text mb-1.5">Content (Markdown supported)</label>
            <textarea data-ev-id="ev_390b8fb6fd"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full bg-input border border-border rounded-lg px-4 py-3 text-text font-mono text-sm resize-none"
            rows={15}
            placeholder="# Welcome\n\nWrite your page content here using Markdown...\n\n## Features\n\n- Item 1\n- Item 2" />

          </div>

          <label data-ev-id="ev_0621f85095" className="flex items-center gap-3 cursor-pointer">
            <div data-ev-id="ev_7f942c12fb"
            onClick={() => setShowHeader(!showHeader)}
            className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
            showHeader ? 'bg-primary' : 'bg-surface-elevated'}`
            }>

              <div data-ev-id="ev_5a20ed3bb3"
              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
              showHeader ? 'translate-x-5' : 'translate-x-0.5'}`
              } />

            </div>
            <span data-ev-id="ev_836fc80045" className="text-text">Show Page Header</span>
          </label>
        </div>

        {/* Footer */}
        <div data-ev-id="ev_054f283c2c" className="flex items-center justify-end gap-3 p-6 border-t border-border">
          <button data-ev-id="ev_44bba891c2" onClick={onClose} className="px-6 py-2.5 text-muted hover:text-text font-medium">
            Cancel
          </button>
          <button data-ev-id="ev_d40e8255a4"
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white font-medium rounded-lg disabled:opacity-50 flex items-center gap-2">

            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Page
          </button>
        </div>
      </div>
    </div>);

}