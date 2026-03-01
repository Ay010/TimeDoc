import { useState } from 'react'
import { useEntryStore } from '../stores/useEntryStore'

function ExportButton() {
  const { currentYear, currentMonth } = useEntryStore()
  const [exporting, setExporting] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  async function handleExport() {
    setExporting(true)
    setResult(null)
    try {
      const files = await window.api.export.generate(currentYear, currentMonth)
      if (files.length === 0) {
        setResult('Keine Vorlagen vorhanden. Bitte lade zuerst Vorlagen hoch.')
      } else {
        setResult(`${files.length} Datei(en) erfolgreich exportiert!`)
        setTimeout(() => setResult(null), 4000)
      }
    } catch (err) {
      setResult('Fehler beim Export. Bitte Vorlagen prüfen.')
    }
    setExporting(false)
  }

  async function handleOpenFolder() {
    await window.api.export.openFolder()
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleExport}
        disabled={exporting}
        className="btn-success"
      >
        {exporting ? 'Exportiere...' : 'Monat exportieren'}
      </button>
      <button
        onClick={handleOpenFolder}
        className="btn-secondary text-sm"
        title="Export-Ordner öffnen"
      >
        Ordner
      </button>
      {result && (
        <span className={`text-sm font-medium ${result.includes('Fehler') || result.includes('Keine') ? 'text-red-600' : 'text-emerald-600'}`}>
          {result}
        </span>
      )}
    </div>
  )
}

export default ExportButton
