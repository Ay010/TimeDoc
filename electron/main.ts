import { app, BrowserWindow, ipcMain, dialog, shell, Menu } from 'electron'
import path from 'path'
import { autoUpdater } from 'electron-updater'
import { initDatabase, getDatabase, saveDatabase } from './database'
import { createBackup, restoreBackup, listBackups, autoBackup } from './backup'
import { exportWord, exportExcel } from './document-engine'
import { initEncryption, encrypt, decrypt, isSensitiveKey, hashPassword } from './crypto'
import fs from 'fs'

let mainWindow: BrowserWindow | null = null

const DIST = path.join(__dirname, '../dist')
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

function getDataPath() {
  return path.join(app.getPath('userData'), 'timedoc-data')
}

function ensureDataDirs() {
  const dataPath = getDataPath()
  const dirs = ['backups', 'vorlagen', 'exporte']
  for (const dir of dirs) {
    const dirPath = path.join(dataPath, dir)
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true })
    }
  }
  return dataPath
}

function getIconPath(): string {
  const isDev = !!VITE_DEV_SERVER_URL
  if (isDev) {
    return path.join(__dirname, '..', 'public', 'icon.png')
  }
  return path.join(DIST, 'icon.png')
}

function createWindow() {
  Menu.setApplicationMenu(null)

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'TimeDoc',
    icon: getIconPath(),
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('mailto:') || url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(DIST, 'index.html'))
  }
}

function queryAll(sql: string, params: any[] = []): any[] {
  const db = getDatabase()
  const stmt = db.prepare(sql)
  if (params.length > 0) stmt.bind(params)

  const results: any[] = []
  const columns = stmt.getColumnNames()
  while (stmt.step()) {
    const row = stmt.get()
    const obj: any = {}
    columns.forEach((col, i) => { obj[col] = row[i] })
    results.push(obj)
  }
  stmt.free()
  return results
}

function queryRun(sql: string, params: any[] = []): void {
  const db = getDatabase()
  db.run(sql, params)
  saveDatabase()
}

function setupAutoUpdater() {
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', (info) => {
    mainWindow?.webContents.send('update:available', info.version)
  })

  autoUpdater.on('download-progress', (progress) => {
    mainWindow?.webContents.send('update:progress', Math.round(progress.percent))
  })

  autoUpdater.on('update-downloaded', (info) => {
    mainWindow?.webContents.send('update:downloaded', info.version)
  })

  autoUpdater.checkForUpdates().catch(() => {})
}

