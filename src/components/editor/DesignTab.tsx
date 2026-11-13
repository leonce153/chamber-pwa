import { useState } from 'react';
import type { Tables } from '@/integrations/supabase/helpers';
import { LAYOUT_TEMPLATES, FONTS, FONT_CATEGORIES } from '@/data/features';
import { Check, Upload } from 'lucide-react';

type App = Tables<'apps'>;

interface DesignTabProps {
  app: App;
  onUpdate: (updates: Partial<App>) => void;
}

export function DesignTab({ app, onUpdate }: DesignTabProps) {
  const [selectedFontCategory, setSelectedFontCategory] = useState('sans-serif');
  const [customFont, setCustomFont] = useState('');

  const filteredFonts = FONTS.filter((f) => f.category === selectedFontCategory);

  return (
    <div data-ev-id="ev_30a085cd85" className="max-w-4xl flex flex-col gap-8">
      {/* Your Design Section */}
      <section data-ev-id="ev_7f75d3cabd" className="bg-surface border border-border rounded-xl overflow-hidden">
        <div data-ev-id="ev_cead84c72d" className="px-6 py-4 border-b border-border border-l-4 border-l-primary">
          <h2 data-ev-id="ev_f108137ea3" className="text-lg font-semibold text-text">Your Design</h2>
        </div>
        <div data-ev-id="ev_cfa791a1e3" className="p-6">
          <p data-ev-id="ev_2f652b85a2" className="text-muted mb-6">Current template and homepage layout for your app.</p>
          <div data-ev-id="ev_7ad8876e82" className="flex gap-6">
            {LAYOUT_TEMPLATES.map((template) =>
            <button data-ev-id="ev_6ea75c4dec"
            key={template.id}
            onClick={() => onUpdate({ layout_style: template.id === 'grid-6' ? 'grid' : 'minimal' })}
            className={`relative w-40 h-64 rounded-xl border-2 transition-colors ${
            app.layout_style === 'grid' && template.id === 'grid-6' ||
            app.layout_style === 'minimal' && template.id === 'blank' ?
            'border-primary' :
            'border-border hover:border-primary/50'}`
            }>

                {template.id === 'blank' ?
              <div data-ev-id="ev_0888d73abf" className="h-full bg-white rounded-lg flex items-center justify-center">
                    <span data-ev-id="ev_5a1a0ba249" className="text-gray-400 font-medium text-sm text-center px-4">BLANK TEMPLATE</span>
                  </div> :

              <div data-ev-id="ev_fbaaa8843a" className="h-full bg-surface-elevated rounded-lg p-4 flex flex-col items-center justify-center gap-3">
                    <div data-ev-id="ev_96a5c14565" className="grid grid-cols-3 gap-2">
                      {[...Array(6)].map((_, i) =>
                  <div data-ev-id="ev_b97c7d5703"
                  key={i}
                  className={`w-6 h-6 rounded-full ${
                  i === 1 ? 'bg-primary/60' : 'bg-primary/20'}`
                  } />

                  )}
                    </div>
                  </div>
              }
                {(app.layout_style === 'grid' && template.id === 'grid-6' ||
              app.layout_style === 'minimal' && template.id === 'blank') &&
              <div data-ev-id="ev_4f3321867f" className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
              }
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Layout Options */}
      <section data-ev-id="ev_eda868d4df" className="bg-surface border border-border rounded-xl overflow-hidden">
        <div data-ev-id="ev_3387ab4771" className="px-6 py-4 border-b border-border border-l-4 border-l-primary">
          <h2 data-ev-id="ev_6e26c73873" className="text-lg font-semibold text-text">Layout Options</h2>
        </div>
        <div data-ev-id="ev_01ccb3a5a8" className="p-6 flex flex-col gap-6">
          <p data-ev-id="ev_5829cde5d2" className="text-muted -mt-2">Customize layout</p>
          
          <div data-ev-id="ev_9cfc3b1a64">
            <label data-ev-id="ev_9cfb3d6012" className="block text-sm font-medium text-text mb-2">Icon titles</label>
            <select data-ev-id="ev_3638fe50cf"
            value={app.icon_titles_visible ? 'visible' : 'hidden'}
            onChange={(e) => onUpdate({ icon_titles_visible: e.target.value === 'visible' })}
            className="w-full bg-input border border-border rounded-lg px-4 py-2.5 text-text focus:outline-none focus:ring-2 focus:ring-primary">

              <option data-ev-id="ev_da416426fa" value="visible">Visible</option>
              <option data-ev-id="ev_841dd80f52" value="hidden">Hidden</option>
            </select>
          </div>

          <div data-ev-id="ev_bd3669626b" className="grid grid-cols-2 gap-6">
            <div data-ev-id="ev_5cf48e969f">
              <label data-ev-id="ev_122accd0a6" className="block text-sm font-medium text-text mb-2">Icon color</label>
              <div data-ev-id="ev_eb88cc11f4" className="flex items-center gap-3">
                <input data-ev-id="ev_1391cb8c40"
                type="color"
                value={app.theme_color ?? '#B8956B'}
                onChange={(e) => onUpdate({ theme_color: e.target.value })}
                className="w-12 h-10 rounded-lg border border-border cursor-pointer" />

                <span data-ev-id="ev_3bde1609ee" className="text-muted">{app.theme_color ?? '#B8956B'}</span>
              </div>
            </div>
            <div data-ev-id="ev_609b1b1616">
              <label data-ev-id="ev_1aa3d7ae9d" className="block text-sm font-medium text-text mb-2">Text color</label>
              <div data-ev-id="ev_7f0e345447" className="flex items-center gap-3">
                <input data-ev-id="ev_ac498688e2"
                type="color"
                value={app.text_color ?? '#ffffff'}
                onChange={(e) => onUpdate({ text_color: e.target.value })}
                className="w-12 h-10 rounded-lg border border-border cursor-pointer" />

                <span data-ev-id="ev_1587856759" className="text-muted">{app.text_color ?? '#ffffff'}</span>
              </div>
            </div>
          </div>

          <button data-ev-id="ev_a04b7beeee"
          onClick={() => {}}
          className="self-start bg-primary hover:bg-primary-hover text-white font-medium px-6 py-2 rounded-lg transition-colors">

            Save
          </button>
        </div>
      </section>

      {/* Unified Homepage */}
      <section data-ev-id="ev_025ca6731b" className="bg-surface border border-border rounded-xl overflow-hidden">
        <div data-ev-id="ev_8daf8598ec" className="px-6 py-4 border-b border-border border-l-4 border-l-primary">
          <h2 data-ev-id="ev_51455bc1dc" className="text-lg font-semibold text-text">Unified Homepage</h2>
        </div>
        <div data-ev-id="ev_dc8c489986" className="p-6">
          <p data-ev-id="ev_2425da6ef8" className="text-muted mb-6">Single image used across all device sizes. Recommended: 2732 × 2732px.</p>
          
          <div data-ev-id="ev_273004f9b2" className="flex gap-8">
            <div data-ev-id="ev_add0d39376" className="w-32 h-48 bg-surface-elevated rounded-xl flex items-center justify-center border border-border">
              {app.homepage_image_url ?
              <img data-ev-id="ev_33cd9a4973" src={app.homepage_image_url} alt="Homepage" className="w-full h-full object-cover rounded-xl" /> :

              <span data-ev-id="ev_356ef8703c" className="text-muted text-sm">No image</span>
              }
            </div>
            
            <div data-ev-id="ev_3b083241bf" className="flex-1 flex flex-col gap-4">
              <div data-ev-id="ev_9ebba2e281">
                <p data-ev-id="ev_16a17f9b08" className="text-sm font-medium text-muted-foreground mb-2">OVERLAY COLOR</p>
                <div data-ev-id="ev_af3047ee10" className="flex gap-4">
                  <label data-ev-id="ev_0fc6268884" className="flex items-center gap-2 cursor-pointer">
                    <input data-ev-id="ev_ef43f91d9b"
                    type="radio"
                    name="overlay"
                    checked={app.overlay_color === 'black'}
                    onChange={() => onUpdate({ overlay_color: 'black' })}
                    className="w-4 h-4 accent-primary" />

                    <span data-ev-id="ev_c4d0d8815f" className="text-text">Black</span>
                  </label>
                  <label data-ev-id="ev_1dae9e7b15" className="flex items-center gap-2 cursor-pointer">
                    <input data-ev-id="ev_b9d4c9a801"
                    type="radio"
                    name="overlay"
                    checked={app.overlay_color === 'white'}
                    onChange={() => onUpdate({ overlay_color: 'white' })}
                    className="w-4 h-4 accent-primary" />

                    <span data-ev-id="ev_426838197f" className="text-text">White</span>
                  </label>
                </div>
              </div>

              <div data-ev-id="ev_abed3ec7e0">
                <p data-ev-id="ev_c023027905" className="text-sm font-medium text-muted-foreground mb-2">ZONE OVERLAY</p>
                <div data-ev-id="ev_83549a9627" className="flex flex-col gap-2">
                  {['Hide overlay', 'Safe in portrait', 'Safe in portrait (locked)', 'Safe in landscape', 'Safe in portrait & landscape'].map((option, i) =>
                  <label data-ev-id="ev_bc59e33e03" key={option} className="flex items-center gap-2 cursor-pointer">
                      <input data-ev-id="ev_3bc791c7e0"
                    type="radio"
                    name="zone"
                    checked={i === 2}
                    onChange={() => {}}
                    className="w-4 h-4 accent-primary" />

                      <span data-ev-id="ev_d2dc6b1df5" className="text-text text-sm">{option}</span>
                    </label>
                  )}
                </div>
              </div>

              <button data-ev-id="ev_eb2f14a776" className="self-start bg-primary hover:bg-primary-hover text-white font-medium px-6 py-2 rounded-lg transition-colors mt-2">
                Change
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* App Font */}
      <section data-ev-id="ev_53de5b0e60" className="bg-surface border border-border rounded-xl overflow-hidden">
        <div data-ev-id="ev_2d5e96a5cf" className="px-6 py-4 border-b border-border border-l-4 border-l-primary">
          <h2 data-ev-id="ev_72fe601d3d" className="text-lg font-semibold text-text">App Font</h2>
        </div>
        <div data-ev-id="ev_f2249d015c" className="p-6">
          <p data-ev-id="ev_ca1532fc7c" className="text-muted text-center mb-6">Select the typeface used throughout your app.</p>
          
          {/* Active Font */}
          <div data-ev-id="ev_094863dcc8" className="bg-primary/10 border border-primary/20 rounded-lg px-4 py-3 mb-6">
            <span data-ev-id="ev_aa9b61b1c8" className="text-xs font-medium text-primary uppercase tracking-wider">ACTIVE FONT</span>
            <span data-ev-id="ev_9c4aee6ae4" className="ml-3 text-text font-medium">{app.font_family ?? 'Inter'}</span>
          </div>

          {/* Custom Font Input */}
          <div data-ev-id="ev_27cd150af1" className="mb-6">
            <p data-ev-id="ev_a62253c859" className="text-sm font-medium text-text mb-2">Custom Google Font name</p>
            <div data-ev-id="ev_6a183fcd85" className="flex gap-3">
              <input data-ev-id="ev_826a3caa74"
              type="text"
              value={customFont}
              onChange={(e) => setCustomFont(e.target.value)}
              placeholder="e.g. Playfair Display"
              className="flex-1 bg-input border border-border rounded-lg px-4 py-2.5 text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary" />

              <button data-ev-id="ev_f6020eb911"
              onClick={() => customFont && onUpdate({ font_family: customFont })}
              className="bg-primary hover:bg-primary-hover text-white font-medium px-6 py-2 rounded-lg transition-colors">

                Apply
              </button>
            </div>
          </div>

          {/* Font Categories */}
          <div data-ev-id="ev_1ad26bc9ba" className="flex flex-wrap gap-2 mb-6">
            {FONT_CATEGORIES.map((cat) =>
            <button data-ev-id="ev_b22bcd4688"
            key={cat.id}
            onClick={() => setSelectedFontCategory(cat.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            selectedFontCategory === cat.id ?
            'bg-primary/20 text-primary' :
            'bg-surface-elevated text-muted hover:text-text'}`
            }>

                {cat.label} <span data-ev-id="ev_67895b73f0" className="opacity-60">{cat.count}</span>
              </button>
            )}
          </div>

          {/* Font Grid */}
          <div data-ev-id="ev_bb849e1047" className="grid grid-cols-2 gap-4">
            {filteredFonts.map((font) =>
            <button data-ev-id="ev_2e4746411e"
            key={font.name}
            onClick={() => onUpdate({ font_family: font.family })}
            className={`relative text-left p-4 rounded-xl border-2 transition-colors ${
            app.font_family === font.family ?
            'border-primary bg-primary/5' :
            'border-border hover:border-primary/50'}`
            }>

                <p data-ev-id="ev_465b8ae155" className="text-lg text-text mb-1" style={{ fontFamily: font.family }}>
                  Lorem Ipsum DOLOR SIT AMET
                </p>
                <p data-ev-id="ev_5254b58e09" className="text-xs text-primary font-medium uppercase">{font.name}</p>
                {app.font_family === font.family &&
              <div data-ev-id="ev_3bb6488a40" className="absolute top-3 right-3 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
              }
              </button>
            )}
          </div>
        </div>
      </section>
    </div>);

}