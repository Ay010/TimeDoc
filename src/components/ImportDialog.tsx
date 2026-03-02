import { useState } from 'react'
import { useI18n } from '../i18n'
import { useEntryStore } from '../stores/useEntryStore'

interface ParsedRow {
  date: string
  start_time: string
  end_time: string
  break_minutes: number
  work_hours: number
  notes: string
  valid: boolean
  raw: string
}

const MONTH_NAMES: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  januar: 1, februar: 2, 'märz': 3, maerz: 3, mai: 5, juni: 6,
  juli: 7, oktober: 10, dezember: 12,
}

const WEEKDAY_PREFIXES = /^(?:mo|di|mi|do|fr|sa|so|mon|tue|wed|thu|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)[.,]?\s*/i

const HEADER_KEYWORDS = ['datum', 'date', 'tag', 'day', 'beginn', 'start', 'ende', 'end', 'pause', 'break', 'stunden', 'hours', 'bemerkung', 'notes', 'anmerkung', 'zeit', 'time']

function normalizeYear(y: string): string {
  if (y.length === 2) return '20' + y
  return y
}

function buildDate(day: string, month: string, year: string): string {
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

function parseDate(raw: string, fallbackYear: number): string | null {
  raw = raw.trim()

  // Strip weekday prefix: "Mo 01.03.26", "Mon, 01.03.26", "Montag 01.03"
  raw = raw.replace(WEEKDAY_PREFIXES, '')

  // Collapse inner whitespace
  raw = raw.replace(/\s+/g, ' ').trim()

  let m: RegExpMatchArray | null

  // DD.MM.YY(YY) or DD-MM-YY(YY) or DD/MM/YY(YY)
  m = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/)
  if (m) return buildDate(m[1], m[2], normalizeYear(m[3]))

  // YYYY-MM-DD or YYYY/MM/DD
  m = raw.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/)
  if (m) return buildDate(m[3], m[2], m[1])

  // DD.MM or DD/MM or DD-MM (no year)
  m = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-]?$/)
  if (m) return buildDate(m[1], m[2], String(fallbackYear))

  // "March 1, 2026" / "Mar 1 26" / "1 March 2026" / "1. März 2026"
  m = raw.match(/^(\d{1,2})\.?\s+([a-zäöü]+)\s+(\d{2,4})$/i)
  if (m && MONTH_NAMES[m[2].toLowerCase()]) {
    return buildDate(m[1], String(MONTH_NAMES[m[2].toLowerCase()]), normalizeYear(m[3]))
  }
  m = raw.match(/^([a-zäöü]+)\s+(\d{1,2}),?\s*(\d{2,4})$/i)
  if (m && MONTH_NAMES[m[1].toLowerCase()]) {
    return buildDate(m[2], String(MONTH_NAMES[m[1].toLowerCase()]), normalizeYear(m[3]))
  }

  // "1. März" / "March 1" (no year)
  m = raw.match(/^(\d{1,2})\.?\s+([a-zäöü]+)$/i)
  if (m && MONTH_NAMES[m[2].toLowerCase()]) {
    return buildDate(m[1], String(MONTH_NAMES[m[2].toLowerCase()]), String(fallbackYear))
  }
  m = raw.match(/^([a-zäöü]+)\s+(\d{1,2})$/i)
  if (m && MONTH_NAMES[m[1].toLowerCase()]) {
    return buildDate(m[2], String(MONTH_NAMES[m[1].toLowerCase()]), String(fallbackYear))
  }

  return null
}

