# TimeDoc

Stundentracker-Desktop-App für Freelance-Arbeitszeiten, exportiert Stundenzettel und Rechnungen.
Wird vom Author (Ayyub Qarar, Freelance-Entwickler, Kleinunternehmer § 19 UStG) produktiv genutzt.

## Stack

- **Electron 33** (main + preload), **Vite 6**, **React 18**, **TypeScript**, **Tailwind**
- **Zustand** für State
- **sql.js** (SQLite in WASM) für Persistenz
- **docxtemplater** (Word) + **exceljs** (Excel) für Template-Rendering
- PDF-Erzeugung: `BrowserWindow.webContents.printToPDF()` (keine separate PDF-Lib nötig)

## Verzeichnisstruktur

- `electron/` — Main-Process (`main.ts`, `preload.ts`, `database.ts`, `document-engine.ts`, `builtin-template.ts`, `backup.ts`, `crypto.ts`)
- `src/` — Renderer (React)
  - `components/` — UI (`MonthView`, `ExportButton`, `ExportDialog`, `TemplateManager`, `BuiltinTemplateSection`, `SettingsPanel`, `TemplateEditor`, `EmailTemplate`, …)
  - `stores/` — Zustand Stores (`useEntryStore`, `useSettingsStore`, `useCustomFieldsStore`)
  - `types.ts` — `window.api` TypeScript declarations (muss synchron mit `electron/preload.ts` bleiben)
  - `i18n.ts` — DE + EN Übersetzungen (DE ist die primäre Sprache, UI-Texte sind deutsch gedacht)
- `scripts/afterPack.js` — Post-Packaging Icon-Rewrite
- User-Daten zur Laufzeit: `app.getPath('userData')/timedoc-data/` mit `backups/`, `vorlagen/`, `exporte/`, `stunden.db`

## Datenmodell (wichtig für Templates)

`TimeEntry`: `date (YYYY-MM-DD)`, `start_time (HH:MM)`, `end_time (HH:MM)`, `break_minutes`, `work_hours`, `notes`
Settings: key/value-Tabelle, sensible Keys werden über `crypto.ts` verschlüsselt (`isSensitiveKey`).
Custom Fields: eigene `{{CUSTOM_xxx}}`-Platzhalter aus `custom_fields`-Tabelle.

## Template-System

Zwei Arten von Vorlagen:

1. **User-Upload-Vorlagen** (`vorlagen/`): `.docx` oder `.xlsx` mit `{{PLACEHOLDER}}`-Syntax, werden von `document-engine.ts` via docxtemplater/exceljs gefüllt. Optionales Feld-Mapping in `template_mappings`-Tabelle.
2. **Eingebaute Vorlage** (`electron/builtin-template.ts`): programmatisch generiert, kein Upload nötig. Rendert HTML-Preview (für in-app Vorschau + printToPDF) und Excel direkt über ExcelJS.

**Standard-Platzhalter** (gebaut in `document-engine.ts::buildTemplateData`): `NAME`, `EMAIL`, `ADRESSE_*`, `MONAT`, `JAHR`, `GESAMT_STUNDEN`, `STUNDENSATZ`, `BETRAG`, `RECHNUNGSNUMMER`, `RECHNUNGSDATUM`, `IBAN/BIC/BANK`, `AUFTRAGGEBER_*`, `LEISTUNGSZEITRAUM`, sowie pro Tag 1–31: `DATUM_n`, `BEGINN_n`, `ENDE_n`, `PAUSE_n`, `STUNDEN_n`, `BEMERKUNG_n`.

## Format der eingebauten Vorlage (Stundenzettel)

Muss dem echten Arbeits-Stundenzettel des Users entsprechen:

- Titel: `Stundenzettel`
- Kopf: `Name, Vorname:`, `Monat:`, `Monatsstunden:`
- Spalten (6): **Datum | Beginn | Ende | Pausen | Arbeitsstunden | Bemerkung** — *keine* `Tag`-Spalte
- **Nur tatsächlich gearbeitete Tage** werden gelistet (nicht alle 31)
- Fußzeile: `Summe der Arbeitsstunden:`
- **Keine Unterschriftenzeile** — wird von der Arbeit nicht verlangt
- Datumsformat: `DD.MM.YY`
- Zeiten: `HH:MM`

## Export-Flow

`ExportButton` → `ExportDialog` (Checkboxen) → `window.api.export.generate(year, month, selection)` → `export:generate` IPC in `main.ts`.

`selection = { builtin: { excel?, pdf? }, userTemplates: string[] | null }`
- `userTemplates` undefined → alle User-Vorlagen (legacy)
- `userTemplates` Array → Filter
- `builtin.excel/pdf` → generiert zusätzlich die eingebaute Vorlage

Ausgabe-Dateinamen: `{docType}_{fullName}_{YYYY-MM}.{ext}`, Beispiele: `Stundenzettel-Standard_Ayyub-Qarar_2026-03.pdf`, `Rechnung_Ayyub-Qarar_2026-03.docx`.

## Build & Dev

```bash
npm run electron:dev      # Vite dev server + Electron
npm run build             # tsc + vite build + electron-builder (full Windows build, nur unter Windows)
```

### Build aus WSL

Native Windows-Build klappt von WSL aus *mit Einschränkungen*:

- `@rollup/rollup-linux-x64-gnu` muss installiert sein (nicht in package.json gespeichert — die node_modules stammen üblicherweise aus Windows)
- `scripts/afterPack.js` überspringt den `rcedit`-Icon-Schritt wenn `process.platform !== 'win32'` (unter WSL lässt sich rcedit-x64.exe nicht ausführen). Unter Windows läuft der Step normal.
- NSIS-Installer-Target braucht Wine (haben wir nicht). Zum Testen von WSL aus: `npx electron-builder --win --dir` → liefert nur `release/win-unpacked/` mit direkt ausführbarer `TimeDoc.exe`.

## Konventionen

- **Sprache:** DE-first. Neue UI-Keys zuerst in `de`-Block von `i18n.ts`, dann spiegeln in `en`.
- **Keine Kommentare ins Template-HTML**, das an printToPDF geht — Pfad durch ein hidden BrowserWindow ist heikel.
- Bei `preload.ts`-Änderungen **immer** `src/types.ts` synchronisieren, sonst bricht der Renderer-Typecheck.
- Neue IPC-Handler im `registerIpcHandlers(dataPath)`-Block in `main.ts` hinzufügen.
