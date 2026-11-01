/** Selection metadata stays eager; themes do not own application wording. */
export const themeCopy = {
  en: {
    theme: 'Theme', auto: 'Auto', pond: 'Pond', cauldron: 'Cauldron', appearance: 'Appearance', system: 'System', light: 'Light', dark: 'Dark', unknown: 'Unavailable choice', loading: 'Loading theme...', failed: 'Theme could not load.', retry: 'Retry theme',
    activeTheme: 'Active theme: {theme}', loadingTarget: 'Switching to {theme}...', halloween: 'Halloween',
    eventRemaining: '{theme} ends in {duration} ({event}).', lessThanHour: 'less than 1 hour',
  },
  de: {
    theme: 'Thema', auto: 'Auto', pond: 'Teich', cauldron: 'Kessel', appearance: 'Darstellung', system: 'System', light: 'Hell', dark: 'Dunkel', unknown: 'Nicht verf\u00fcgbare Auswahl', loading: 'Thema wird geladen...', failed: 'Thema konnte nicht geladen werden.', retry: 'Thema erneut laden',
    activeTheme: 'Aktives Thema: {theme}', loadingTarget: '{theme} wird geladen...', halloween: 'Halloween',
    eventRemaining: '{theme}: noch {duration} ({event}).', lessThanHour: 'weniger als 1 Stunde',
  },
  es: {
    theme: 'Tema', auto: 'Auto', pond: 'Estanque', cauldron: 'Caldero', appearance: 'Apariencia', system: 'Sistema', light: 'Claro', dark: 'Oscuro', unknown: 'Opci\u00f3n no disponible', loading: 'Cargando tema...', failed: 'No se pudo cargar el tema.', retry: 'Reintentar tema',
    activeTheme: 'Tema activo: {theme}', loadingTarget: 'Cambiando a {theme}...', halloween: 'Halloween',
    eventRemaining: '{theme} termina en {duration} ({event}).', lessThanHour: 'menos de 1 hora',
  },
} as const;
