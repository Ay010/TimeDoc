export interface TimeEntry {
  id?: number
  date: string
  start_time: string
  end_time: string
  break_minutes: number
  work_hours: number
  notes: string
}

export interface TemplateFile {
  name: string
  path: string
  type: 'word' | 'excel'
}

export interface TemplateMapping {
  id?: number
  template_name: string
  template_type: string
  field_name: string
  placeholder: string
}

export interface BackupInfo {
  name: string
  date: string
  size: number
}

export interface CustomField {
  id: number
  name: string
  value: string
}

declare global {
  interface Window {
    onUpdate: {
      onAvailable: (cb: (version: string) => void) => void
      onProgress: (cb: (percent: number) => void) => void
      onDownloaded: (cb: (version: string) => void) => void
    }
    api: {
      window: {
        minimize: () => Promise<void>
        maximize: () => Promise<void>
        close: () => Promise<void>
        isMaximized: () => Promise<boolean>
      }
      shell: {
        openExternal: (url: string) => Promise<void>
      }
      auth: {
        hasPassword: () => Promise<boolean>
        verifyUser: () => Promise<{ success: boolean; cancelled: boolean }>
        setPassword: () => Promise<{ success: boolean; cancelled: boolean; wrongPassword?: boolean }>
        removePassword: (force?: boolean) => Promise<{ success: boolean; cancelled: boolean; wrongPassword?: boolean }>
      }
      entries: {
        getMonth: (year: number, month: number) => Promise<TimeEntry[]>
        upsert: (entry: Omit<TimeEntry, 'id'>) => Promise<{ success: boolean }>
        delete: (date: string) => Promise<{ success: boolean }>
      }
      settings: {
        get: (key: string) => Promise<string | null>
        getAll: () => Promise<Record<string, string>>
        set: (key: string, value: string) => Promise<{ success: boolean }>
      }
      templates: {
        upload: (type: 'word' | 'excel') => Promise<TemplateFile | null>
        list: () => Promise<TemplateFile[]>
        delete: (fileName: string) => Promise<{ success: boolean }>
        getMappings: (templateName: string) => Promise<TemplateMapping[]>
        saveMappings: (templateName: string, mappings: { field_name: string; placeholder: string }[]) => Promise<{ success: boolean }>
        detectPlaceholders: (templateName: string) => Promise<string[]>
        readContent: (templateName: string) => Promise<{ success: boolean; content?: string; type?: string; error?: string }>
        writeContent: (templateName: string, content: string) => Promise<{ success: boolean; error?: string }>
        openInEditor: (templateName: string) => Promise<{ success: boolean; error?: string }>
        backup: (templateName: string) => Promise<{ success: boolean; path?: string; error?: string }>
      }
      customFields: {
        getAll: () => Promise<CustomField[]>
        add: (name: string, value: string) => Promise<{ success: boolean; error?: string }>
        update: (id: number, name: string, value: string) => Promise<{ success: boolean; error?: string }>
        delete: (id: number) => Promise<{ success: boolean }>
      }
      export: {
        generate: (year: number, month: number) => Promise<string[]>
        openFolder: () => Promise<void>
      }
      backup: {
        create: () => Promise<string>
        list: () => Promise<BackupInfo[]>
        restore: (backupName: string) => Promise<{ success: boolean }>
        export: () => Promise<{ success: boolean; path?: string; error?: string }>
        import: () => Promise<{ success: boolean }>
        hasData: () => Promise<boolean>
      }
      update: {
        install: () => Promise<void>
      }
    }
  }
}
