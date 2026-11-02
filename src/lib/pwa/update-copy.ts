import type { Locale } from '../i18n';
/** Keep the ordinary-play notification independent of the optional offline panel. */
export const updateCopy: Record<Locale, { action: string; notice: string; save: string; blocked: string; updating: string; cancel: string }> = {
  en: { action: 'Update', notice: 'Update ready. Open More to update.', save: 'Saves your game and returns to the main menu.', blocked: 'Update paused. Keep playing, or resolve the save warning and try again.', updating: 'Updating…', cancel: 'Cancel' },
  de: { action: 'Update', notice: 'Update bereit. Öffne Mehr zum Aktualisieren.', save: 'Speichert dein Spiel und öffnet das Hauptmenü.', blocked: 'Update pausiert. Spiele weiter oder behebe die Speicherwarnung und versuche es erneut.', updating: 'Aktualisierung…', cancel: 'Abbrechen' },
  es: { action: 'Actualizar', notice: 'Actualización lista. Abre Más para actualizar.', save: 'Guarda tu partida y vuelve al menú principal.', blocked: 'Actualización pausada. Sigue jugando o resuelve el aviso de guardado e inténtalo de nuevo.', updating: 'Actualizando…', cancel: 'Cancelar' },
};
