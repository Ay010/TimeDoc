import { useState } from 'react'
import { useEntryStore } from '../stores/useEntryStore'
import { useI18n } from '../i18n'
import type { TimeEntry } from '../types'

interface Props {
  entry: TimeEntry
  onClose: () => void
}

function DayEntry({ entry, onClose }: Props) {
  const t = useI18n((s) => s.t)
  const [startTime, setStartTime] = useState(entry.start_time || '09:00')
  const [endTime, setEndTime] = useState(entry.end_time || '17:00')
  const [breakMinutes, setBreakMinutes] = useState(entry.break_minutes || 0)
  const [notes, setNotes] = useState(entry.notes || '')

  const upsertEntry = useEntryStore((s) => s.upsertEntry)
  const deleteEntry = useEntryStore((s) => s.deleteEntry)

  function calcWorkHours(): number {
    if (!startTime || !endTime) return 0
    const [sh, sm] = startTime.split(':').map(Number)
    const [eh, em] = endTime.split(':').map(Number)
    const totalMinutes = (eh * 60 + em) - (sh * 60 + sm) - breakMinutes
    return Math.max(0, totalMinutes / 60)
  }

  const workHours = calcWorkHours()
  const workH = Math.floor(workHours)
  const workM = Math.round((workHours - workH) * 60)

  async function handleSave() {
    await upsertEntry({
      date: entry.date,
      start_time: startTime,
      end_time: endTime,
      break_minutes: breakMinutes,
      work_hours: workHours,
      notes,
    })
    onClose()
  }

  async function handleDelete() {
    await deleteEntry(entry.date)
    onClose()
  }

  const dateParts = entry.date.split('-')
  const displayDate = `${dateParts[2]}.${dateParts[1]}.${dateParts[0]}`

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">{displayDate}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('day.start')}</label>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="input-field w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('day.end')}</label>
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="input-field w-full" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('day.breakMinutes')}</label>
          <input type="number" min={0} step={5} value={breakMinutes} onChange={(e) => setBreakMinutes(parseInt(e.target.value) || 0)} className="input-field w-full" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('day.notes')}</label>
          <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className="input-field w-full" placeholder={t('day.notesPlaceholder')} />
        </div>

        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <span className="text-sm text-blue-600 font-medium">{t('day.workHours')} </span>
          <span className="text-xl font-bold text-blue-700">{workH}:{String(workM).padStart(2, '0')}</span>
        </div>

        <div className="flex gap-3 justify-end">
          {entry.id && (
            <button onClick={handleDelete} className="btn-danger mr-auto">{t('day.delete')}</button>
          )}
          <button onClick={onClose} className="btn-secondary">{t('day.cancel')}</button>
          <button onClick={handleSave} className="btn-primary">{t('day.save')}</button>
        </div>
      </div>
    </div>
  )
}

export default DayEntry
