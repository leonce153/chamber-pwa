import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import { usePWAInstall } from '@/hooks/usePWAInstall';

type Device = 'android' | 'iphone' | 'iphoneChrome';

interface Guide {
  label: string;
  steps: string[];
  blocked: string[];
}

const TEXT: Record<'en' | 'es', { title: string; blockedTitle: string; needs: string; guides: Record<Device, Guide> }> = {
  en: {
    title: 'How to turn on notifications',
    blockedTitle: 'Still not working?',
    needs: 'iPhone needs iOS 16.4 or newer.',
    guides: {
      android: {
        label: 'Android',
        steps: [
          'Open this app in Chrome.',
          'Tap the bell at the top, then turn on Push Notifications.',
          'Tap Allow when Chrome asks.',
          'Optional: tap ⋮ then Install app to put it on your home screen.'
        ],
        blocked: [
          'Tap the small icon at the left inside the address bar, then Permissions, and allow Notifications (or tap Reset permissions).',
          'Or tap ⋮ → Settings → Site settings → Notifications and allow this site.',
          'If you installed the app: phone Settings → Apps → this app → Notifications → on.'
        ]
      },
      iphone: {
        label: 'iPhone (Safari)',
        steps: [
          'Open this app in Safari.',
          'Tap the Share button (square with an arrow).',
          'Scroll down, tap Add to Home Screen, then Add.',
          'Open the app from your Home Screen, not from Safari.',
          'Tap the bell, turn on Push Notifications, then tap Allow.'
        ],
        blocked: [
          'Open iPhone Settings → Notifications → find this app → turn on Allow Notifications.',
          'Not in the list? Make sure you opened the app from the Home Screen icon.'
        ]
      },
      iphoneChrome: {
        label: 'iPhone (Chrome)',
        steps: [
          'Open this app in Chrome.',
          'Tap the Share button at the top right of the address bar (or ⋯ → Share).',
          'Tap Add to Home Screen, then Add.',
          'Open the app from your Home Screen, not from Chrome.',
          'Tap the bell, turn on Push Notifications, then tap Allow.'
        ],
        blocked: [
          'No Add to Home Screen option? Open this page in Safari and follow the Safari steps.',
          'Open iPhone Settings → Notifications → find this app → turn on Allow Notifications.'
        ]
      }
    }
  },
  es: {
    title: 'Cómo activar las notificaciones',
    blockedTitle: '¿Todavía no funciona?',
    needs: 'En iPhone se necesita iOS 16.4 o más reciente.',
    guides: {
      android: {
        label: 'Android',
        steps: [
          'Abra esta app en Chrome.',
          'Toque la campana arriba y active Notificaciones push.',
          'Toque Permitir cuando Chrome se lo pida.',
          'Opcional: toque ⋮ y luego Instalar app para tenerla en su pantalla de inicio.'
        ],
        blocked: [
          'Toque el ícono pequeño a la izquierda dentro de la barra de direcciones, luego Permisos, y permita Notificaciones (o toque Restablecer permisos).',
          'O toque ⋮ → Configuración → Configuración de sitios → Notificaciones y permita este sitio.',
          'Si instaló la app: Ajustes del teléfono → Aplicaciones → esta app → Notificaciones → activar.'
        ]
      },
      iphone: {
        label: 'iPhone (Safari)',
        steps: [
          'Abra esta app en Safari.',
          'Toque el botón Compartir (cuadro con una flecha).',
          'Baje, toque Agregar a pantalla de inicio y luego Agregar.',
          'Abra la app desde su pantalla de inicio, no desde Safari.',
          'Toque la campana, active Notificaciones push y toque Permitir.'
        ],
        blocked: [
          'Abra Ajustes del iPhone → Notificaciones → busque esta app → active Permitir notificaciones.',
          '¿No aparece? Asegúrese de abrir la app desde el ícono de la pantalla de inicio.'
        ]
      },
      iphoneChrome: {
        label: 'iPhone (Chrome)',
        steps: [
          'Abra esta app en Chrome.',
          'Toque el botón Compartir arriba a la derecha de la barra de direcciones (o ⋯ → Compartir).',
          'Toque Agregar a pantalla de inicio y luego Agregar.',
          'Abra la app desde su pantalla de inicio, no desde Chrome.',
          'Toque la campana, active Notificaciones push y toque Permitir.'
        ],
        blocked: [
          '¿No ve Agregar a pantalla de inicio? Abra esta página en Safari y siga los pasos de Safari.',
          'Abra Ajustes del iPhone → Notificaciones → busque esta app → active Permitir notificaciones.'
        ]
      }
    }
  }
};

