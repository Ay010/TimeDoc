import { useState } from 'react'
import { useEntryStore } from '../stores/useEntryStore'
import { useI18n } from '../i18n'
import ExportDialog from './ExportDialog'

function ExportButton() {
  const t = useI18n((s) => s.t)
  const { currentYear, currentMonth } = useEntryStore()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  async function handleOpenFolder() {
    await window.api.export.openFolder()
  }

  function handleDone(files: string[]) {
    setDialogOpen(false)
    if (files.length === 0) {
      setResult(t('export.noTemplates'))
    } else {
      setResult(t('export.success', { n: files.length }))
      setTimeout(() => setResult(null), 4000)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={() => setDialogOpen(true)} className="btn-success">
        {t('export.button')}
      </button>
      <button onClick={handleOpenFolder} className="btn-secondary text-sm" title={t('export.folderTooltip')}>
        {t('export.folder')}
      </button>
      {result && (
        <span className={`text-sm font-medium ${result === t('export.error') || result === t('export.noTemplates') ? 'text-red-600' : 'text-emerald-600'}`}>
          {result}
        </span>
      )}
      {dialogOpen && (
        <ExportDialog
          year={currentYear}
          month={currentMonth}
          onClose={() => setDialogOpen(false)}
          onDone={handleDone}
        />
      )}
    </div>
  )
}

export default ExportButton
