import { create } from 'zustand'

interface SettingsState {
  settings: Record<string, string>
  loading: boolean
  loadSettings: () => Promise<void>
  setSetting: (key: string, value: string) => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: {},
  loading: false,

  loadSettings: async () => {
    set({ loading: true })
    const settings = await window.api.settings.getAll()
    set({ settings, loading: false })
  },

  setSetting: async (key, value) => {
    await window.api.settings.set(key, value)
    set((state) => ({
      settings: { ...state.settings, [key]: value },
    }))
  },
}))
