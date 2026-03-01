import initSqlJs, { Database as SqlJsDatabase } from 'sql.js'
import path from 'path'
import fs from 'fs'

let db: SqlJsDatabase
let dbPath: string

function getWasmPath(): string {
  const isDev = !!process.env.VITE_DEV_SERVER_URL
  if (isDev) {
    return path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm')
  }
  return path.join(process.resourcesPath, 'sql-wasm.wasm')
}

export async function initDatabase(dataPath: string): Promise<SqlJsDatabase> {
  dbPath = path.join(dataPath, 'stunden.db')

  const wasmBinary = fs.readFileSync(getWasmPath())
  const SQL = await initSqlJs({ wasmBinary })

  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath)
    db = new SQL.Database(buffer)
  } else {
    db = new SQL.Database()
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      start_time TEXT,
      end_time TEXT,
      break_minutes INTEGER DEFAULT 0,
      work_hours REAL,
      notes TEXT
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS template_mappings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_name TEXT,
      template_type TEXT,
      field_name TEXT,
      placeholder TEXT
    )
  `)

  seedDefaults()
  saveDatabase()

  return db
}

function seedDefaults() {
  const result = db.exec('SELECT COUNT(*) as c FROM settings')
  const count = result[0]?.values[0]?.[0] as number ?? 0
  if (count === 0) {
    const defaults: [string, string][] = [
      ['name', ''],
      ['adresse_zeile1', ''],
      ['adresse_zeile2', ''],
      ['email', ''],
      ['stundensatz', '25'],
      ['iban', ''],
      ['bic', ''],
      ['bank', ''],
      ['auftraggeber_name', ''],
      ['auftraggeber_adresse', ''],
      ['rechnungsnummer_prefix', ''],
      ['rechnungsnummer_counter', '1'],
    ]
    const stmt = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)')
    for (const [key, value] of defaults) {
      stmt.bind([key, value])
      stmt.step()
      stmt.reset()
    }
    stmt.free()
  }
}

export function saveDatabase(): void {
  if (!db || !dbPath) return
  const data = db.export()
  const buffer = Buffer.from(data)
  fs.writeFileSync(dbPath, buffer)
}

export function getDatabase(): SqlJsDatabase {
  return db
}

export function getDatabasePath(): string {
  return dbPath
}
