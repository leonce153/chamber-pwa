import type { Dictionary } from '@/i18n/en';

/** Spanish (Latin American, "usted") text for the public app. Same keys as en.ts. */
export const es: Dictionary = {
  // Common
  'common.openInBrowser': 'Abrir en el navegador',
  'common.back': 'Atrás',
  'common.backHome': 'Volver al inicio',
  'common.close': 'Cerrar',
  'common.loading': 'Cargando…',
  'common.opensInBrowser': '{label} (se abre en el navegador)',

  // Language
  'lang.group': 'Idioma',
  'lang.english': 'English',
  'lang.spanish': 'Español',
  'settings.language': 'Language / Idioma',

  // Header
  'header.subtitle': 'Comercio y Agricultura',
  'header.lightMode': 'Cambiar a modo claro',
  'header.darkMode': 'Cambiar a modo oscuro',
  'header.notifications': 'Ver notificaciones',

  // Bottom tabs
  'tabs.home': 'Inicio',
  'tabs.directory': 'Directorio',
  'tabs.events': 'Eventos',
  'tabs.chat': 'Pregunte a la Mula',
  'tabs.member': 'Iniciar sesión',
  'tabs.aria': 'Pestaña {label}',

  // Sky hero
  'sky.morning': 'Buenos días,',
  'sky.afternoon': 'Buenas tardes,',
  'sky.evening': 'Buenas noches,',
  'sky.high': 'Máx. {temp}°',
  'sky.low': 'Mín. {temp}°',
  'sky.weatherAria': '{temp} grados, {condition}. Abrir el clima',
  'sky.alertAria': 'Alerta del clima: {event}. Abrir el clima',

  // Home: Ask the Mule
  'home.askAria': 'Pregúntele lo que sea a la Mula',
  'home.askPlaceholder': 'Pregúntele lo que sea a la Mula…',
  'home.chip1': '¿Dónde puedo comer?',
  'home.chip2': '¿Qué hay esta semana?',
  'home.chip3': '¿Quién está contratando?',
  'home.chipAria': 'Pregunte a la Mula: {chip}',

  // Home: links
  'home.quickPicks': 'Accesos rápidos',
  'home.moreLinks': 'Más enlaces',
  'links.events': 'Eventos',
  'links.eventsHint': 'Qué hay en el pueblo',
  'links.directory': 'Directorio',
  'links.directoryHint': 'Encuentre un negocio local',
  'links.deals': 'Ofertas',
  'links.dealsHint': 'Especiales para miembros',
  'links.jobs': 'Empleos',
  'links.jobsHint': 'Se contrata cerca',
  'links.news': 'Noticias',
  'links.visit': 'Visítenos',
  'links.visitTitle': 'Visite Muleshoe',
  'links.newsletter': 'Boletín',
  'links.join': 'Únase',
  'links.joinTitle': 'Únase a la Cámara',
  'links.contact': 'Contacto',
  'links.contactTitle': 'Contáctenos',
  'links.member': 'Portal de miembros',

  // Home: alerts card
  'alerts.title': 'Reciba avisos de la Cámara',
  'alerts.descIOS': 'En iPhone, primero agregue esta app a su pantalla de inicio.',
  'alerts.desc': 'Eventos, ofertas y avisos del clima',
  'alerts.step1a': 'Toque el botón Compartir',
  'alerts.step1b': 'en Safari',
  'alerts.step2a': 'Desplácese hacia abajo y toque',
  'alerts.step2b': 'Agregar a pantalla de inicio',
  'alerts.step3a': 'Abra la app desde su pantalla de inicio y toque',
  'alerts.step3b': 'Activar',
  'alerts.safariNote': 'Primero abra esta página en Safari. Otros navegadores de iPhone no pueden agregar apps a la pantalla de inicio.',
  'alerts.turningOn': 'Activando…',
  'alerts.turnOn': 'Activar',
  'alerts.notNow': 'Ahora no',

  // Push errors
  'push.errUnavailable': 'El servicio de notificaciones no está disponible',
  'push.errNotInit': 'Las notificaciones todavía no están listas',
  'push.errDenied': 'Se negó el permiso de notificaciones. Actívelo en la configuración del navegador.',
  'push.errRequired': 'Se necesita permiso para enviar notificaciones',
  'push.errFailed': 'No se pudieron activar las notificaciones. Inténtelo de nuevo.',
  'push.errUnsub': 'No se pudieron desactivar las notificaciones',

  // Home: latest updates
  'home.latest': 'Lo último de la Cámara',
  'type.event': 'Evento',
  'type.emergency': 'Alerta de emergencia',
  'type.update': 'Novedad',
  'home.emptyTitle': 'Todo tranquilo por aquí.',
  'home.emptyDesc': 'Aquí aparecerán las noticias y eventos de la Cámara.',
  'home.footer': 'Muleshoe, Texas · Hogar del National Mule Memorial',

  // Weather
  'weather.title': 'Clima',
  'weather.refresh': 'Actualizar el clima',
  'weather.loading': 'Cargando el clima…',
  'weather.unavailable': 'El clima no está disponible en este momento.',
  'weather.feelsLike': 'Sensación térmica',
  'weather.feelsLikeValue': 'Sensación térmica {temp}°',
  'weather.wind': 'Viento',
  'weather.humidity': 'Humedad',
  'weather.gusts': 'Ráfagas',
  'weather.activeAlerts': 'Alertas activas',
  'weather.until': 'Hasta {time}',
  'weather.tapDetails': 'Toque para ver detalles',
  'weather.hourly': 'Por hora',
  'weather.daily': 'Pronóstico de 7 días',
  'weather.low': 'Mín. ',
  'weather.source': 'Datos: Servicio Meteorológico Nacional (NWS) · Actualizado {time}',
  'day.today': 'Hoy',
  'day.tonight': 'Esta noche',
  'cond.clear': 'Despejado',
  'cond.partlyCloudy': 'Parcialmente nublado',
  'cond.cloudy': 'Nublado',
  'cond.rain': 'Lluvia',
  'cond.thunderstorm': 'Tormenta',
  'cond.snow': 'Nieve',
  'cond.fog': 'Niebla',
  'cond.windy': 'Ventoso',

  // Portal tabs
  'portal.directoryTitle': 'Directorio de negocios',
  'portal.eventsTitle': 'Eventos y calendario',
  'portal.chatTitle': 'Pregunte a la Mula',
  'portal.memberTitle': 'Iniciar sesión',
  'portal.opensInBrowser': 'Esta página se abre en su navegador.',
  'portal.memberHeading': 'Inicio de sesión para miembros',
  'portal.memberDesc': 'Inicie sesión en el Portal de miembros para administrar su ficha, sus eventos y su cuenta. Se abre en su navegador para que su sesión siga activa.',
  'portal.memberButton': 'Iniciar sesión en el Portal de miembros',
  'portal.notMember': '¿Todavía no es miembro?',
  'portal.joinLabel': 'Únase a la Cámara',
  'portal.joinDesc': 'Hágase miembro de la Cámara',
  'portal.registerLabel': 'Crear una cuenta',
  'portal.registerDesc': 'Se abre en su navegador',

  // In-app viewer
  'viewer.loading': 'Cargando {title}…',
  'viewer.slowTitle': 'Está tardando más de lo esperado',
  'viewer.slowDesc': 'La página todavía se está cargando. Puede esperar o abrirla en su navegador.',

  // App shell and notifications panel
  'app.notFoundTitle': 'App no encontrada',
  'app.notFoundDesc': 'La app que busca no existe o ya no está publicada.',
  'app.notificationsEnabled': 'Notificaciones activadas',
  'panel.title': 'Notificaciones',
  'panel.close': 'Cerrar notificaciones',
  'panel.push': 'Notificaciones push',
  'panel.enable': 'Activar notificaciones',
  'panel.disable': 'Desactivar notificaciones',
  'panel.topics': 'Temas',
  'panel.topicsHint': 'Elija sobre qué quiere recibir avisos. Las noticias importantes de la Cámara llegan a todos.',
  'panel.topicsOff': 'Active las notificaciones para elegir temas.'
};
