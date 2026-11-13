import { useState } from 'react';
import { HomeSections, type UpdateItem } from '@/components/pwa/home/HomeSections';
import { visibleLayout, type HomeSection } from '@/lib/home-layout';
import { SKY } from '@/hooks/use-sky-period';

const SAMPLE_UPDATES: UpdateItem[] = [
{ id: 's1', title: 'Chamber Mixer at the Bailey County Coliseum', body: 'Join us for our event', sent_at: new Date().toISOString(), url: null },
{ id: 's2', title: 'New members welcomed this month', body: 'Update', sent_at: new Date(Date.now() - 86400000 * 2).toISOString(), url: null },
{ id: 's3', title: 'Office closed Friday for the holiday', body: 'Update', sent_at: new Date(Date.now() - 86400000 * 5).toISOString(), url: null },
{ id: 's4', title: 'Business after hours recap', body: 'Update', sent_at: new Date(Date.now() - 86400000 * 8).toISOString(), url: null },
{ id: 's5', title: 'Ribbon cutting on Main Street', body: 'event', sent_at: new Date(Date.now() - 86400000 * 11).toISOString(), url: null }];


/** Phone-sized preview of the public Home (saved layout), with language and light/dark switches. */
export function HomePreview({ sections }: {sections: HomeSection[];}) {
  const [lang, setLang] = useState<'en' | 'es'>('en');
  const [isDark, setIsDark] = useState(false);
  const [withUpdates, setWithUpdates] = useState(true);
  const layout = visibleLayout(sections);
  const textColor = isDark ? '#ffffff' : '#1A1A1A';
  const sky = SKY[isDark ? 'night' : 'day'];

  const seg = (active: boolean) => `px-2.5 py-1.5 text-xs font-semibold ${active ? 'bg-primary text-white' : 'text-text-secondary'}`;

  return (
    <div data-ev-id="ev_a89b87a75b" className="flex flex-col gap-3">
      <div data-ev-id="ev_dc285e59e9" className="flex flex-wrap items-center gap-2">
        <div data-ev-id="ev_db349f9e86" className="flex rounded-[8px] border border-border overflow-hidden">
          <button data-ev-id="ev_1dd3e1e083" className={seg(lang === 'en')} onClick={() => setLang('en')}>EN</button>
          <button data-ev-id="ev_d2ac77cb8d" className={seg(lang === 'es')} onClick={() => setLang('es')}>ES</button>
        </div>
        <div data-ev-id="ev_5a96437546" className="flex rounded-[8px] border border-border overflow-hidden">
          <button data-ev-id="ev_73295e2d52" className={seg(!isDark)} onClick={() => setIsDark(false)}>Light</button>
          <button data-ev-id="ev_b04811347d" className={seg(isDark)} onClick={() => setIsDark(true)}>Dark</button>
        </div>
        <div data-ev-id="ev_9e26e7928c" className="flex rounded-[8px] border border-border overflow-hidden">
          <button data-ev-id="ev_43777e2f1c" className={seg(withUpdates)} onClick={() => setWithUpdates(true)}>Sample updates</button>
          <button data-ev-id="ev_59b9c3823a" className={seg(!withUpdates)} onClick={() => setWithUpdates(false)}>Empty</button>
        </div>
      </div>
      <div data-ev-id="ev_a84e3ab3e1" className="w-[340px] max-w-full h-[640px] rounded-[36px] border-[10px] border-[#1A1A1A] overflow-hidden shadow-xl">
        <div data-ev-id="ev_c6bafa0c80" className="h-full overflow-y-auto [&_button]:pointer-events-none" style={{ backgroundColor: isDark ? '#1A1A1A' : '#ffffff' }} aria-hidden="true">
          <HomeSections
            sections={layout}
            lang={lang}
            isDark={isDark}
            textColor={textColor}
            renderHero={() =>
            <div data-ev-id="ev_59430eb357" className="h-[150px] flex items-end p-4" style={{ background: sky.gradient }}>
                <span data-ev-id="ev_4a4d819957" className="text-white text-sm font-semibold drop-shadow">{lang === 'es' ? 'Encabezado del cielo' : 'Sky header'}</span>
              </div>
            }
            alerts={null}
            updates={withUpdates ? SAMPLE_UPDATES : []}
            onItem={() => undefined}
            isExternal={() => false}
            onAsk={() => undefined}
            onOpenUpdate={() => undefined} />
        </div>
      </div>
      <p data-ev-id="ev_8ffddd3919" className="text-xs text-text-tertiary max-w-[340px] text-pretty">
        Preview of saved changes. The alerts card and live weather show in the real app only.
      </p>
    </div>);
}