/** Collapsible, device-aware steps for turning on notifications (shown in the bell panel). */
export function NotificationHelp({ textColor, primaryColor, defaultOpen = false }: {textColor: string;primaryColor: string;defaultOpen?: boolean;}) {
  const { lang } = useLanguage();
  const { isIOS, isIOSSafari } = usePWAInstall();
  const [open, setOpen] = useState(defaultOpen);
  const [device, setDevice] = useState<Device>(isIOS ? isIOSSafari ? 'iphone' : 'iphoneChrome' : 'android');
  const T = TEXT[lang === 'es' ? 'es' : 'en'];
  const g = T.guides[device];

  return (
    <div data-ev-id="ev_notif_help" className="rounded-xl mb-4" style={{ backgroundColor: primaryColor + '15' }}>
      <button data-ev-id="ev_notif_help_toggle"
      onClick={() => setOpen(!open)}
      aria-expanded={open}
      className="w-full min-h-11 px-4 py-3 flex items-center justify-between gap-3 text-left text-base font-semibold"
      style={{ color: textColor }}>
        {T.title}
        <ChevronDown className={`w-5 h-5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open &&
      <div data-ev-id="ev_notif_help_body" className="px-4 pb-4 flex flex-col gap-3">
          <div data-ev-id="ev_notif_help_devices" role="tablist" className="flex gap-2 flex-wrap">
            {(Object.keys(T.guides) as Device[]).map((d) =>
          <button data-ev-id="ev_notif_help_device" key={d} role="tab" aria-selected={device === d}
          onClick={() => setDevice(d)}
          className="min-h-9 px-3 rounded-full text-sm font-semibold border"
          style={{ backgroundColor: device === d ? primaryColor : 'transparent', borderColor: device === d ? primaryColor : textColor + '30', color: device === d ? '#fff' : textColor }}>
                {T.guides[d].label}
              </button>
          )}
          </div>
          <ol data-ev-id="ev_notif_help_steps" className="flex flex-col gap-2">
            {g.steps.map((s, i) =>
          <li data-ev-id="ev_notif_help_step" key={i} className="flex items-start gap-3">
                <span data-ev-id="ev_notif_help_num" className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold text-white" style={{ backgroundColor: primaryColor }}>{i + 1}</span>
                <span data-ev-id="ev_notif_help_text" className="text-[15px] pt-0.5 text-pretty" style={{ color: textColor }}>{s}</span>
              </li>
          )}
          </ol>
          {device !== 'android' && <p data-ev-id="ev_notif_help_needs" className="text-sm opacity-70" style={{ color: textColor }}>{T.needs}</p>}
          <div data-ev-id="ev_notif_help_blocked" className="flex flex-col gap-1.5">
            <p data-ev-id="ev_notif_help_blocked_title" className="text-[15px] font-semibold" style={{ color: textColor }}>{T.blockedTitle}</p>
            <ul data-ev-id="ev_notif_help_blocked_list" className="flex flex-col gap-1.5 list-disc pl-5">
              {g.blocked.map((s, i) => <li data-ev-id="ev_notif_help_blocked_item" key={i} className="text-[15px] text-pretty" style={{ color: textColor }}>{s}</li>)}
            </ul>
          </div>
        </div>
      }
    </div>);

}