app.whenReady().then(async () => {
  const dataPath = ensureDataDirs()
  initEncryption(dataPath)
  await initDatabase(dataPath)
  autoBackup(dataPath)
  createWindow()
  registerIpcHandlers(dataPath)

  if (!VITE_DEV_SERVER_URL) {
    setupAutoUpdater()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

function registerIpcHandlers(dataPath: string) {
  // --- Window controls ---
  ipcMain.handle('window:minimize', () => mainWindow?.minimize())
  ipcMain.handle('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow?.maximize()
    }
  })
  ipcMain.handle('window:close', () => mainWindow?.close())
  ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized())
  ipcMain.handle('shell:openExternal', (_e, url: string) => shell.openExternal(url))

  // --- Auth ---
  function showPasswordDialog(title: string, subtitle: string): Promise<string> {
    return new Promise((resolve) => {
      const pwDialog = new BrowserWindow({
        width: 400,
        height: 210,
        parent: mainWindow!,
        modal: true,
        resizable: false,
        minimizable: false,
        maximizable: false,
        frame: false,
        webPreferences: { nodeIntegration: false, contextIsolation: true },
      })

      const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
body{font-family:Segoe UI,sans-serif;margin:0;padding:24px;background:#fff;display:flex;flex-direction:column;gap:14px;user-select:none}
h3{margin:0;font-size:15px;color:#1a1a1a}
p{margin:0;font-size:13px;color:#666}
input{width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;outline:none}
input:focus{border-color:#3b82f6;box-shadow:0 0 0 2px rgba(59,130,246,0.15)}
.btns{display:flex;gap:8px;justify-content:flex-end}
button{padding:8px 20px;border:none;border-radius:8px;font-size:13px;cursor:pointer;font-weight:500}
.ok{background:#3b82f6;color:#fff}.ok:hover{background:#2563eb}
.cancel{background:#f3f4f6;color:#374151}.cancel:hover{background:#e5e7eb}
</style></head><body>
<h3>${title}</h3>
<p>${subtitle}</p>
<input type="password" id="pw" autofocus placeholder="Passwort">
<div class="btns">
<button class="cancel" onclick="done('')">Abbrechen</button>
<button class="ok" onclick="done(document.getElementById('pw').value)">OK</button>
</div>
<script>
document.getElementById('pw').addEventListener('keydown',e=>{if(e.key==='Enter')done(document.getElementById('pw').value);if(e.key==='Escape')done('')});
function done(v){document.title='PW:'+v}
</script></body></html>`

      pwDialog.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)

      const check = setInterval(() => {
        try {
          const t = pwDialog.getTitle()
          if (t.startsWith('PW:')) {
            clearInterval(check)
            pwDialog.close()
            resolve(t.slice(3))
          }
        } catch { clearInterval(check); resolve('') }
      }, 100)

      pwDialog.on('closed', () => { clearInterval(check); resolve('') })
    })
  }

  ipcMain.handle('auth:hasPassword', () => {
    const rows = queryAll('SELECT value FROM settings WHERE key = ?', ['app_passwort'])
    return !!rows[0]?.value
  })

  ipcMain.handle('auth:verifyUser', async () => {
    const rows = queryAll('SELECT value FROM settings WHERE key = ?', ['app_passwort'])
    const storedHash = rows[0]?.value

    if (!storedHash) {
      return { success: true, cancelled: false }
    }

    const pw = await showPasswordDialog('Passwort eingeben', 'Gib dein App-Passwort ein, um die Bankdaten anzuzeigen.')
    if (!pw) return { success: false, cancelled: true }

    const valid = hashPassword(pw) === storedHash
    return { success: valid, cancelled: false }
  })

  ipcMain.handle('auth:setPassword', async () => {
    const rows = queryAll('SELECT value FROM settings WHERE key = ?', ['app_passwort'])
    const storedHash = rows[0]?.value

    if (storedHash) {
      const oldPw = await showPasswordDialog('Aktuelles Passwort', 'Gib dein aktuelles App-Passwort ein.')
      if (!oldPw) return { success: false, cancelled: true }
      if (hashPassword(oldPw) !== storedHash) return { success: false, cancelled: false, wrongPassword: true }
    }

    const newPw = await showPasswordDialog('Neues Passwort festlegen', 'Wähle ein Passwort für den Bankdaten-Schutz.')
    if (!newPw) return { success: false, cancelled: true }

    queryRun('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['app_passwort', hashPassword(newPw)])
    return { success: true, cancelled: false }
  })

  ipcMain.handle('auth:removePassword', async (_e, force?: boolean) => {
    const rows = queryAll('SELECT value FROM settings WHERE key = ?', ['app_passwort'])
    const storedHash = rows[0]?.value
    if (!storedHash) return { success: true, cancelled: false }

    if (force) {
      queryRun('DELETE FROM settings WHERE key = ?', ['app_passwort'])
      return { success: true, cancelled: false }
    }

    const pw = await showPasswordDialog('Passwort bestätigen', 'Gib dein App-Passwort ein, um den Schutz zu deaktivieren.')
    if (!pw) return { success: false, cancelled: true }
    if (hashPassword(pw) !== storedHash) return { success: false, cancelled: false, wrongPassword: true }

    queryRun('DELETE FROM settings WHERE key = ?', ['app_passwort'])
    return { success: true, cancelled: false }
  })

  // --- Entries ---
  ipcMain.handle('entries:getMonth', (_e, year: number, month: number) => {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`
    return queryAll('SELECT * FROM entries WHERE date >= ? AND date <= ? ORDER BY date', [startDate, endDate])
  })

  ipcMain.handle('entries:upsert', (_e, entry: {
    date: string, start_time: string, end_time: string,
    break_minutes: number, work_hours: number, notes: string
  }) => {
    queryRun(`
      INSERT INTO entries (date, start_time, end_time, break_minutes, work_hours, notes)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(date) DO UPDATE SET
        start_time = excluded.start_time, end_time = excluded.end_time,
        break_minutes = excluded.break_minutes, work_hours = excluded.work_hours, notes = excluded.notes
    `, [entry.date, entry.start_time, entry.end_time, entry.break_minutes, entry.work_hours, entry.notes])
    return { success: true }
  })

  ipcMain.handle('entries:delete', (_e, date: string) => {
    queryRun('DELETE FROM entries WHERE date = ?', [date])
    return { success: true }
  })

  // --- Settings ---
  ipcMain.handle('settings:get', (_e, key: string) => {
    const rows = queryAll('SELECT value FROM settings WHERE key = ?', [key])
    const raw = rows[0]?.value ?? null
    if (raw && isSensitiveKey(key)) return decrypt(raw)
    return raw
  })

  ipcMain.handle('settings:getAll', () => {
    const rows = queryAll('SELECT key, value FROM settings')
    const result: Record<string, string> = {}
    for (const row of rows) {
      result[row.key] = isSensitiveKey(row.key) ? decrypt(row.value) : row.value
    }
    return result
  })

  ipcMain.handle('settings:set', (_e, key: string, value: string) => {
    const storedValue = isSensitiveKey(key) ? encrypt(value) : value
    queryRun('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, storedValue])
    return { success: true }
  })

  // --- Templates ---
  ipcMain.handle('templates:upload', async (_e, type: 'word' | 'excel') => {
    const filters = type === 'word'
      ? [{ name: 'Word Dokumente', extensions: ['docx'] }]
      : [{ name: 'Excel Dokumente', extensions: ['xlsx'] }]

    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile'],
      filters,
    })

    if (result.canceled || result.filePaths.length === 0) return null

    const srcPath = result.filePaths[0]
    const ext = path.extname(srcPath).toLowerCase()
    const fileName = type === 'word' ? `Vorlage-Rechnung${ext}` : `Vorlage-Stundenzettel${ext}`
    const destPath = path.join(dataPath, 'vorlagen', fileName)
    fs.copyFileSync(srcPath, destPath)

    return { name: fileName, path: destPath, type }
  })

  ipcMain.handle('templates:list', () => {
    const vorlagenDir = path.join(dataPath, 'vorlagen')
    if (!fs.existsSync(vorlagenDir)) return []
    const files = fs.readdirSync(vorlagenDir)
    return files
      .filter(f => (f.endsWith('.docx') || f.endsWith('.xlsx')) && !f.startsWith('~$'))
      .map(f => {
        const ext = path.extname(f).toLowerCase()
        return {
          name: f,
          path: path.join(vorlagenDir, f),
          type: ext === '.docx' ? 'word' : 'excel',
        }
      })
  })

  ipcMain.handle('templates:delete', (_e, fileName: string) => {
    const filePath = path.join(dataPath, 'vorlagen', fileName)
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    queryRun('DELETE FROM template_mappings WHERE template_name = ?', [fileName])
    return { success: true }
  })

  ipcMain.handle('templates:getMappings', (_e, templateName: string) => {
    return queryAll('SELECT * FROM template_mappings WHERE template_name = ?', [templateName])
  })

  ipcMain.handle('templates:saveMappings', (_e, templateName: string, mappings: { field_name: string, placeholder: string }[]) => {
    queryRun('DELETE FROM template_mappings WHERE template_name = ?', [templateName])
    const ext = path.extname(templateName).toLowerCase()
    const type = ext === '.docx' ? 'word' : 'excel'
    for (const m of mappings) {
      queryRun(
        'INSERT INTO template_mappings (template_name, template_type, field_name, placeholder) VALUES (?, ?, ?, ?)',
        [templateName, type, m.field_name, m.placeholder]
      )
    }
    return { success: true }
  })

  ipcMain.handle('templates:detectPlaceholders', (_e, templateName: string) => {
    const filePath = path.join(dataPath, 'vorlagen', templateName)
    const ext = path.extname(templateName).toLowerCase()
    if (ext === '.docx') {
      try {
        const PizZip = require('pizzip')
        const Docxtemplater = require('docxtemplater')
        const content = fs.readFileSync(filePath)
        const zip = new PizZip(content)
        const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true })
        const text = doc.getFullText()
        const matches = text.match(/\{\{[^}]+\}\}/g) || []
        return [...new Set(matches.map((m: string) => m.replace(/\{\{|\}\}/g, '')))]
      } catch {
        return []
      }
    }
    return []
  })

  ipcMain.handle('templates:readContent', async (_e, templateName: string) => {
    const filePath = path.join(dataPath, 'vorlagen', templateName)
    const ext = path.extname(templateName).toLowerCase()

    if (ext === '.docx') {
      try {
        const PizZip = require('pizzip')
        const content = fs.readFileSync(filePath)
        const zip = new PizZip(content)
        const xmlFile = zip.file('word/document.xml')
        if (!xmlFile) return { success: false, error: 'document.xml nicht gefunden' }
        const xml = xmlFile.asText()

        const paragraphs: string[] = []
        const pRegex = /<w:p[ >][\s\S]*?<\/w:p>/g
        let pMatch
        while ((pMatch = pRegex.exec(xml)) !== null) {
          const pXml = pMatch[0]
          const texts: string[] = []
          const tRegex = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g
          let tMatch
          while ((tMatch = tRegex.exec(pXml)) !== null) {
            texts.push(tMatch[1])
          }
          paragraphs.push(texts.join(''))
        }

        return { success: true, content: paragraphs.join('\n'), type: 'word' }
      } catch (err: any) {
        return { success: false, error: err.message }
      }
    }

    if (ext === '.xlsx') {
      try {
        const ExcelJS = require('exceljs')
        const workbook = new ExcelJS.Workbook()
        await workbook.xlsx.readFile(filePath)

        const lines: string[] = []
        for (const worksheet of workbook.worksheets) {
          lines.push(`--- ${worksheet.name} ---`)
          worksheet.eachRow((row: any, rowNumber: number) => {
            const cells: string[] = []
            row.eachCell({ includeEmpty: true }, (cell: any) => {
              cells.push(String(cell.value ?? ''))
            })
            lines.push(`${rowNumber}\t${cells.join('\t')}`)
          })
        }
        return { success: true, content: lines.join('\n'), type: 'excel' }
      } catch (err: any) {
        return { success: false, error: err.message }
      }
    }

    return { success: false, error: 'Unbekannter Dateityp' }
  })

  ipcMain.handle('templates:backup', async (_e, templateName: string) => {
    const filePath = path.join(dataPath, 'vorlagen', templateName)
    if (!fs.existsSync(filePath)) return { success: false, error: 'Datei nicht gefunden' }

    const ext = path.extname(templateName)
    const baseName = path.basename(templateName, ext)
    const timestamp = new Date().toISOString().slice(0, 10)
    const defaultName = `${baseName}_Backup_${timestamp}${ext}`

    const result = await dialog.showSaveDialog(mainWindow!, {
      defaultPath: defaultName,
      filters: [
        ext === '.docx'
          ? { name: 'Word Dokumente', extensions: ['docx'] }
          : { name: 'Excel Dokumente', extensions: ['xlsx'] }
      ],
    })

    if (result.canceled || !result.filePath) return { success: false }

    fs.copyFileSync(filePath, result.filePath)
    return { success: true, path: result.filePath }
  })

  ipcMain.handle('templates:openInEditor', (_e, templateName: string) => {
    const filePath = path.join(dataPath, 'vorlagen', templateName)
    if (fs.existsSync(filePath)) {
      shell.openPath(filePath)
      return { success: true }
    }
    return { success: false, error: 'Datei nicht gefunden' }
  })

  // --- Custom Fields ---
  ipcMain.handle('customFields:getAll', () => {
    return queryAll('SELECT * FROM custom_fields ORDER BY id')
  })

  ipcMain.handle('customFields:add', (_e, name: string, value: string) => {
    try {
      queryRun('INSERT INTO custom_fields (name, value) VALUES (?, ?)', [name, value])
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('customFields:update', (_e, id: number, name: string, value: string) => {
    try {
      queryRun('UPDATE custom_fields SET name = ?, value = ? WHERE id = ?', [name, value, id])
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('customFields:delete', (_e, id: number) => {
    queryRun('DELETE FROM custom_fields WHERE id = ?', [id])
    return { success: true }
  })

  // --- Export ---
  ipcMain.handle('export:generate', async (_e, year: number, month: number) => {
    const entries = queryAll(
      'SELECT * FROM entries WHERE date >= ? AND date <= ? ORDER BY date',
      [`${year}-${String(month).padStart(2, '0')}-01`, `${year}-${String(month).padStart(2, '0')}-31`]
    )

    const settingsRows = queryAll('SELECT key, value FROM settings')
    const settings: Record<string, string> = {}
    for (const row of settingsRows) {
      settings[row.key] = isSensitiveKey(row.key) ? decrypt(row.value) : row.value
    }

    const customFieldRows = queryAll('SELECT name, value FROM custom_fields')
    for (const row of customFieldRows) {
      settings[`CUSTOM_${row.name}`] = row.value || ''
    }

    const vorlagenDir = path.join(dataPath, 'vorlagen')
    const exportDir = path.join(dataPath, 'exporte')
    const monthStr = `${year}-${String(month).padStart(2, '0')}`

    const results: string[] = []

    const templates = fs.existsSync(vorlagenDir)
      ? fs.readdirSync(vorlagenDir).filter(f => (f.endsWith('.docx') || f.endsWith('.xlsx')) && !f.startsWith('~$'))
      : []

    for (const template of templates) {
      const templatePath = path.join(vorlagenDir, template)
      const ext = path.extname(template).toLowerCase()
      const mappings = queryAll(
        'SELECT * FROM template_mappings WHERE template_name = ?',
        [template]
      )

      const fullName = (settings.name || 'Export').trim().replace(/\s+/g, '-')
      const docType = ext === '.docx' ? 'Rechnung' : 'Stundenzettel'
      const outName = `${docType}_${fullName}_${year}-${String(month).padStart(2, '0')}${ext}`
      const outPath = path.join(exportDir, outName)

      if (ext === '.docx') {
        await exportWord(templatePath, outPath, entries, settings, mappings, year, month)
        results.push(outPath)
      } else if (ext === '.xlsx') {
        await exportExcel(templatePath, outPath, entries, settings, mappings, year, month)
        results.push(outPath)
      }
    }

    

    return results
  })

  ipcMain.handle('export:openFolder', () => {
    const exportDir = path.join(dataPath, 'exporte')
    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true })
    shell.openPath(exportDir)
  })

  // --- Backup ---
  ipcMain.handle('backup:create', () => {
    saveDatabase()
    return createBackup(dataPath)
  })

  ipcMain.handle('backup:list', () => {
    return listBackups(dataPath)
  })

  ipcMain.handle('backup:restore', async (_e, backupName: string) => {
    restoreBackup(dataPath, backupName)
    await initDatabase(dataPath)
    return { success: true }
  })

  ipcMain.handle('backup:export', async () => {
    saveDatabase()
    const dbPath = path.join(dataPath, 'stunden.db')
    if (!fs.existsSync(dbPath)) return { success: false, error: 'Keine Datenbank vorhanden' }

    const date = new Date().toISOString().slice(0, 10)
    const result = await dialog.showSaveDialog(mainWindow!, {
      defaultPath: `TimeDoc_Backup_${date}.db`,
      filters: [{ name: 'TimeDoc Backup', extensions: ['db'] }],
    })

    if (result.canceled || !result.filePath) return { success: false }
    fs.copyFileSync(dbPath, result.filePath)
    return { success: true, path: result.filePath }
  })

  ipcMain.handle('backup:import', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile'],
      filters: [{ name: 'TimeDoc Backup', extensions: ['db'] }],
    })

    if (result.canceled || result.filePaths.length === 0) return { success: false }

    const importPath = result.filePaths[0]
    const dbPath = path.join(dataPath, 'stunden.db')

    if (fs.existsSync(dbPath)) {
      createBackup(dataPath)
    }

    fs.copyFileSync(importPath, dbPath)
    await initDatabase(dataPath)
    return { success: true }
  })

  ipcMain.handle('backup:hasData', () => {
    const dbPath = path.join(dataPath, 'stunden.db')
    if (!fs.existsSync(dbPath)) return false
    try {
      const db = getDatabase()
      const entries = db.exec('SELECT COUNT(*) FROM entries')
      const count = entries[0]?.values[0]?.[0] as number ?? 0
      const settings = db.exec("SELECT COUNT(*) FROM settings WHERE value != ''")
      const settingsCount = settings[0]?.values[0]?.[0] as number ?? 0
      return count > 0 || settingsCount > 0
    } catch {
      return false
    }
  })

  ipcMain.handle('update:install', () => {
    autoUpdater.quitAndInstall(false, true)
  })
}
