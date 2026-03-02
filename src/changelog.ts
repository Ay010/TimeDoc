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
