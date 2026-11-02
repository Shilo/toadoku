import type { Locale } from '../i18n';

const en = {
  updateSpace: 'An update is waiting for space. Your game is safe. It will retry automatically.',
  appFilesExtra: "App files download separately.",
  offlineOptions: 'More offline options', smallTarget: 'Save 3 upcoming puzzles for each difficulty.',

  reopenOffline: 'Offline play is ready once app files and puzzles are verified.',
  installHelp: 'Install from browser menu', downloadHelp: 'How downloads work', versionHelp: "Update options",
  title: 'Install and offline', install: 'Installation', installButton: 'Install app',

  browser: 'Play here, or install from your browser menu.', available: 'Your browser can install Toadoku.',

  prompting: 'Follow the browser installation prompt.', accepted: 'Installation accepted. Open the app from your home screen when it is ready.',

  dismissed: 'Installation dismissed. You can still play here or use the browser menu.',

  installed: 'Installation reported by your browser. Open the home-screen icon to use the installed app.',

  standalone: 'Running as an installed app.', failed: 'Installation could not finish. Try your browser menu.',

  android: 'In Chrome on Android, open the browser menu and choose Install app or Add to Home screen.',

  ios: 'In Safari, use Share, then Add to Home Screen.',

  desktop: 'Use the install option in your browser address bar or menu.',

  embedded: 'Open this page in a regular browser window to install.',

  insecure: 'Installation needs a secure HTTPS page or localhost.',

  fallback: 'If installation is unavailable, try a supported browser outside private mode. You can always play in this tab.',

  background: 'Keep playing while puzzles download. Reopen this panel to cancel. Hiding the app stops puzzle preparation.',

  offline: 'Offline play', shellReady: 'App files verified for offline use.', shellMissing: 'App files are not yet verified for offline use.',

  saved: 'A saved puzzle is available.', noSaved: 'No saved puzzle yet.',

  coverage: 'Upcoming puzzles at last check', easy: 'Easy', medium: 'Medium', hard: 'Hard',

  horizon: "Other games, windows or restored backups can change these counts.",

  guarantee: "A full travel pack covers a 60-puzzle Progression run. Quick Play and replays use the same reserve.",

  prepare: 'Prepare offline play', travel: 'Prepare a longer trip', inspect: 'Check saved puzzles',

  defaultHelp: 'Small pack: targets 3 next puzzles per difficulty. Download limit: about 2.1 MB per action.',

  travelHelp: 'Travel pack: targets 25 per difficulty. Download limit: about 12.6 MB per action.',

  estimate: "Estimated puzzle download", files: 'App files download separately. Each small puzzle file is fully checked before use.',

  noAuto: 'Extra puzzle packs download only when you ask. Online games fetch the exact next puzzle when needed.',

  waiting: 'Preparing app files', preparing: 'Preparing puzzles', checking: 'Checking saved files',

  ready: 'Puzzle reserve verified.', partial: 'Some puzzles are available. Prepare again online for more.',

  cancelled: 'Preparation cancelled. Verified puzzles already saved are kept.', error: 'Preparation could not finish. Saved games are kept. Check your connection or free storage and try again.',

  cancel: 'Cancel preparation', cancelHelp: 'Cancel stops puzzle downloads. App installation or update files may finish separately.',

  remove: 'Remove extra puzzles', stored: 'Stored puzzle records', storeHelp: "Removing extra puzzles keeps saved games and rewards.",

  eviction: 'Your browser can remove local files. Keep a backup of progress before travelling.',

  persist: 'Ask browser to keep data', persisted: 'Browser retention permission granted. Backups are still needed.', denied: 'Browser retention permission was not granted.',

  version: 'Version', update: 'App updates', build: 'Running build', lastCheck: 'Last checked', never: 'Not checked yet', check: 'Check for updates',

  idle: 'No new update reported.', downloading: 'Downloading app files.', updateReady: 'Update ready. Open More to update.',

  current: 'This build is ready for offline launch.', unavailable: 'Offline app installation is unavailable here.',

  updateFailed: 'Update check or download failed. Your current app and saved progress are kept.',

  updateHelp: 'Updates download automatically. The main menu updates when safe. During a game, open More when Update appears.',

  loading: 'Loading offline controls', progress: 'Verified records', bytes: 'Puzzle file bytes received',

};

