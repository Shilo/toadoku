import type { HintPayload, Technique } from '../contracts';
export type UiLocale = 'en' | 'de' | 'es';
const en = {
  game: 'Game', tools: 'Tools', menu: 'Menu', close: 'Close', back: 'Back', cancel: 'Cancel', continue: 'Continue',
  viewResult: 'View result', newPuzzle: 'New puzzle',
  continueLeap: (leap: number) => `Continue at Leap ${leap}`,
  unscoredIdentity: 'This puzzle earns no Dewdrops.',
  notes: 'Notes', undo: 'Undo', erase: 'Erase', hint: 'Hint', largerCell: 'Cell and notes', pause: 'Pause', settings: 'Settings', mainMenu: 'Main menu',
  language: 'Language', motion: 'Motion', system: 'System', reduced: 'Reduced', full: 'Full', boardShape: 'Board shape', fill: 'Fill space', square: 'Square',
  session: 'Session', quick: 'Quick Play', frontier: 'Progression', replay: 'Replay', easy: 'Easy', medium: 'Medium', hard: 'Hard',
  elapsed: 'Active time', wallet: 'Dewdrops', metamorphosis: 'Metamorphosis', leap: 'Leap', restart: 'Restart puzzle',
  restartTitle: 'Restart this puzzle?', restartHelp: 'Clear entries and notes. Time and hint costs stay.',
  replaceTitle: 'Replace unfinished puzzle?', replaceHelp: 'Entries and notes will be lost. Other puzzles and Dewdrops stay.', replace: 'Replace puzzle',
  paused: 'Paused', resume: 'Resume', pauseHelp: 'Time is paused.',
  completed: 'Puzzle complete', base: 'Difficulty reward', credit: 'Answers not revealed', bonus: 'Speed bonus', earned: 'Dewdrops earned',
  rewardHelp: 'Dewdrops depend on difficulty and answers solved without help. Hints remove the time bonus.',
  hintHelp: 'Hints remove the time bonus. Newly shown answers reduce Dewdrops.',
  logicalHint: 'Find a logical hint', reveal: 'Reveal selected answer', revealTitle: 'Selected answer', noHint: 'Choose a logical hint or reveal an answer.',
  inconsistent: 'This board has no solution. Check your entries.',
  noTarget: 'Choose an empty cell first.', noteHelp: 'Choose digits to toggle notes.',
  filledNotes: 'Erase the value to add notes.', clue: 'Clue', editable: 'Editable cell', value: 'Value', empty: 'Empty',
  entryHelp: 'Choose a digit or turn on Notes.',
  backup: 'Backup', export: 'Export backup', restore: 'Restore backup', backupHelp: 'Restore replaces this save, including Dewdrops. The previous save is kept for recovery.',
  emergencyExport: 'Export emergency recovery', emergencyHelp: 'Emergency files keep local changes. They need manual recovery and cannot be restored here.',
  exportFailed: 'Export failed. Retry or save emergency recovery.',
  reviewBackup: 'Review backup', previewReady: 'Backup validated. Review these changes before replacing your save.',
  recoverTitle: 'Open the saved puzzle?', recoverHelp: 'Unsaved changes in this tab. Export recovery before opening the saved puzzle.', resumeSaved: 'Resume saved puzzle',
  noStep: 'No logical hint found. You can reveal an answer.', hintUnavailable: 'Could not load a hint. Try again.', hintReady: 'Hint ready.',
  recoveryPartial: 'Local recovery only. Stored data unavailable.', recoveryUnavailable: 'Recovery export failed. Try again.',
  chooseFile: 'Choose backup file', preview: 'Preview restore', confirmRestore: 'Replace with this backup', restoreInvalid: 'Invalid backup. Choose another file. Your save is kept.',
  currentWallet: 'Current Dewdrops', importedWallet: 'Backup Dewdrops', activeAttempts: 'Active puzzles', receipts: 'Completions', issued: 'Issued puzzles',
  saved: 'Saved', saving: 'Saving…', unsaved: 'Changes are not saved', conflict: 'This view no longer owns the save', unavailable: 'Storage is unavailable', retry: 'Retry saving',
  chooseLeap: 'Choose a completed Leap', replayHelp: 'Play a fresh puzzle for Dewdrops. Your progression stays unchanged.',
  startReplay: 'Start replay', resumeReplay: 'Resume replay', replaceReplay: 'Replace unfinished replay',
  cell: (row: number, column: number) => `Row ${row}, column ${column}`,
  note: (digit: number) => `Note ${digit}`,
  answer: (cell: string, digit: number) => `${cell}: ${digit}.`,
  placements: 'Place', eliminations: 'Remove candidate', premises: 'Reason',
  unit: (kind: number, number: number) => `${['row', 'column', 'box'][kind]} ${number}`,
  singleReason: (cells: string, digits: string) => `Only ${digits} fits ${cells}.`,
  hiddenReason: (units: string, cells: string, digits: string) => `In ${units}, ${digits} can only go in ${cells}.`,
  lockedReason: (units: string, cells: string, digits: string) => `${digits} is confined to ${cells} in the intersection of ${units}. Remove it from the indicated cells outside that intersection.`,
  nakedReason: (units: string, cells: string, digits: string) => `${cells} reserve ${digits} within ${units}. Remove those candidates from the indicated other cells.`,
  subsetReason: (units: string, cells: string, digits: string) => `Within ${units}, ${digits} occur only in ${cells}. Remove the indicated other candidates from those cells.`,
  fishReason: (units: string, cells: string, digits: string) => `${digits} has exactly two positions in each base unit: ${cells}. Their shared cover units are ${units}. Remove the indicated candidates outside the four corners.`
};
export type UiCopy = typeof en;
const de: UiCopy = {
  game: 'Spiel', tools: 'Werkzeuge', menu: 'Menü', close: 'Schließen', back: 'Zurück', cancel: 'Abbrechen', continue: 'Weiter',
  viewResult: 'Ergebnis ansehen', newPuzzle: 'Neues Rätsel',
  continueLeap: leap => `Bei Sprung ${leap} fortfahren`,
  unscoredIdentity: 'Dieses Rätsel bringt keine Tautropfen.',
  notes: 'Notizen', undo: 'Rückgängig', erase: 'Löschen', hint: 'Hinweis', largerCell: 'Feld und Notizen', pause: 'Pause', settings: 'Einstellungen', mainMenu: 'Hauptmenü',
  language: 'Sprache', motion: 'Bewegung', system: 'System', reduced: 'Reduziert', full: 'Voll', boardShape: 'Feldform', fill: 'Platz ausfüllen', square: 'Quadratisch',
  session: 'Spielstand', quick: 'Schnelles Spiel', frontier: 'Fortschritt', replay: 'Wiederholung', easy: 'Leicht', medium: 'Mittel', hard: 'Schwer',
  elapsed: 'Aktive Zeit', wallet: 'Tautropfen', metamorphosis: 'Metamorphose', leap: 'Sprung', restart: 'Rätsel neu beginnen',
  restartTitle: 'Dieses Rätsel neu beginnen?', restartHelp: 'Einträge und Notizen löschen. Zeit und Hinweiskosten bleiben.',
  replaceTitle: 'Unfertiges Rätsel ersetzen?', replaceHelp: 'Einträge und Notizen gehen verloren. Andere Rätsel und Tautropfen bleiben.', replace: 'Rätsel ersetzen',
  paused: 'Pausiert', resume: 'Fortsetzen', pauseHelp: 'Die Zeit ist angehalten.',
  completed: 'Rätsel gelöst', base: 'Schwierigkeitsbelohnung', credit: 'Nicht aufgedeckte Antworten', bonus: 'Zeitbonus', earned: 'Verdiente Tautropfen',
  rewardHelp: 'Tautropfen hängen von Schwierigkeit und selbst gelösten Antworten ab. Hinweise entfernen den Zeitbonus.',
  hintHelp: 'Hinweise entfernen den Zeitbonus. Neu gezeigte Antworten verringern Tautropfen.',
  logicalHint: 'Logischen Hinweis suchen', reveal: 'Ausgewählte Antwort zeigen', revealTitle: 'Ausgewählte Antwort', noHint: 'Wähle einen logischen Hinweis oder decke eine Antwort auf.',
  inconsistent: 'Dieses Spielfeld hat keine Lösung. Prüfe deine Einträge.',
  noTarget: 'Wähle zuerst ein leeres Feld.', noteHelp: 'Wähle Ziffern, um Notizen umzuschalten.',
  filledNotes: 'Lösche den Wert, um Notizen zu ergänzen.', clue: 'Vorgabe', editable: 'Bearbeitbares Feld', value: 'Wert', empty: 'Leer',
  entryHelp: 'Wähle eine Ziffer oder schalte Notizen ein.',
  backup: 'Sicherung', export: 'Sicherung exportieren', restore: 'Sicherung wiederherstellen', backupHelp: 'Wiederherstellen ersetzt diesen Spielstand samt Tautropfen. Der vorherige Spielstand bleibt zur Rettung erhalten.',
  emergencyExport: 'Notfallrettung exportieren', emergencyHelp: 'Notfalldateien bewahren lokale Änderungen. Sie benötigen manuelle Rettung und lassen sich hier nicht wiederherstellen.',
  exportFailed: 'Export fehlgeschlagen. Wiederhole ihn oder exportiere eine Notfallrettung.',
  reviewBackup: 'Sicherung prüfen', previewReady: 'Sicherung bestätigt. Prüfe diese Änderungen, bevor du deinen Spielstand ersetzt.',
  recoverTitle: 'Gespeichertes Rätsel öffnen?', recoverHelp: 'Dieser Tab enthält ungespeicherte Änderungen. Exportiere die Rettungsdatei, bevor du das gespeicherte Rätsel öffnest.', resumeSaved: 'Gespeichertes Rätsel fortsetzen',
  noStep: 'Kein logischer Hinweis gefunden. Du kannst eine Antwort aufdecken.', hintUnavailable: 'Hinweis nicht verfügbar. Versuche es erneut.', hintReady: 'Hinweis bereit.',
  recoveryPartial: 'Nur lokale Rettung. Gespeicherte Daten nicht verfügbar.', recoveryUnavailable: 'Rettungsexport fehlgeschlagen. Versuche es erneut.',
  chooseFile: 'Sicherungsdatei wählen', preview: 'Wiederherstellung prüfen', confirmRestore: 'Mit dieser Sicherung ersetzen', restoreInvalid: 'Ungültige Sicherung. Wähle eine andere Datei. Dein Spielstand bleibt.',
  currentWallet: 'Aktuelle Tautropfen', importedWallet: 'Tautropfen der Sicherung', activeAttempts: 'Aktive Rätsel', receipts: 'Abgeschlossene Rätsel', issued: 'Ausgegebene Rätsel',
  saved: 'Gespeichert', saving: 'Wird gespeichert…', unsaved: 'Änderungen sind nicht gespeichert', conflict: 'Diese Ansicht besitzt den Spielstand nicht mehr', unavailable: 'Speicher nicht verfügbar', retry: 'Speichern wiederholen',
  chooseLeap: 'Abgeschlossenen Sprung wählen', replayHelp: 'Spiele ein neues Rätsel für Tautropfen. Dein Fortschritt bleibt unverändert.',
  startReplay: 'Wiederholung starten', resumeReplay: 'Wiederholung fortsetzen', replaceReplay: 'Unfertige Wiederholung ersetzen',
  cell: (row, column) => `Zeile ${row}, Spalte ${column}`, note: digit => `Notiz ${digit}`, answer: (cell, digit) => `${cell}: ${digit}.`,
  placements: 'Eintragen', eliminations: 'Kandidat entfernen', premises: 'Begründung', unit: (kind, number) => `${['Zeile', 'Spalte', 'Block'][kind]} ${number}`,
  singleReason: (cells, digits) => `Nur ${digits} passt in ${cells}.`, hiddenReason: (units, cells, digits) => `In ${units} kann ${digits} nur in ${cells} stehen.`,
  lockedReason: (units, cells, digits) => `${digits} ist auf ${cells} im Schnitt von ${units} beschränkt. Entferne die Ziffer aus den angegebenen Feldern außerhalb dieses Schnitts.`,
  nakedReason: (units, cells, digits) => `${cells} reservieren ${digits} in ${units}. Entferne diese Kandidaten aus den angegebenen anderen Feldern.`,
  subsetReason: (units, cells, digits) => `In ${units} kommen ${digits} nur in ${cells} vor. Entferne die angegebenen anderen Kandidaten aus diesen Feldern.`,
  fishReason: (units, cells, digits) => `${digits} hat genau zwei Positionen je Basiseinheit: ${cells}. Die gemeinsamen Quereinheiten sind ${units}. Entferne die angegebenen Kandidaten außerhalb der vier Ecken.`
};
const es: UiCopy = {
  game: 'Juego', tools: 'Herramientas', menu: 'Menú', close: 'Cerrar', back: 'Atrás', cancel: 'Cancelar', continue: 'Continuar',
  viewResult: 'Ver resultado', newPuzzle: 'Nuevo rompecabezas',
  continueLeap: leap => `Continuar en el Salto ${leap}`,
  unscoredIdentity: 'Este rompecabezas no da gotas de rocío.',
  notes: 'Notas', undo: 'Deshacer', erase: 'Borrar', hint: 'Pista', largerCell: 'Casilla y notas', pause: 'Pausa', settings: 'Ajustes', mainMenu: 'Menú principal',
  language: 'Idioma', motion: 'Movimiento', system: 'Sistema', reduced: 'Reducido', full: 'Completo', boardShape: 'Forma del tablero', fill: 'Llenar espacio', square: 'Cuadrado',
  session: 'Partida', quick: 'Partida rápida', frontier: 'Progresión', replay: 'Repetición', easy: 'Fácil', medium: 'Medio', hard: 'Difícil',
  elapsed: 'Tiempo activo', wallet: 'Gotas de rocío', metamorphosis: 'Metamorfosis', leap: 'Salto', restart: 'Reiniciar rompecabezas',
  restartTitle: '¿Reiniciar este rompecabezas?', restartHelp: 'Borra entradas y notas. Se conservan el tiempo y los costes de las pistas.',
  replaceTitle: '¿Reemplazar el rompecabezas sin terminar?', replaceHelp: 'Se perderán entradas y notas. Se conservan los otros rompecabezas y las gotas de rocío.', replace: 'Reemplazar rompecabezas',
  paused: 'En pausa', resume: 'Reanudar', pauseHelp: 'El tiempo está en pausa.',
  completed: 'Rompecabezas completado', base: 'Recompensa por dificultad', credit: 'Respuestas sin revelar', bonus: 'Bonificación de tiempo', earned: 'Gotas de rocío ganadas',
  rewardHelp: 'Las gotas de rocío dependen de la dificultad y las respuestas sin ayuda. Las pistas eliminan la bonificación de tiempo.',
  hintHelp: 'Las pistas eliminan la bonificación de tiempo. Las nuevas respuestas reveladas reducen las gotas de rocío.',
  logicalHint: 'Buscar pista lógica', reveal: 'Revelar respuesta seleccionada', revealTitle: 'Respuesta seleccionada', noHint: 'Elige una pista lógica o revela una respuesta.',
  inconsistent: 'Este tablero no tiene solución. Revisa tus entradas.',
  noTarget: 'Elige primero una casilla vacía.', noteHelp: 'Elige dígitos para activar o quitar notas.',
  filledNotes: 'Borra el valor para añadir notas.', clue: 'Pista inicial', editable: 'Casilla editable', value: 'Valor', empty: 'Vacía',
  entryHelp: 'Elige un dígito o activa Notas.',
  backup: 'Copia de seguridad', export: 'Exportar copia', restore: 'Restaurar copia', backupHelp: 'Restaurar reemplaza esta partida y sus gotas de rocío. Se conserva la partida anterior para recuperarla.',
  emergencyExport: 'Exportar recuperación de emergencia', emergencyHelp: 'Los archivos de emergencia conservan cambios locales. Necesitan recuperación manual y no se pueden restaurar aquí.',
  exportFailed: 'Error de exportación. Reintenta o guarda una recuperación de emergencia.',
  reviewBackup: 'Revisar copia', previewReady: 'Copia validada. Revisa estos cambios antes de reemplazar tu partida.',
  recoverTitle: '¿Abrir el rompecabezas guardado?', recoverHelp: 'Hay cambios sin guardar en esta pestaña. Exporta la recuperación antes de abrir el rompecabezas guardado.', resumeSaved: 'Reanudar rompecabezas guardado',
  noStep: 'No se encontró una pista lógica. Puedes revelar una respuesta.', hintUnavailable: 'No se pudo cargar una pista. Reintenta.', hintReady: 'Pista lista.',
  recoveryPartial: 'Solo recuperación local. Datos guardados no disponibles.', recoveryUnavailable: 'Error al exportar la recuperación. Reintenta.',
  chooseFile: 'Elegir archivo de copia', preview: 'Revisar restauración', confirmRestore: 'Reemplazar con esta copia', restoreInvalid: 'Copia no válida. Elige otro archivo. Se conserva tu partida.',
  currentWallet: 'Gotas de rocío actuales', importedWallet: 'Gotas de rocío de la copia', activeAttempts: 'Rompecabezas activos', receipts: 'Rompecabezas completados', issued: 'Rompecabezas iniciados',
  saved: 'Guardado', saving: 'Guardando…', unsaved: 'Los cambios no están guardados', conflict: 'Esta vista ya no controla la partida', unavailable: 'Almacenamiento no disponible', retry: 'Reintentar guardado',
  chooseLeap: 'Elegir un Salto completado', replayHelp: 'Juega un rompecabezas nuevo para ganar gotas de rocío. Tu progresión no cambia.',
  startReplay: 'Empezar repetición', resumeReplay: 'Reanudar repetición', replaceReplay: 'Reemplazar repetición sin terminar',
  cell: (row, column) => `Fila ${row}, columna ${column}`, note: digit => `Nota ${digit}`, answer: (cell, digit) => `${cell}: ${digit}.`,
  placements: 'Colocar', eliminations: 'Eliminar candidato', premises: 'Motivo', unit: (kind, number) => `${['fila', 'columna', 'bloque'][kind]} ${number}`,
  singleReason: (cells, digits) => `Solo ${digits} cabe en ${cells}.`, hiddenReason: (units, cells, digits) => `En ${units}, ${digits} solo puede ir en ${cells}.`,
  lockedReason: (units, cells, digits) => `${digits} queda limitado a ${cells} en la intersección de ${units}. Elimínalo de las casillas indicadas fuera de esa intersección.`,
  nakedReason: (units, cells, digits) => `${cells} reservan ${digits} dentro de ${units}. Elimina esos candidatos de las otras casillas indicadas.`,
  subsetReason: (units, cells, digits) => `En ${units}, ${digits} solo aparece en ${cells}. Elimina los otros candidatos indicados de esas casillas.`,
  fishReason: (units, cells, digits) => `${digits} tiene exactamente dos posiciones en cada unidad base: ${cells}. Las unidades de cobertura compartidas son ${units}. Elimina los candidatos indicados fuera de las cuatro esquinas.`
};
export const uiCopy: Record<UiLocale, UiCopy> = { en, de, es };
const techniqueNames: Record<UiLocale, Record<Technique, string>> = {
  en: { 'naked-single': 'Naked single', 'hidden-single': 'Hidden single', pointing: 'Pointing', claiming: 'Claiming', 'naked-pair': 'Naked pair', 'hidden-pair': 'Hidden pair', 'naked-triple': 'Naked triple', 'hidden-triple': 'Hidden triple', 'x-wing': 'X-Wing' },
  de: { 'naked-single': 'Nackter Einzelwert', 'hidden-single': 'Versteckter Einzelwert', pointing: 'Zeigender Kandidat', claiming: 'Beanspruchender Kandidat', 'naked-pair': 'Nacktes Paar', 'hidden-pair': 'Verstecktes Paar', 'naked-triple': 'Nacktes Tripel', 'hidden-triple': 'Verstecktes Tripel', 'x-wing': 'X-Wing' },
  es: { 'naked-single': 'Único desnudo', 'hidden-single': 'Único oculto', pointing: 'Candidato apuntado', claiming: 'Candidato reclamado', 'naked-pair': 'Pareja desnuda', 'hidden-pair': 'Pareja oculta', 'naked-triple': 'Trío desnudo', 'hidden-triple': 'Trío oculto', 'x-wing': 'X-Wing' }
};
export function describeHint(payload: HintPayload, locale: UiLocale) {
  const c = uiCopy[locale], cell = (id: number) => c.cell(Math.floor(id / 9) + 1, id % 9 + 1);
  if (payload.kind === 'inconsistent') return { title: c.hint, reason: c.inconsistent, placements: [], eliminations: [] };
  if (payload.kind === 'reveal') return { title: c.revealTitle, reason: c.answer(cell(payload.cell), payload.digit), placements: [], eliminations: [] };
  const cells = payload.witness.cells.map(cell).join('; '), digits = payload.witness.digits.join(', ');
  const unitName = (id: number) => c.unit(Math.floor(id / 9), id % 9 + 1);
  const units = payload.witness.units.map(unitName).join('; ');
  const reason = payload.technique === 'naked-single' ? c.singleReason(cells, digits) : payload.technique === 'hidden-single' ? c.hiddenReason(units, cells, digits) :
    payload.technique === 'pointing' || payload.technique === 'claiming' ? c.lockedReason(units, cells, digits) : payload.technique.startsWith('naked-') ? c.nakedReason(units, cells, digits) :
    payload.technique.startsWith('hidden-') ? c.subsetReason(units, cells, digits) : c.fishReason(payload.witness.units.slice(2).map(unitName).join('; '), cells, digits);
  const format = ({ cell: id, digit }: { cell: number; digit: number }) => c.answer(cell(id), digit);
  return { title: techniqueNames[locale][payload.technique], reason, placements: payload.placements.map(format), eliminations: payload.eliminations.map(format) };
}
export function formatElapsed(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