function parseTime(raw: string): string | null {
  raw = raw.trim().toLowerCase()

  let m: RegExpMatchArray | null

  // HH:MM or H:MM
  m = raw.match(/^(\d{1,2}):(\d{2})$/)
  if (m) return `${m[1].padStart(2, '0')}:${m[2]}`

  // HH.MM or H.MM (dot as separator)
  m = raw.match(/^(\d{1,2})\.(\d{2})$/)
  if (m) {
    const h = parseInt(m[1])
    if (h <= 24) return `${m[1].padStart(2, '0')}:${m[2]}`
  }

  // 9h00 / 14h30
  m = raw.match(/^(\d{1,2})h(\d{2})$/)
  if (m) return `${m[1].padStart(2, '0')}:${m[2]}`

  // 9h / 14h (full hour)
  m = raw.match(/^(\d{1,2})h$/)
  if (m) return `${m[1].padStart(2, '0')}:00`

  // "9 Uhr" / "14 uhr"
  m = raw.match(/^(\d{1,2})\s*uhr$/)
  if (m) return `${m[1].padStart(2, '0')}:00`

  // 0900 / 1430 (4-digit military)
  m = raw.match(/^(\d{2})(\d{2})$/)
  if (m) {
    const h = parseInt(m[1]), min = parseInt(m[2])
    if (h <= 24 && min < 60) return `${m[1]}:${m[2]}`
  }

  // 12h format: "2:30 PM", "2:30PM", "2 PM"
  m = raw.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/)
  if (m) {
    let h = parseInt(m[1])
    const min = m[2] ? parseInt(m[2]) : 0
    if (m[3] === 'pm' && h < 12) h += 12
    if (m[3] === 'am' && h === 12) h = 0
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
  }

  return null
}

function parseBreakMinutes(raw: string): number {
  raw = raw.trim()
  if (!raw || raw === '0' || raw === '0:00' || raw === '00:00') return 0

  // H:MM or HH:MM
  const hm = raw.match(/^(\d{1,2}):(\d{2})$/)
  if (hm) return parseInt(hm[1]) * 60 + parseInt(hm[2])

  // Decimal hours: "0.5" = 30min, "1,5" = 90min
  const dec = raw.replace(',', '.')
  const num = parseFloat(dec)
  if (!isNaN(num)) {
    // If value <= 5, treat as hours (0.5 = 30min). Otherwise treat as minutes.
    if (num > 0 && num <= 5 && dec.includes('.')) return Math.round(num * 60)
    if (!isNaN(parseInt(raw))) return parseInt(raw)
  }

  // "30 min" / "30min" / "45 Min"
  const minMatch = raw.match(/^(\d+)\s*min/i)
  if (minMatch) return parseInt(minMatch[1])

  return 0
}

function parseWorkHours(raw: string): number | null {
  raw = raw.trim()
  if (!raw || raw === '0:00' || raw === '00:00') return null

  // H:MM or HH:MM
  const hm = raw.match(/^(\d{1,2}):(\d{2})$/)
  if (hm) return parseInt(hm[1]) + parseInt(hm[2]) / 60

  // Strip trailing "h" or "std": "8h", "7.5h", "8 Std"
  const stripped = raw.replace(/\s*(h|std\.?|hours?|stunden?)$/i, '').trim()

  const num = parseFloat(stripped.replace(',', '.'))
  if (!isNaN(num) && num > 0) return num

  return null
}

function isHeaderRow(cols: string[]): boolean {
  const lower = cols.map(c => c.toLowerCase().replace(/[^a-zäöü]/g, ''))
  return lower.some(c => HEADER_KEYWORDS.includes(c))
}

function calcWorkHours(start: string, end: string, breakMins: number): number {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const totalMinutes = (eh * 60 + em) - (sh * 60 + sm) - breakMins
  return Math.max(0, totalMinutes / 60)
}

function splitGluedData(text: string): string {
  const datePattern = /(\d{1,2}\.\d{1,2}\.\d{2,4})/g
  const parts = text.split(datePattern).filter(Boolean)
  if (parts.length < 2) return text

  const lines: string[] = []
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    if (/^\d{1,2}\.\d{1,2}\.\d{2,4}$/.test(part)) {
      const timePart = (i + 1 < parts.length && !/^\d{1,2}\.\d{1,2}\.\d{2,4}$/.test(parts[i + 1]))
        ? parts[i + 1]
        : ''
      if (timePart) {
        const times = timePart.match(/\d{1,2}:\d{2}/g) || []
        lines.push([part, ...times].join('\t'))
        i++
      } else {
        lines.push(part)
      }
    }
  }
  return lines.join('\n')
}

