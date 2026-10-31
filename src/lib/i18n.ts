export type Locale = 'en' | 'de' | 'es';
export interface Copy {
  quick: string; progression: string; easy: string; medium: string; hard: string;
  newGame: string; continueGame: string; back: string; more: string; resume: string;
  mainMenu: string; paused: string; example: string; unavailable: string;
  art: string; empty: string; notes: string; cell: (row: number, col: number) => string;
}
export const dictionaries: Record<Locale, Copy> = {
  en: { quick: 'Quick Play', progression: 'Progression', easy: 'Easy', medium: 'Medium', hard: 'Hard', newGame: 'New game', continueGame: 'Continue', back: 'Back', more: 'More', resume: 'Resume', mainMenu: 'Back to main menu', paused: 'Take a breather', example: 'Example board. Selection only; numbers and tools are unavailable.', unavailable: 'Unavailable in this preview', art: 'Artwork to come', empty: 'empty', notes: 'example notes', cell: (r,c) => `Row ${r}, column ${c}` },
  de: { quick: 'Schnellspiel', progression: 'Fortschritt', easy: 'Leicht', medium: 'Mittel', hard: 'Schwer', newGame: 'Neues Spiel', continueGame: 'Fortsetzen', back: 'Zurück', more: 'Mehr', resume: 'Weiterspielen', mainMenu: 'Zurück zum Hauptmenü', paused: 'Eine kleine Pause', example: 'Beispielbrett. Nur Auswahl; Zahlen und Werkzeuge sind nicht verfügbar.', unavailable: 'In dieser Vorschau nicht verfügbar', art: 'Illustration folgt', empty: 'leer', notes: 'Beispielnotizen', cell: (r,c) => `Zeile ${r}, Spalte ${c}` },
  es: { quick: 'Partida rápida', progression: 'Progresión', easy: 'Fácil', medium: 'Media', hard: 'Difícil', newGame: 'Nueva partida', continueGame: 'Continuar', back: 'Volver', more: 'Más', resume: 'Reanudar', mainMenu: 'Volver al menú principal', paused: 'Un pequeño descanso', example: 'Tablero de ejemplo. Solo selección; números y herramientas no disponibles.', unavailable: 'No disponible en esta vista previa', art: 'Ilustración pendiente', empty: 'vacía', notes: 'notas de ejemplo', cell: (r,c) => `Fila ${r}, columna ${c}` }
};
export function resolveLocale(language: string): Locale {
  const code = language.toLowerCase().split('-')[0];
  return code === 'de' || code === 'es' ? code : 'en';
}
