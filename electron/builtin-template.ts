import ExcelJS from 'exceljs'

interface Entry {
  date: string
  start_time: string
  end_time: string
  break_minutes: number
  work_hours: number
  notes: string
}

const MONTH_NAMES_DE = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
]

function formatHours(h: number): string {
  if (!h || isNaN(h)) return ''
  const hours = Math.floor(h)
  const minutes = Math.round((h - hours) * 60)
  return `${hours}:${String(minutes).padStart(2, '0')}`
}

function formatMinutes(m: number): string {
  if (!m || isNaN(m)) return ''
  const hours = Math.floor(m / 60)
  const mins = m % 60
  return `${hours}:${String(mins).padStart(2, '0')}`
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

export interface BuiltinPlaceholder {
  id: string
  label: string
}

export function getBuiltinPlaceholders(): BuiltinPlaceholder[] {
  return [
    { id: '{{NAME}}', label: 'Name des Mitarbeiters' },
    { id: '{{MONAT}}', label: 'Monat (Name)' },
    { id: '{{JAHR}}', label: 'Jahr' },
    { id: '{{DATUM_n}}', label: 'Datum für Tag n (1–31)' },
    { id: '{{BEGINN_n}}', label: 'Beginn Tag n' },
    { id: '{{ENDE_n}}', label: 'Ende Tag n' },
    { id: '{{PAUSE_n}}', label: 'Pause Tag n' },
    { id: '{{STUNDEN_n}}', label: 'Arbeitsstunden Tag n' },
    { id: '{{BEMERKUNG_n}}', label: 'Bemerkung Tag n' },
    { id: '{{GESAMT_STUNDEN}}', label: 'Summe aller Stunden' },
  ]
}

function workedEntries(entries: Entry[]): Entry[] {
  return entries
    .filter((e) => (e.start_time || '').trim() || (e.end_time || '').trim() || (e.work_hours || 0) > 0)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function getBuiltinPreviewHtml(
  entries: Entry[],
  settings: Record<string, string>,
  year: number,
  month: number
): string {
  const monthStr = MONTH_NAMES_DE[month - 1]
  const totalHours = entries.reduce((s, e) => s + (e.work_hours || 0), 0)
  const name = escapeHtml(settings.name || '')
  const worked = workedEntries(entries)

  const rows: string[] = worked.map((e) => {
    const [y, m, d] = e.date.split('-')
    const date = `${d}.${m}.${y.slice(2)}`
    return (
      `<tr>` +
      `<td>${date}</td>` +
      `<td>${escapeHtml(e.start_time || '')}</td>` +
      `<td>${escapeHtml(e.end_time || '')}</td>` +
      `<td>${formatMinutes(e.break_minutes)}</td>` +
      `<td>${formatHours(e.work_hours)}</td>` +
      `<td>${escapeHtml(e.notes || '')}</td>` +
      `</tr>`
    )
  })

  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8"/>
<title>Stundenzettel ${monthStr} ${year}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111827; padding: 32px; margin: 0; background: #fff; }
  h1 { font-size: 22px; margin: 0 0 10px; }
  .meta { color: #4b5563; font-size: 12px; margin-bottom: 20px; }
  .meta div { margin-bottom: 2px; }
  .meta strong { color: #111827; display: inline-block; min-width: 130px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #9ca3af; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #f3f4f6; font-weight: 600; }
  tfoot td { font-weight: 700; background: #f9fafb; }
  .right { text-align: right; }
  .empty { padding: 20px; text-align: center; color: #6b7280; font-style: italic; }
</style>
</head>
<body>
  <h1>Stundenzettel</h1>
  <div class="meta">
    <div><strong>Name, Vorname:</strong> ${name || '—'}</div>
    <div><strong>Monat:</strong> ${monthStr} ${year}</div>
    <div><strong>Monatsstunden:</strong> ${formatHours(totalHours)}</div>
  </div>
  ${worked.length === 0 ? `<div class="empty">Keine Arbeitszeiten für diesen Monat eingetragen.</div>` : `<table>
    <thead>
      <tr>
        <th style="width:14%">Datum</th>
        <th style="width:12%">Beginn</th>
        <th style="width:12%">Ende</th>
        <th style="width:12%">Pausen</th>
        <th style="width:15%">Arbeitsstunden</th>
        <th>Bemerkung</th>
      </tr>
    </thead>
    <tbody>
      ${rows.join('')}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="4" class="right">Summe der Arbeitsstunden:</td>
        <td>${formatHours(totalHours)}</td>
        <td></td>
      </tr>
    </tfoot>
  </table>`}
</body>
</html>`
}

export async function generateBuiltinExcel(
  outputPath: string,
  entries: Entry[],
  settings: Record<string, string>,
  year: number,
  month: number
): Promise<void> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Stundenzettel')

  const monthStr = MONTH_NAMES_DE[month - 1]
  const totalHours = entries.reduce((s, e) => s + (e.work_hours || 0), 0)
  const worked = workedEntries(entries)

  sheet.mergeCells('A1:F1')
  const titleCell = sheet.getCell('A1')
  titleCell.value = 'Stundenzettel'
  titleCell.font = { bold: true, size: 14 }
  titleCell.alignment = { horizontal: 'center' }

  sheet.getCell('A3').value = 'Name, Vorname:'
  sheet.getCell('A3').font = { bold: true }
  sheet.getCell('B3').value = settings.name || ''

  sheet.getCell('A4').value = 'Monat:'
  sheet.getCell('A4').font = { bold: true }
  sheet.getCell('B4').value = `${monthStr} ${year}`

  sheet.getCell('A5').value = 'Monatsstunden:'
  sheet.getCell('A5').font = { bold: true }
  sheet.getCell('B5').value = formatHours(totalHours)

  const headerRow = 7
  const headers = ['Datum', 'Beginn', 'Ende', 'Pausen', 'Arbeitsstunden', 'Bemerkung']
  const border = {
    top: { style: 'thin' as const }, left: { style: 'thin' as const },
    bottom: { style: 'thin' as const }, right: { style: 'thin' as const },
  }
  headers.forEach((h, i) => {
    const cell = sheet.getCell(headerRow, i + 1)
    cell.value = h
    cell.font = { bold: true }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } }
    cell.border = border
    cell.alignment = { horizontal: 'left' }
  })

  worked.forEach((e, idx) => {
    const r = headerRow + 1 + idx
    const [y, m, d] = e.date.split('-')
    const date = `${d}.${m}.${y.slice(2)}`
    const values: (string | number)[] = [
      date,
      e.start_time || '',
      e.end_time || '',
      formatMinutes(e.break_minutes),
      formatHours(e.work_hours),
      e.notes || '',
    ]
    values.forEach((v, i) => {
      const cell = sheet.getCell(r, i + 1)
      cell.value = v as any
      cell.border = border
    })
  })

  const totalRow = headerRow + 1 + worked.length + 1
  sheet.mergeCells(totalRow, 1, totalRow, 4)
  const totalLabel = sheet.getCell(totalRow, 1)
  totalLabel.value = 'Summe der Arbeitsstunden:'
  totalLabel.font = { bold: true }
  totalLabel.alignment = { horizontal: 'right' }
  const totalCell = sheet.getCell(totalRow, 5)
  totalCell.value = formatHours(totalHours)
  totalCell.font = { bold: true }
  totalCell.border = border

  sheet.columns = [
    { width: 14 }, { width: 11 }, { width: 11 },
    { width: 11 }, { width: 16 }, { width: 34 },
  ]

  await workbook.xlsx.writeFile(outputPath)
}