function splitColumns(line: string): string[] {
  // Tab-separated (highest priority)
  if (line.includes('\t')) return line.split('\t').map(c => c.trim())

  // Semicolon-separated
  if (line.includes(';')) return line.split(';').map(c => c.trim())

  // Pipe-separated
  if (line.includes('|')) return line.split('|').map(c => c.trim())

  // Comma-separated, but only if commas aren't inside decimal numbers
  // Heuristic: if there's a comma not adjacent to a digit on both sides, it's a separator
  if (line.includes(',')) {
    const commaParts = line.split(',').map(c => c.trim())
    if (commaParts.length >= 3) {
      const looksLikeCSV = commaParts.some(p => /^\d{1,2}[./-]\d{1,2}/.test(p) || parseTime(p) !== null)
      if (looksLikeCSV) return commaParts
    }
  }

  // Multiple spaces (2+) as separator
  const spaceParts = line.split(/\s{2,}/).map(c => c.trim()).filter(Boolean)
  if (spaceParts.length >= 3) return spaceParts

  // Dash-separated time ranges: "01.03. 9:00-17:00" or "01.03. 9:00 - 17:00"
  const dashRange = line.match(/^(.+?)\s+(\d{1,2}[:.h]\d{0,2})\s*[-–—]\s*(\d{1,2}[:.h]\d{0,2})\s*(.*)$/)
  if (dashRange) {
    const parts = [dashRange[1], dashRange[2], dashRange[3]]
    if (dashRange[4]) parts.push(dashRange[4])
    return parts.map(c => c.trim())
  }

  // Fallback: single spaces (only if >= 3 parts and looks structured)
  const singleSpaceParts = line.split(/\s+/).filter(Boolean)
  if (singleSpaceParts.length >= 3) return singleSpaceParts

  return [line]
}

function detectColumnMapping(headerCols: string[]): Record<string, number> | null {
  const map: Record<string, number> = {}
  const lower = headerCols.map(c => c.toLowerCase().replace(/[^a-zäöü0-9]/g, ''))

  for (let i = 0; i < lower.length; i++) {
    const col = lower[i]
    if (['datum', 'date', 'tag', 'day'].includes(col) && map['date'] === undefined) map['date'] = i
    else if (['beginn', 'start', 'von', 'from', 'startzeit', 'starttime', 'anfang'].includes(col) && map['start'] === undefined) map['start'] = i
    else if (['ende', 'end', 'bis', 'to', 'endzeit', 'endtime', 'schluss'].includes(col) && map['end'] === undefined) map['end'] = i
    else if (['pause', 'break', 'pausemin', 'breakmin'].includes(col) && map['break'] === undefined) map['break'] = i
    else if (['stunden', 'hours', 'arbeitsstunden', 'workhours', 'std', 'zeit', 'time', 'dauer', 'duration'].includes(col) && map['hours'] === undefined) map['hours'] = i
    else if (['bemerkung', 'notes', 'notiz', 'anmerkung', 'kommentar', 'comment', 'beschreibung', 'description', 'note'].includes(col) && map['notes'] === undefined) map['notes'] = i
  }

  if (Object.keys(map).length >= 2) return map
  return null
}

