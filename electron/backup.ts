import fs from 'fs'
import path from 'path'

const MAX_BACKUPS = 30

export function createBackup(dataPath: string): string {
  const dbPath = path.join(dataPath, 'stunden.db')
  const backupDir = path.join(dataPath, 'backups')

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupName = `stunden_${timestamp}.db`
  const backupPath = path.join(backupDir, backupName)

  fs.copyFileSync(dbPath, backupPath)
  cleanOldBackups(backupDir)

  return backupName
}

export function restoreBackup(dataPath: string, backupName: string): void {
  const dbPath = path.join(dataPath, 'stunden.db')
  const backupPath = path.join(dataPath, 'backups', backupName)

  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup ${backupName} nicht gefunden`)
  }

  createBackup(dataPath)
  fs.copyFileSync(backupPath, dbPath)
}

export function listBackups(dataPath: string): { name: string, date: string, size: number }[] {
  const backupDir = path.join(dataPath, 'backups')
  if (!fs.existsSync(backupDir)) return []

  return fs.readdirSync(backupDir)
    .filter(f => f.endsWith('.db'))
    .map(f => {
      const stat = fs.statSync(path.join(backupDir, f))
      return {
        name: f,
        date: stat.mtime.toISOString(),
        size: stat.size,
      }
    })
    .sort((a, b) => b.date.localeCompare(a.date))
}

export function autoBackup(dataPath: string): void {
  const dbPath = path.join(dataPath, 'stunden.db')
  if (!fs.existsSync(dbPath)) return

  const backupDir = path.join(dataPath, 'backups')
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
  }

  const backups = listBackups(dataPath)
  if (backups.length > 0) {
    const lastBackupDate = new Date(backups[0].date)
    const now = new Date()
    const diffHours = (now.getTime() - lastBackupDate.getTime()) / (1000 * 60 * 60)
    if (diffHours < 24) return
  }

  createBackup(dataPath)
}

function cleanOldBackups(backupDir: string): void {
  const files = fs.readdirSync(backupDir)
    .filter(f => f.endsWith('.db'))
    .map(f => ({
      name: f,
      time: fs.statSync(path.join(backupDir, f)).mtime.getTime(),
    }))
    .sort((a, b) => b.time - a.time)

  if (files.length > MAX_BACKUPS) {
    for (const file of files.slice(MAX_BACKUPS)) {
      fs.unlinkSync(path.join(backupDir, file.name))
    }
  }
}
