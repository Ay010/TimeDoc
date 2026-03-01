import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  },
  auth: {
    hasPassword: () => ipcRenderer.invoke('auth:hasPassword'),
    verifyUser: () => ipcRenderer.invoke('auth:verifyUser'),
    setPassword: () => ipcRenderer.invoke('auth:setPassword'),
    removePassword: (force?: boolean) => ipcRenderer.invoke('auth:removePassword', force),
  },
  entries: {
    getMonth: (year: number, month: number) => ipcRenderer.invoke('entries:getMonth', year, month),
    upsert: (entry: {
      date: string, start_time: string, end_time: string,
      break_minutes: number, work_hours: number, notes: string
    }) => ipcRenderer.invoke('entries:upsert', entry),
    delete: (date: string) => ipcRenderer.invoke('entries:delete', date),
  },
  settings: {
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    getAll: () => ipcRenderer.invoke('settings:getAll'),
    set: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value),
  },
  templates: {
    upload: (type: 'word' | 'excel') => ipcRenderer.invoke('templates:upload', type),
    list: () => ipcRenderer.invoke('templates:list'),
    delete: (fileName: string) => ipcRenderer.invoke('templates:delete', fileName),
    getMappings: (templateName: string) => ipcRenderer.invoke('templates:getMappings', templateName),
    saveMappings: (templateName: string, mappings: { field_name: string, placeholder: string }[]) =>
      ipcRenderer.invoke('templates:saveMappings', templateName, mappings),
    detectPlaceholders: (templateName: string) => ipcRenderer.invoke('templates:detectPlaceholders', templateName),
    readContent: (templateName: string) => ipcRenderer.invoke('templates:readContent', templateName),
    writeContent: (templateName: string, content: string) => ipcRenderer.invoke('templates:writeContent', templateName, content),
    openInEditor: (templateName: string) => ipcRenderer.invoke('templates:openInEditor', templateName),
    backup: (templateName: string) => ipcRenderer.invoke('templates:backup', templateName),
  },
  export: {
    generate: (year: number, month: number) => ipcRenderer.invoke('export:generate', year, month),
    openFolder: () => ipcRenderer.invoke('export:openFolder'),
  },
  backup: {
    create: () => ipcRenderer.invoke('backup:create'),
    list: () => ipcRenderer.invoke('backup:list'),
    restore: (backupName: string) => ipcRenderer.invoke('backup:restore', backupName),
    export: () => ipcRenderer.invoke('backup:export'),
    import: () => ipcRenderer.invoke('backup:import'),
    hasData: () => ipcRenderer.invoke('backup:hasData'),
  },
})
