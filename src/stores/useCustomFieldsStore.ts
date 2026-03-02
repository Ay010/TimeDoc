import { create } from 'zustand'
import type { CustomField } from '../types'

interface CustomFieldsState {
  fields: CustomField[]
  loading: boolean
  loadFields: () => Promise<void>
  addField: (name: string, value: string) => Promise<{ success: boolean; error?: string }>
  updateField: (id: number, name: string, value: string) => Promise<{ success: boolean; error?: string }>
  deleteField: (id: number) => Promise<void>
}

export const useCustomFieldsStore = create<CustomFieldsState>((set) => ({
  fields: [],
  loading: false,

  loadFields: async () => {
    set({ loading: true })
    const fields = await window.api.customFields.getAll()
    set({ fields, loading: false })
  },

  addField: async (name, value) => {
    const result = await window.api.customFields.add(name, value)
    if (result.success) {
      const fields = await window.api.customFields.getAll()
      set({ fields })
    }
    return result
  },

  updateField: async (id, name, value) => {
    const result = await window.api.customFields.update(id, name, value)
    if (result.success) {
      const fields = await window.api.customFields.getAll()
      set({ fields })
    }
    return result
  },

  deleteField: async (id) => {
    await window.api.customFields.delete(id)
    const fields = await window.api.customFields.getAll()
    set({ fields })
  },
}))
