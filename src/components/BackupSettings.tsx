import { useState, useEffect } from 'react'
import type { BackupInfo } from '../types'

function BackupSettings() {
  const [backups, setBackups] = useState<BackupInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')

  useEffect(() => {
    loadBackups()
  }, [])

  async function loadBackups() {
    setLoading(true)
    const list = await window.api.backup.list()
    setBackups(list)
    setLoading(false)
  }

  function showMessage(text: string, type: 'success' | 'error' = 'success') {
    setMessage(text)
    setMessageType(type)
    setTimeout(() => setMessage(''), 5000)
  }

  async function handleCreate() {
    const name = await window.api.backup.create()
    showMessage(`Backup erstellt: ${name}`)
    await loadBackups()
  }

  async function handleRestore(backupName: string) {
    const confirmed = window.confirm(
      `Willst du wirklich das Backup "${backupName}" wiederherstellen?\n\nEs wird zuerst ein Backup des aktuellen Stands erstellt.`
    )
    if (!confirmed) return

    await window.api.backup.restore(backupName)
    showMessage('Backup wiederhergestellt! Bitte starte die App neu.')
    await loadBackups()
  }

  async function handleExport() {
    const result = await window.api.backup.export()
    if (result.success) {
      showMessage('Backup gespeichert!')
    }
  }

  async function handleImport() {
    const confirmed = window.confirm(
      'Möchtest du ein Backup laden?\n\nDeine aktuellen Daten werden vorher gesichert und dann durch das Backup ersetzt.'
    )
    if (!confirmed) return

    const result = await window.api.backup.import()
    if (result.success) {
      showMessage('Backup geladen! Bitte starte die App neu.')
    }
  }

  function formatDate(iso: string): string {
    const d = new Date(iso)
    return d.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Backup</h2>
        <button onClick={handleCreate} className="btn-primary">
          Jetzt Backup erstellen
        </button>
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm font-medium ${
          messageType === 'success'
            ? 'bg-emerald-50 text-emerald-700'
            : 'bg-red-50 text-red-700'
        }`}>
          {message}
        </div>
      )}

      <div className="card">
        <h3 className="text-lg font-semibold mb-2">Backup übertragen</h3>
        <p className="text-sm text-gray-500 mb-4">
          Speichere dein Backup auf dem Desktop, USB-Stick oder einem anderen Ort.
          Oder lade ein bestehendes Backup von deinem Computer.
        </p>
        <div className="flex gap-3">
          <button onClick={handleExport} className="btn-primary text-sm">
            Auf Computer speichern...
          </button>
          <button onClick={handleImport} className="btn-secondary text-sm">
            Von Computer laden...
          </button>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold mb-2">Automatische Backups</h3>
        <p className="text-sm text-gray-500 mb-4">
          Die App erstellt automatisch tägliche Backups beim Start. Es werden maximal 30 Backups aufbewahrt.
        </p>

        {loading ? (
          <p className="text-gray-400 text-center py-8">Lade Backups...</p>
        ) : backups.length === 0 ? (
          <p className="text-gray-400 text-center py-8">Noch keine Backups vorhanden.</p>
        ) : (
          <div className="space-y-2">
            {backups.map((b) => (
              <div
                key={b.name}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-gray-300"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{formatDate(b.date)}</p>
                  <p className="text-xs text-gray-400">{formatSize(b.size)}</p>
                </div>
                <button
                  onClick={() => handleRestore(b.name)}
                  className="btn-secondary text-sm"
                >
                  Wiederherstellen
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default BackupSettings