function parsePastedData(text: string, fallbackYear: number): ParsedRow[] {
  text = splitGluedData(text)

  const lines = text.split('\n').filter(l => l.trim())
  const results: ParsedRow[] = []

  let columnMap: Record<string, number> | null = null

  // Check if first line is a header
  if (lines.length > 1) {
    const firstCols = splitColumns(lines[0])
    if (isHeaderRow(firstCols)) {
      columnMap = detectColumnMapping(firstCols)
      lines.shift()
    }
  }

  for (const line of lines) {
    const cols = splitColumns(line)

    if (isHeaderRow(cols)) continue
    if (cols.length < 2) continue

    // Hours-only line: "01.03. 8h" / "01.03. — 7.5 Std"
    if (cols.length <= 3) {
      const hoursOnly = tryParseHoursOnly(cols, fallbackYear)
      if (hoursOnly) {
        results.push(hoursOnly)
        continue
      }
    }

    if (columnMap) {
      const mapped = parseWithColumnMap(cols, columnMap, fallbackYear)
      if (mapped) { results.push({ ...mapped, raw: line }); continue }
    }

    // Auto-detect: find date column
    let dateCol = -1
    for (let i = 0; i < Math.min(cols.length, 4); i++) {
      if (parseDate(cols[i], fallbackYear)) { dateCol = i; break }
    }
    if (dateCol === -1) continue

    const date = parseDate(cols[dateCol], fallbackYear)!
    const remaining = cols.filter((_, i) => i !== dateCol)

    let start_time = ''
    let end_time = ''
    let break_minutes = 0
    let work_hours = 0
    let notes = ''

    // Find all time-like columns
    const timeColumns: number[] = []
    for (let i = 0; i < remaining.length; i++) {
      if (parseTime(remaining[i])) timeColumns.push(i)
    }

    if (timeColumns.length >= 2) {
      start_time = parseTime(remaining[timeColumns[0]])!
      end_time = parseTime(remaining[timeColumns[1]])!

      // Remaining columns after the first two times
      const usedIndices = new Set(timeColumns.slice(0, 2))
      const leftover = remaining.filter((_, i) => !usedIndices.has(i))

      let foundBreak = false
      let foundHours = false
      const notesParts: string[] = []

      for (const val of leftover) {
        if (!foundBreak && (val.includes(':') || /^\d+\s*min/i.test(val) || /^0[.,]\d+$/.test(val))) {
          const b = parseBreakMinutes(val)
          if (b >= 0) { break_minutes = b; foundBreak = true; continue }
        }
        if (!foundHours) {
          const wh = parseWorkHours(val)
          if (wh !== null) { work_hours = wh; foundHours = true; continue }
        }
        if (val && !parseTime(val)) notesParts.push(val)
      }

      notes = notesParts.join(' ').trim()
      if (!work_hours) work_hours = calcWorkHours(start_time, end_time, break_minutes)
    } else if (remaining.length >= 1) {
      // Try hours-only with remaining
      const wh = parseWorkHours(remaining[0])
      if (wh !== null && wh > 0) {
        work_hours = wh
        notes = remaining.slice(1).filter(v => !parseWorkHours(v)).join(' ').trim()
      }
    }

    const valid = !!(date && ((start_time && end_time && work_hours > 0) || work_hours > 0))

    results.push({ date, start_time, end_time, break_minutes, work_hours, notes, valid, raw: line })
  }

  return mergeSameDay(results).sort((a, b) => a.date.localeCompare(b.date))
}

function tryParseHoursOnly(cols: string[], fallbackYear: number): ParsedRow | null {
  let date: string | null = null
  let hours: number | null = null

  for (const col of cols) {
    const cleaned = col.replace(/^[-–—]+\s*/, '').replace(/\s*[-–—]+$/, '').trim()
    if (!cleaned) continue
    if (!date) {
      const d = parseDate(cleaned, fallbackYear)
      if (d) { date = d; continue }
    }
    if (hours === null) {
      const wh = parseWorkHours(cleaned)
      if (wh !== null && wh > 0) { hours = wh; continue }
    }
  }

  if (date && hours !== null) {
    return {
      date, start_time: '', end_time: '', break_minutes: 0,
      work_hours: hours, notes: '', valid: true, raw: cols.join(' '),
    }
  }
  return null
}

