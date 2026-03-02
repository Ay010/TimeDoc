import { useState } from 'react'
import { useEntryStore } from '../stores/useEntryStore'
import { useI18n } from '../i18n'

function ExportButton() {
  const t = useI18n((s) => s.t)
  const { currentYear, currentMonth } = useEntryStore()
  const [exporting, setExporting] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  async function handleExport() {
    setExporting(true)
    setResult(null)
    try {
      const files = await window.api.export.generate(currentYear, currentMonth)
      if (files.length === 0) {
        setResult(t('export.noTemplates'))
      } else {
        setResult(t('export.success', { n: files.length }))
        setTimeout(() => setResult(null), 4000)
      }
    } catch (err) {
      setResult(t('export.error'))
    }
    setExporting(false)
  }

  async function handleOpenFolder() {
    await window.api.export.openFolder()
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={handleExport} disabled={exporting} className="btn-success">
        {exporting ? t('export.exporting') : t('export.button')}
      </button>
      <button onClick={handleOpenFolder} className="btn-secondary text-sm" title={t('export.folderTooltip')}>
        {t('export.folder')}
      </button>
      {result && (
        <span className={`text-sm font-medium ${result === t('export.error') || result === t('export.noTemplates') ? 'text-red-600' : 'text-emerald-600'}`}>
          {result}
        </span>
      )}
    </div>
  )
}

export default ExportButton
