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

function parseDate(raw: string, fallbackYear: number): string | null {
  raw = raw.trim().replace(/\s+/g, '')

  // DD.MM.YY or DD.MM.YYYY
  let m = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/)
  if (m) {
    const day = m[1].padStart(2, '0')
    const month = m[2].padStart(2, '0')
    let year = m[3]
    if (year.length === 2) year = '20' + year
    return `${year}-${month}-${day}`
  }

  // DD/MM/YY or DD/MM/YYYY
  m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (m) {
    const day = m[1].padStart(2, '0')
    const month = m[2].padStart(2, '0')
    let year = m[3]
    if (year.length === 2) year = '20' + year
    return `${year}-${month}-${day}`
  }

  // YYYY-MM-DD
  m = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (m) {
    return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  }

  // DD.MM (no year, use fallback)
  m = raw.match(/^(\d{1,2})\.(\d{1,2})\.?$/)
  if (m) {
    const day = m[1].padStart(2, '0')
    const month = m[2].padStart(2, '0')
    return `${fallbackYear}-${month}-${day}`
  }

  return null
}

function parseTime(raw: string): string | null {
  raw = raw.trim()
  const m = raw.match(/^(\d{1,2}):(\d{2})$/)
  if (m) {
    return `${m[1].padStart(2, '0')}:${m[2]}`
  }
  return null
}

function parseBreakMinutes(raw: string): number {
  raw = raw.trim()
  if (!raw || raw === '0' || raw === '0:00' || raw === '00:00') return 0

  const hm = raw.match(/^(\d{1,2}):(\d{2})$/)
  if (hm) {
    return parseInt(hm[1]) * 60 + parseInt(hm[2])
  }

  const mins = parseInt(raw)
  if (!isNaN(mins)) return mins

  return 0
}

function parseWorkHours(raw: string): number | null {
  raw = raw.trim()
  if (!raw || raw === '0:00') return null

  const hm = raw.match(/^(\d{1,2}):(\d{2})$/)
  if (hm) {
    return parseInt(hm[1]) + parseInt(hm[2]) / 60
  }

  const num = parseFloat(raw.replace(',', '.'))
  if (!isNaN(num)) return num

  return null
}

function calcWorkHours(start: string, end: string, breakMins: number): number {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const totalMinutes = (eh * 60 + em) - (sh * 60 + sm) - breakMins
  return Math.max(0, totalMinutes / 60)
}

function splitGluedData(text: string): string {
  // Matches: DD.MM.YY or DD.MM.YYYY followed by time(s) glued together
  // e.g. "02.02.2607:0009:3003.02.2607:0011:00"
  // Split into separate lines: "02.02.26\t07:00\t09:30\n03.02.26\t07:00\t11:00"
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
        // Extract all HH:MM patterns from the glued time string
        const times = timePart.match(/\d{1,2}:\d{2}/g) || []
        lines.push([part, ...times].join('\t'))
        i++ // skip the time part
      } else {
        lines.push(part)
      }
    }
  }

  return lines.join('\n')
}

function parsePastedData(text: string, fallbackYear: number): ParsedRow[] {
  // First try to split glued data (e.g. "02.02.2607:0009:30...")
  text = splitGluedData(text)

  const lines = text.split('\n').filter(l => l.trim())
  const results: ParsedRow[] = []

  for (const line of lines) {
    const cols = line.split('\t').map(c => c.trim())

    // Skip header rows
    if (cols[0]?.toLowerCase().includes('datum') || cols[0]?.toLowerCase().includes('date')) continue
    if (cols.length < 2) continue

    // Find which column has the date
    let dateCol = -1
    for (let i = 0; i < Math.min(cols.length, 3); i++) {
      if (parseDate(cols[i], fallbackYear)) {
        dateCol = i
        break
      }
    }

    if (dateCol === -1) continue

    const date = parseDate(cols[dateCol], fallbackYear)!
    const remaining = cols.filter((_, i) => i !== dateCol)

    let start_time = ''
    let end_time = ''
    let break_minutes = 0
    let work_hours = 0
    let notes = ''

    // Try to identify columns by parsing
    const timeColumns: number[] = []
    for (let i = 0; i < remaining.length; i++) {
      if (parseTime(remaining[i])) {
        timeColumns.push(i)
      }
    }

    if (timeColumns.length >= 2) {
      start_time = parseTime(remaining[timeColumns[0]])!
      end_time = parseTime(remaining[timeColumns[1]])!

      // Look for break after the two time columns
      const afterTimes = remaining.filter((_, i) => !timeColumns.includes(i) || timeColumns.indexOf(i) >= 2)
      for (const val of afterTimes) {
        const breakVal = parseBreakMinutes(val)
        if (breakVal >= 0 && val.includes(':')) {
          break_minutes = breakVal
          break
        }
      }

      work_hours = calcWorkHours(start_time, end_time, break_minutes)
    }

    // Standard format: Beginn, Ende, Pause, Arbeitsstunden, Bemerkung
    if (remaining.length >= 2) {
      const t1 = parseTime(remaining[0])
      const t2 = parseTime(remaining[1])
      if (t1 && t2) {
        start_time = t1
        end_time = t2
        if (remaining.length >= 3) break_minutes = parseBreakMinutes(remaining[2])
        if (remaining.length >= 4) {
          const wh = parseWorkHours(remaining[3])
          if (wh !== null) work_hours = wh
        }
        if (remaining.length >= 5 && !parseTime(remaining[4]) && !parseWorkHours(remaining[4])) {
          notes = remaining[4]
        }
      }
    }

    if (!work_hours && start_time && end_time) {
      work_hours = calcWorkHours(start_time, end_time, break_minutes)
    }

    results.push({
      date,
      start_time,
      end_time,
      break_minutes,
      work_hours,
      notes,
      valid: !!(date && start_time && end_time && work_hours > 0),
      raw: line,
    })
  }

  return mergeSameDay(results).sort((a, b) => a.date.localeCompare(b.date))
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
                  <p className="text-xs text-gray-400">
                    {t('import.format')}
                  </p>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <p className="text-xs text-amber-700">
                      {(() => {
                        const tip = t('import.tip')
                        const format = 'DD.MM.YY TAB HH:MM TAB HH:MM TAB HH:MM TAB H:MM'
                        const parts = tip.split(format)
                        return (
                          <>
                            {parts[0]}
                            <span className="font-mono bg-amber-100 px-1 rounded mx-1">{format}</span>
                            {parts[1]}
                          </>
                        )
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