type Copy = { [K in keyof typeof en]: string };

const de: Copy = {
  updateSpace: 'Ein Update wartet auf Speicherplatz. Dein Spiel ist sicher. Es wird automatisch erneut versucht.',
  appFilesExtra: "App-Dateien werden separat geladen.",
  offlineOptions: 'Weitere Offline-Optionen', smallTarget: 'Speichere die nächsten 3 Rätsel pro Schwierigkeit.',

  reopenOffline:'Offline ist bereit, sobald App-Dateien und Rätsel geprüft sind.',
  installHelp:'Über das Browsermenü installieren', downloadHelp:'So funktionieren Downloads', versionHelp: "Update-Optionen",
  title:'Installation und offline', install:'Installation', installButton:'App installieren',

  browser:'Hier spielen oder über das Browsermenü installieren.', available:'Dein Browser kann Toadoku installieren.',

  prompting:'Folge der Installationsanfrage des Browsers.', accepted:'Installation angenommen. Öffne die App danach über den Startbildschirm.',

  dismissed:'Installation abgelehnt. Du kannst hier spielen oder das Browsermenü nutzen.',

  installed:'Der Browser meldet die Installation. Öffne das Symbol auf dem Startbildschirm.',

  standalone:'Als installierte App geöffnet.', failed:'Installation fehlgeschlagen. Versuche es im Browsermenü.',

  android:'In Chrome auf Android: Browsermenü öffnen und App installieren oder Zum Startbildschirm wählen.',

  ios:'In Safari: Teilen und dann Zum Home-Bildschirm wählen.', desktop:'Nutze die Installationsoption in der Adressleiste oder im Browsermenü.',

  embedded:'Öffne diese Seite zur Installation in einem normalen Browserfenster.', insecure:'Installation braucht HTTPS oder localhost.',

  fallback:'Falls die Installation fehlt, versuche einen unterstützten Browser außerhalb des privaten Modus. Hier kannst du immer spielen.',

  background:'Spiele während des Downloads weiter. Hier kannst du abbrechen. Ausblenden der App stoppt die Rätselvorbereitung.',

  offline:'Offline spielen', shellReady:'App-Dateien für die Offline-Nutzung geprüft.', shellMissing:'App-Dateien noch nicht für offline geprüft.',

  saved:'Ein gespeichertes Rätsel ist verfügbar.', noSaved:'Noch kein gespeichertes Rätsel.',

  coverage:'Nächste Rätsel bei letzter Prüfung', easy:'Leicht', medium:'Mittel', hard:'Schwer',

  horizon: "Andere Spiele, Fenster oder wiederhergestellte Sicherungen können diese Zahlen ändern.",

  guarantee: "Ein vollständiges Reisepaket reicht für einen Fortschrittslauf mit 60 Rätseln. Schnelles Spiel und Wiederholungen nutzen denselben Vorrat.",

  prepare:'Offline-Spiel vorbereiten', travel:'Längere Reise vorbereiten', inspect:'Gespeicherte Rätsel prüfen',

  defaultHelp:'Kleines Paket: 3 nächste Rätsel je Schwierigkeit. Download-Grenze: etwa 2,1 MB je Vorgang.',

  travelHelp:'Reisepaket: 25 je Schwierigkeit. Download-Grenze: etwa 12,6 MB je Vorgang.',

  estimate: "Geschätzter Rätsel-Download", files:'App-Dateien laden getrennt. Jede kleine Rätseldatei wird vor der Nutzung vollständig geprüft.',

  noAuto:'Zusätzliche Rätselpakete laden nur auf Wunsch. Online lädt das Spiel bei Bedarf das genaue nächste Rätsel.',

  waiting:'App-Dateien werden vorbereitet', preparing:'Rätsel werden vorbereitet', checking:'Gespeicherte Dateien werden geprüft',

  ready:'Rätselvorrat geprüft.', partial:'Einige Rätsel sind verfügbar. Bereite online weitere vor.',

  cancelled:'Vorbereitung abgebrochen. Bereits geprüfte Rätsel bleiben gespeichert.', error:'Vorbereitung fehlgeschlagen. Spielstände bleiben erhalten. Prüfe Verbindung und Speicher und versuche es erneut.',

  cancel:'Vorbereitung abbrechen', cancelHelp:'Abbrechen stoppt Rätseldateien. App-Installation oder Updates können getrennt fertigladen.',

  remove:'Zusätzliche Rätsel entfernen', stored:'Gespeicherte Rätseldaten', storeHelp: "Gespeicherte Spiele und Belohnungen bleiben beim Entfernen erhalten.",

  eviction:'Der Browser kann lokale Dateien entfernen. Sichere deinen Fortschritt vor der Reise.',

  persist:'Browser um dauerhafte Speicherung bitten', persisted:'Speichererlaubnis erteilt. Backups bleiben nötig.', denied:'Speichererlaubnis nicht erteilt.',

  version:'Version', update:'App-Updates', build:'Aktueller Build', lastCheck:'Zuletzt geprüft', never:'Noch nicht geprüft', check:'Nach Updates suchen',

  idle:'Kein neues Update gemeldet.', downloading:'App-Dateien werden geladen.', updateReady:'Update bereit. Öffne Mehr zum Aktualisieren.',

  current:'Dieser Build ist für den Offline-Start bereit.', unavailable:'Offline-Installation hier nicht verfügbar.',

  updateFailed:'Update-Prüfung oder Download fehlgeschlagen. App und Spielstände bleiben erhalten.',

  updateHelp:'Updates laden automatisch. Das Hauptmenü aktualisiert sich, sobald es sicher ist. Im Spiel öffne Mehr, wenn Update erscheint.',

  loading:'Offline-Steuerung wird geladen', progress:'Geprüfte Einträge', bytes:'Empfangene Rätseldatei-Bytes',

};