function parseWithColumnMap(
  cols: string[], map: Record<string, number>, fallbackYear: number
): Omit<ParsedRow, 'raw'> | null {
  const get = (key: string) => (map[key] !== undefined && cols[map[key]]) ? cols[map[key]].trim() : ''

  const date = parseDate(get('date'), fallbackYear)
  if (!date) return null

  const start_time = parseTime(get('start')) || ''
  const end_time = parseTime(get('end')) || ''
  const break_minutes = parseBreakMinutes(get('break'))
  let work_hours = parseWorkHours(get('hours')) ?? 0
  const notes = get('notes')

  if (!work_hours && start_time && end_time) {
    work_hours = calcWorkHours(start_time, end_time, break_minutes)
  }

  const valid = !!(date && ((start_time && end_time && work_hours > 0) || work_hours > 0))
  return { date, start_time, end_time, break_minutes, work_hours, notes, valid }
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function mergeSameDay(rows: ParsedRow[]): ParsedRow[] {
  const byDate = new Map<string, ParsedRow[]>()
  for (const row of rows) {
    if (!row.valid) continue
    const existing = byDate.get(row.date) || []
    existing.push(row)
    byDate.set(row.date, existing)
  }

  const merged: ParsedRow[] = []
  for (const [date, dayRows] of byDate) {
    if (dayRows.length === 1) {
      merged.push(dayRows[0])
      continue
    }

    // Sort by start time
    dayRows.sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time))

    const earliestStart = dayRows[0].start_time
    const latestEnd = dayRows.reduce((latest, r) => {
      return timeToMinutes(r.end_time) > timeToMinutes(latest) ? r.end_time : latest
    }, dayRows[0].end_time)

    // Total worked = sum of each block's work time
    let totalWorkedMins = 0
    for (const r of dayRows) {
      totalWorkedMins += timeToMinutes(r.end_time) - timeToMinutes(r.start_time)
    }

    const totalSpanMins = timeToMinutes(latestEnd) - timeToMinutes(earliestStart)
    const breakMins = Math.max(0, totalSpanMins - totalWorkedMins)

    const notes = dayRows
      .map(r => r.notes)
      .filter(Boolean)
      .join(', ')

    merged.push({
      date,
      start_time: earliestStart,
      end_time: latestEnd,
      break_minutes: breakMins,
      work_hours: totalWorkedMins / 60,
      notes: notes || `${dayRows.length} Einträge zusammengefügt`,
      valid: true,
      raw: dayRows.map(r => r.raw).join(' | '),
    })
  }

  // Add back invalid rows
  for (const row of rows) {
    if (!row.valid) merged.push(row)
  }

  return merged
}

interface Props {
  onClose: () => void
}

