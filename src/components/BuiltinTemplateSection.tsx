import { useEffect, useState } from 'react'
import { useEntryStore } from '../stores/useEntryStore'
import { useI18n } from '../i18n'

const MONTH_NAMES_DE = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
]

function BuiltinTemplateSection() {
  const t = useI18n((s) => s.t)
  const { currentYear, currentMonth } = useEntryStore()

  const [placeholders, setPlaceholders] = useState<{ id: string; label: string }[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [html, setHtml] = useState('')
  const [busy, setBusy] = useState<'' | 'preview' | 'excel' | 'pdf'>('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    window.api.builtin.getPlaceholders().then(setPlaceholders)
  }, [])

  async function openPreview() {
    setBusy('preview')
    try {
      const h = await window.api.builtin.previewHtml(currentYear, currentMonth)
      setHtml(h)
      setShowPreview(true)
    } finally {
      setBusy('')
    }
  }

  async function downloadExcel() {
    setBusy('excel')
    try {
      await window.api.builtin.exportExcel(currentYear, currentMonth)
      flash(t('builtin.savedExcel'))
    } catch {
      flash(t('builtin.error'))
    } finally {
      setBusy('')
    }
  }

  async function downloadPdf() {
    setBusy('pdf')
    try {
      await window.api.builtin.exportPdf(currentYear, currentMonth)
      flash(t('builtin.savedPdf'))
    } catch {
      flash(t('builtin.error'))
    } finally {
      setBusy('')
    }
  }

  function flash(msg: string) {
    setMessage(msg)
    setTimeout(() => setMessage(''), 3000)
  }

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-lg font-semibold">{t('builtin.title')}</h3>
          <p className="text-sm text-gray-500 mt-1">{t('builtin.description')}</p>
        </div>
        <span className="text-xs font-bold px-2 py-1 rounded bg-amber-100 text-amber-700 whitespace-nowrap">
          {t('builtin.badge')}
        </span>
      </div>

      <div className="mb-4 text-sm text-gray-600">
        <span className="font-medium text-gray-800">{t('builtin.currentMonth')}:</span>{' '}
        {MONTH_NAMES_DE[currentMonth - 1]} {currentYear}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={openPreview} disabled={busy !== ''} className="btn-primary text-sm">
          {busy === 'preview' ? t('builtin.loading') : t('builtin.preview')}
        </button>
        <button onClick={downloadExcel} disabled={busy !== ''} className="btn-secondary text-sm">
          {busy === 'excel' ? t('builtin.loading') : t('builtin.downloadExcel')}
        </button>
        <button onClick={downloadPdf} disabled={busy !== ''} className="btn-secondary text-sm">
          {busy === 'pdf' ? t('builtin.loading') : t('builtin.downloadPdf')}
        </button>
      </div>

      {message && (
        <div className="text-sm text-emerald-700 mb-4">{message}</div>
      )}

      <details className="text-sm text-gray-600">
        <summary className="cursor-pointer font-medium text-gray-800 select-none">
          {t('builtin.fieldsTitle')}
        </summary>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
          {placeholders.map((p) => (
            <div key={p.id} className="flex items-start gap-2 p-2 rounded border border-gray-200 bg-gray-50">
              <code className="text-xs bg-white px-1.5 py-0.5 rounded border border-gray-200 text-blue-700 whitespace-nowrap">
                {p.id}
              </code>
              <span className="text-xs text-gray-600">{p.label}</span>
            </div>
          ))}
        </div>
      </details>

      {showPreview && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowPreview(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b">
              <h4 className="text-lg font-semibold">{t('builtin.previewTitle')}</h4>
              <div className="flex items-center gap-2">
                <button onClick={downloadExcel} disabled={busy !== ''} className="btn-secondary text-sm">
                  {t('builtin.downloadExcel')}
                </button>
                <button onClick={downloadPdf} disabled={busy !== ''} className="btn-secondary text-sm">
                  {t('builtin.downloadPdf')}
                </button>
                <button onClick={() => setShowPreview(false)} className="text-gray-500 hover:text-gray-800 text-2xl leading-none px-2">
                  ×
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-gray-100 p-4">
              <iframe
                title="preview"
                srcDoc={html}
                sandbox=""
                className="w-full h-full min-h-[600px] bg-white rounded shadow"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BuiltinTemplateSection