const es: Copy = {
  updateSpace: 'Una actualización espera espacio. Tu partida está a salvo. Se reintentará automáticamente.',
  appFilesExtra: "Los archivos de la aplicación se descargan aparte.",
  offlineOptions: 'Más opciones sin conexión', smallTarget: 'Guarda los próximos 3 sudokus por dificultad.',

  reopenOffline:'El juego sin conexión está listo cuando los archivos y sudokus estén verificados.',
  installHelp:'Instalar desde el menú del navegador', downloadHelp:'Cómo funcionan las descargas', versionHelp: "Opciones de actualización",
  title:'Instalación y sin conexión', install:'Instalación', installButton:'Instalar aplicación',

  browser:'Juega aquí o instala desde el menú del navegador.', available:'Tu navegador puede instalar Toadoku.',

  prompting:'Sigue la solicitud de instalación del navegador.', accepted:'Instalación aceptada. Abre la aplicación desde la pantalla de inicio cuando esté lista.',

  dismissed:'Instalación descartada. Puedes jugar aquí o usar el menú del navegador.',

  installed:'El navegador informa de la instalación. Abre el icono de la pantalla de inicio.',

  standalone:'Abierta como aplicación instalada.', failed:'La instalación falló. Prueba desde el menú del navegador.',

  android:'En Chrome para Android, abre el menú y elige Instalar aplicación o Añadir a pantalla de inicio.',

  ios:'En Safari, usa Compartir y luego Añadir a pantalla de inicio.', desktop:'Usa la opción de instalar en la barra de direcciones o el menú del navegador.',

  embedded:'Abre esta página en una ventana normal del navegador para instalar.', insecure:'La instalación necesita HTTPS o localhost.',

  fallback:'Si no puedes instalar, prueba un navegador compatible fuera del modo privado. Siempre puedes jugar aquí.',

  background:'Puedes jugar durante la descarga. Vuelve aquí para cancelar. Ocultar la aplicación detiene la preparación de sudokus.',
  offline:'Jugar sin conexión', shellReady:'Archivos de la aplicación verificados para uso sin conexión.', shellMissing:'Los archivos aún no están verificados para uso sin conexión.',

  saved:'Hay un sudoku guardado.', noSaved:'Aún no hay sudokus guardados.',

  coverage:'Próximos sudokus en la última comprobación', easy:'Fácil', medium:'Medio', hard:'Difícil',

  horizon: "Otras partidas, ventanas o copias restauradas pueden cambiar estas cifras.",

  guarantee: "Un paquete de viaje completo cubre una partida de Progresión de 60 sudokus. Partida rápida y repeticiones usan la misma reserva.",

  prepare:'Preparar juego sin conexión', travel:'Preparar un viaje largo', inspect:'Comprobar sudokus guardados',

  defaultHelp:'Paquete pequeño: 3 próximos sudokus por dificultad. Límite de descarga: unos 2,1 MB por acción.',

  travelHelp:'Paquete de viaje: 25 por dificultad. Límite de descarga: unos 12,6 MB por acción.',

  estimate: "Descarga estimada de sudokus", files:'Los archivos de la aplicación se descargan aparte. Cada archivo pequeño de sudokus se verifica por completo antes de usarlo.',

  noAuto:'Los paquetes adicionales solo se descargan si lo pides. Online se descarga el próximo sudoku exacto cuando hace falta.',

  waiting:'Preparando archivos de la aplicación', preparing:'Preparando sudokus', checking:'Comprobando archivos guardados',

  ready:'Reserva de sudokus verificada.', partial:'Hay algunos sudokus disponibles. Prepara más cuando tengas conexión.',

  cancelled:'Preparación cancelada. Se conservan los sudokus ya verificados.', error:'La preparación falló. Las partidas se conservan. Comprueba la conexión o libera espacio y vuelve a intentarlo.',

  cancel:'Cancelar preparación', cancelHelp:'Cancelar detiene los sudokus. La instalación o los archivos de actualización pueden terminar por separado.',

  remove:'Eliminar sudokus adicionales', stored:'Datos de sudokus guardados', storeHelp: "Eliminar sudokus extra conserva las partidas guardadas y las recompensas.",

  eviction:'El navegador puede eliminar archivos locales. Guarda una copia de tu progreso antes de viajar.',

  persist:'Pedir al navegador que conserve los datos', persisted:'Permiso concedido. Aún necesitas copias de seguridad.', denied:'El navegador no concedió el permiso.',

  version:'Versión', update:'Actualizaciones', build:'Versión en ejecución', lastCheck:'Última comprobación', never:'Sin comprobar aún', check:'Buscar actualizaciones',

  idle:'No se informa de nuevas actualizaciones.', downloading:'Descargando archivos de la aplicación.', updateReady:'Actualización lista. Abre Más para actualizar.',

  current:'Esta versión está lista para abrir sin conexión.', unavailable:'La instalación sin conexión no está disponible aquí.',

  updateFailed:'La comprobación o descarga falló. Se conservan la aplicación actual y las partidas.',

  updateHelp:'Las actualizaciones se descargan automáticamente. El menú principal se actualiza cuando es seguro. Durante una partida, abre Más cuando aparezca Actualizar.',

  loading:'Cargando controles sin conexión', progress:'Registros verificados', bytes:'Bytes de sudokus recibidos',

};

export const pwaCopy: Record<Locale, Copy> = { en, de, es };

export function formatBytes(bytes: number, locale: Locale): string {
  const format = new Intl.NumberFormat(locale, {maximumFractionDigits: 1});
  return bytes < 1000 ? String(Math.ceil(bytes)) + ' B' : bytes < 1_000_000 ? format.format(bytes / 1000) + ' kB' : format.format(bytes / 1_000_000) + ' MB';
}