function ImportDialog({ onClose }: Props) {
  const t = useI18n((s) => s.t)
  const [pasteText, setPasteText] = useState('')
  const [parsed, setParsed] = useState<ParsedRow[] | null>(null)
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState(false)

  const { currentYear, currentMonth, upsertEntry, loadEntries } = useEntryStore()

  function handleParse() {
    const rows = parsePastedData(pasteText, currentYear)
    setParsed(rows)
  }

  async function handleImport() {
    if (!parsed) return
    setImporting(true)

    const validRows = parsed.filter(r => r.valid)
    for (const row of validRows) {
      await upsertEntry({
        date: row.date,
        start_time: row.start_time,
        end_time: row.end_time,
        break_minutes: row.break_minutes,
        work_hours: row.work_hours,
        notes: row.notes,
      })
    }

    await loadEntries()
    setImporting(false)
    setDone(true)
  }

  function formatHours(h: number): string {
    const hours = Math.floor(h)
    const mins = Math.round((h - hours) * 60)
    return `${hours}:${String(mins).padStart(2, '0')}`
  }

  const validCount = parsed?.filter(r => r.valid).length ?? 0
  const invalidCount = parsed ? parsed.length - validCount : 0

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">{t('import.title')}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-4">
          {!done ? (
            <>
              {!parsed ? (
                <>
                  <p className="text-sm text-gray-600">
                    {t('import.description')}
                  </p>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                    <p className="text-xs font-semibold text-gray-600 mb-2">{t('import.formatsTitle')}</p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                      <div>
                        <p className="font-medium text-gray-500 mb-0.5">{t('import.formatsDate')}</p>
                        <p className="font-mono text-gray-400">01.03.26 · 01/03/2026 · 2026-03-01</p>
                        <p className="font-mono text-gray-400">1. März 2026 · March 1, 2026</p>
                        <p className="font-mono text-gray-400">Mo 01.03.26 · Monday 01.03.</p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-500 mb-0.5">{t('import.formatsTime')}</p>
                        <p className="font-mono text-gray-400">9:00 · 09.00 · 9h00 · 9h</p>
                        <p className="font-mono text-gray-400">9 Uhr · 0900 · 2:30 PM</p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-500 mb-0.5">{t('import.formatsSeparator')}</p>
                        <p className="font-mono text-gray-400">Tab · ; · , · | · {t('import.formatsSpaces')}</p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-500 mb-0.5">{t('import.formatsBreak')}</p>
                        <p className="font-mono text-gray-400">0:30 · 30 · 30 min · 0.5</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">{t('import.formatsExtra')}</p>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                    <p className="text-xs text-emerald-700">{t('import.tip')}</p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <p className="text-xs text-amber-700">
                      {(() => {
                        const tip = t('import.tipAI')
                        const format = 'DD.MM.YY TAB HH:MM TAB HH:MM TAB HH:MM TAB H:MM'
                        const parts = tip.split(format)
                        if (parts.length === 2) {
                          return <>{parts[0]}<span className="font-mono bg-amber-100 px-1 rounded mx-1">{format}</span>{parts[1]}</>
                        }
                        return tip
                      })()}
                    </p>
                  </div>
                  <textarea
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder={"01.01.26\t13:00\t14:30\t0:00\t1:30\n02.01.26\t9:00\t10:45\t0:00\t1:45\n..."}
                    className="input-field w-full h-48 font-mono text-xs resize-none"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={handleParse}
                      disabled={!pasteText.trim()}
                      className="btn-primary"
                    >
                      {t('import.detect')}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-emerald-600">
                      {t('import.detected', { n: validCount })}
                    </span>
                    {invalidCount > 0 && (
                      <span className="text-sm font-medium text-red-500">
                        {t('import.invalid', { n: invalidCount })}
                      </span>
                    )}
                    <button
                      onClick={() => setParsed(null)}
                      className="text-sm text-blue-600 hover:text-blue-800 ml-auto"
                    >
                      {t('import.back')}
                    </button>
                  </div>

                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 w-8"></th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">{t('import.headerDate')}</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">{t('import.headerStart')}</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">{t('import.headerEnd')}</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">{t('import.headerBreak')}</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">{t('import.headerHours')}</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">{t('import.headerNotes')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsed.map((row, i) => {
                          const dp = row.date.split('-')
                          const dateDisplay = `${dp[2]}.${dp[1]}.${dp[0].slice(2)}`
                          return (
                            <tr key={i} className={`border-b border-gray-100 ${row.valid ? '' : 'bg-red-50 text-red-400'}`}>
                              <td className="px-3 py-1.5">
                                {row.valid ? (
                                  <span className="text-emerald-500 text-xs">&#10003;</span>
                                ) : (
                                  <span className="text-red-400 text-xs">&#10007;</span>
                                )}
                              </td>
                              <td className="px-3 py-1.5 font-medium">{dateDisplay}</td>
                              <td className="px-3 py-1.5">{row.start_time || '–'}</td>
                              <td className="px-3 py-1.5">{row.end_time || '–'}</td>
                              <td className="px-3 py-1.5">{row.break_minutes > 0 ? `${Math.floor(row.break_minutes / 60)}:${String(row.break_minutes % 60).padStart(2, '0')}` : '0:00'}</td>
                              <td className="px-3 py-1.5 font-semibold">{row.work_hours > 0 ? formatHours(row.work_hours) : '–'}</td>
                              <td className="px-3 py-1.5 text-gray-500">{row.notes}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="btn-secondary">{t('import.cancel')}</button>
                    <button
                      onClick={handleImport}
                      disabled={validCount === 0 || importing}
                      className="btn-success"
                    >
                      {importing ? t('import.importing') : t('import.importN', { n: validCount })}
                    </button>
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <div className="text-4xl mb-4 text-emerald-500">&#10003;</div>
              <p className="text-lg font-semibold text-gray-900">{t('import.success', { n: validCount })}</p>
              <button onClick={onClose} className="btn-primary mt-6">{t('import.done')}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ImportDialog
