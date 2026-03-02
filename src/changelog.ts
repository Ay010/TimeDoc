import type { Lang } from './i18n'

export interface ChangelogHighlight {
  title: Record<Lang, string>
  description: Record<Lang, string>
}

export interface ChangelogEntry {
  version: string
  date: string
  highlights: ChangelogHighlight[]
}

export const changelog: ChangelogEntry[] = [
  {
    version: '1.5',
    date: '2026-03-02',
    highlights: [
      {
        title: { en: 'Custom Fields', de: 'Eigene Felder' },
        description: {
          en: 'Create your own variables in Settings and use them in your Word/Excel templates and email drafts.',
          de: 'Erstelle eigene Variablen in den Einstellungen und verwende sie in deinen Word/Excel-Vorlagen und E-Mail-Entwürfen.',
        },
      },
      {
        title: { en: 'Email Month Selection', de: 'E-Mail Monat anpassen' },
        description: {
          en: 'Override the automatically calculated month in the email template to generate invoices for any period.',
          de: 'Den automatisch berechneten Monat in der E-Mail-Vorlage manuell ändern, um Rechnungen für beliebige Zeiträume zu erstellen.',
        },
      },
    ],
  },
  {
    version: '1.4',
    date: '2026-03-01',
    highlights: [
      {
        title: { en: 'Multi-Language Support', de: 'Mehrsprachigkeit' },
        description: {
          en: 'Switch between English and German in Settings.',
          de: 'Wechsel zwischen Englisch und Deutsch in den Einstellungen.',
        },
      },
      {
        title: { en: 'Backup Transfer', de: 'Backup übertragen' },
        description: {
          en: 'Export backups to USB, desktop, or any location — and import them on a new device.',
          de: 'Backups auf USB, Desktop oder beliebigen Ort exportieren — und auf neuem Gerät importieren.',
        },
      },
      {
        title: { en: 'Auto-Update', de: 'Auto-Update' },
        description: {
          en: 'The app now updates automatically when a new version is available.',
          de: 'Die App aktualisiert sich jetzt automatisch, wenn eine neue Version verfügbar ist.',
        },
      },
    ],
  },
]

export function getMinorVersion(version: string): string {
  const parts = version.split('.')
  return `${parts[0]}.${parts[1]}`
}
