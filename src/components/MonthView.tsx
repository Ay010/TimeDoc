import { useState } from 'react'
import { useEntryStore } from '../stores/useEntryStore'
import DayEntry from './DayEntry'
import ExportButton from './ExportButton'
import ImportDialog from './ImportDialog'
import type { TimeEntry } from '../types'

const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
]

const WEEKDAY_NAMES = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

function MonthView() {
  const {
    entries, currentYear, currentMonth,
    nextMonth, prevMonth, totalHours, loading,
  } = useEntryStore()

  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)
  const [showNewEntry, setShowNewEntry] = useState(false)
  const [showImport, setShowImport] = useState(false)

  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate()

  const entriesByDate = new Map<string, TimeEntry>()
  for (const entry of entries) {
    entriesByDate.set(entry.date, entry)
  }

  const total = totalHours()
  const totalH = Math.floor(total)
  const totalM = Math.round((total - totalH) * 60)

  function getWeekday(day: number): string {
    const date = new Date(currentYear, currentMonth - 1, day)
    return WEEKDAY_NAMES[date.getDay()]
  }

  function isWeekend(day: number): boolean {
    const date = new Date(currentYear, currentMonth - 1, day)
    const dow = date.getDay()
    return dow === 0 || dow === 6
  }

  function formatDateKey(day: number): string {
    return `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  function formatWorkHours(h: number): string {
    const hours = Math.floor(h)
    const mins = Math.round((h - hours) * 60)
    return `${hours}:${String(mins).padStart(2, '0')}`
  }

  function formatBreak(mins: number): string {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return `${h}:${String(m).padStart(2, '0')}`
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={prevMonth} className="btn-secondary px-3 py-1.5">
            ←
          </button>
          <h2 className="text-2xl font-bold text-gray-900 min-w-[220px] text-center">
            {MONTH_NAMES[currentMonth - 1]} {currentYear}
          </h2>
          <button onClick={nextMonth} className="btn-secondary px-3 py-1.5">
            →
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="card py-3 px-5 flex items-center gap-3">
            <span className="text-sm text-gray-500">Monatsstunden:</span>
            <span className="text-2xl font-bold text-blue-600">
              {totalH}:{String(totalM).padStart(2, '0')}
            </span>
          </div>
          <button onClick={() => setShowImport(true)} className="btn-secondary">
            Importieren
          </button>
          <ExportButton />
        </div>
      </div>

      {loading ? (
        <div className="card flex items-center justify-center py-20">
          <div className="text-gray-400 text-lg">Lade...</div>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-12">Tag</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">Datum</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Beginn</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Ende</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Pause</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Stunden</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Bemerkung</th>
                <th className="px-4 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                const dateKey = formatDateKey(day)
                const entry = entriesByDate.get(dateKey)
                const weekend = isWeekend(day)
                const weekday = getWeekday(day)

                return (
                  <tr
                    key={day}
                    className={`border-b border-gray-100 hover:bg-blue-50/50 transition-colors ${
                      weekend ? 'bg-gray-50/80' : ''
                    } ${entry ? '' : 'text-gray-400'}`}
                  >
                    <td className="px-4 py-2.5 text-sm font-medium text-gray-500">{weekday}</td>
                    <td className="px-4 py-2.5 text-sm font-medium">
                      {String(day).padStart(2, '0')}.{String(currentMonth).padStart(2, '0')}.{String(currentYear).slice(2)}
                    </td>
                    <td className="px-4 py-2.5 text-sm">{entry?.start_time || '–'}</td>
                    <td className="px-4 py-2.5 text-sm">{entry?.end_time || '–'}</td>
                    <td className="px-4 py-2.5 text-sm">{entry ? formatBreak(entry.break_minutes) : '–'}</td>
                    <td className="px-4 py-2.5 text-sm font-semibold">
                      {entry ? formatWorkHours(entry.work_hours) : '–'}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-gray-500 truncate max-w-[200px]">{entry?.notes || ''}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => {
                          setEditingEntry(
                            entry || {
                              date: dateKey,
                              start_time: '09:00',
                              end_time: '17:00',
                              break_minutes: 0,
                              work_hours: 8,
                              notes: '',
                            }
                          )
                          setShowNewEntry(true)
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {entry ? 'Bearbeiten' : 'Eintragen'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showNewEntry && editingEntry && (
        <DayEntry
          entry={editingEntry}
          onClose={() => {
            setShowNewEntry(false)
            setEditingEntry(null)
          }}
        />
      )}

      {showImport && (
        <ImportDialog onClose={() => setShowImport(false)} />
      )}
    </div>
  )
}

export default MonthView
