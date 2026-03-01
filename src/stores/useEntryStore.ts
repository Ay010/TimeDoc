import { create } from 'zustand'
import type { TimeEntry } from '../types'

interface EntryState {
  entries: TimeEntry[]
  currentYear: number
  currentMonth: number
  loading: boolean
  setMonth: (year: number, month: number) => void
  loadEntries: () => Promise<void>
  upsertEntry: (entry: Omit<TimeEntry, 'id'>) => Promise<void>
  deleteEntry: (date: string) => Promise<void>
  nextMonth: () => void
  prevMonth: () => void
  totalHours: () => number
}

const now = new Date()

export const useEntryStore = create<EntryState>((set, get) => ({
  entries: [],
  currentYear: now.getFullYear(),
  currentMonth: now.getMonth() + 1,
  loading: false,

  setMonth: (year, month) => {
    set({ currentYear: year, currentMonth: month })
    get().loadEntries()
  },

  loadEntries: async () => {
    set({ loading: true })
    const { currentYear, currentMonth } = get()
    const entries = await window.api.entries.getMonth(currentYear, currentMonth)
    set({ entries, loading: false })
  },

  upsertEntry: async (entry) => {
    await window.api.entries.upsert(entry)
    await get().loadEntries()
  },

  deleteEntry: async (date) => {
    await window.api.entries.delete(date)
    await get().loadEntries()
  },

  nextMonth: () => {
    const { currentYear, currentMonth } = get()
    if (currentMonth === 12) {
      get().setMonth(currentYear + 1, 1)
    } else {
      get().setMonth(currentYear, currentMonth + 1)
    }
  },

  prevMonth: () => {
    const { currentYear, currentMonth } = get()
    if (currentMonth === 1) {
      get().setMonth(currentYear - 1, 12)
    } else {
      get().setMonth(currentYear, currentMonth - 1)
    }
  },

  totalHours: () => {
    return get().entries.reduce((sum, e) => sum + (e.work_hours || 0), 0)
  },
}))
