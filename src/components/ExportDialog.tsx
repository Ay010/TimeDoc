import { useEffect, useState } from 'react'
import type { TemplateFile } from '../types'
import { useI18n } from '../i18n'

interface Props {
  year: number
  month: number
  onClose: () => void
  onDone: (files: string[]) => void
}

function ExportDialog({ year, month, onClose, onDone }: Props) {
  const t = useI18n((s) => s.t)
  const [userTemplates, setUserTemplates] = useState<TemplateFile[]>([])
  const [selectedUser, setSelectedUser] = useState<Record<string, boolean>>({})
  const [builtinExcel, setBuiltinExcel] = useState(true)
  const [builtinPdf, setBuiltinPdf] = useState(false)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    window.api.templates.list().then((list) => {
      setUserTemplates(list)
      const init: Record<string, boolean> = {}
      list.forEach((l) => { init[l.name] = true })
      setSelectedUser(init)
    })
  }, [])

  const anySelected =
    builtinExcel || builtinPdf || Object.values(selectedUser).some(Boolean)

  async function handleRun() {
    setError('')
    setRunning(true)
    try {
      const chosen = Object.entries(selectedUser)
        .filter(([, v]) => v)
        .map(([k]) => k)
      const files = await window.api.export.generate(year, month, {
        builtin: { excel: builtinExcel, pdf: builtinPdf },
        userTemplates: chosen,
      })
      onDone(files)
    } catch {
      setError(t('export.error'))
      setRunning(false)
    }
  }

  function toggleUser(name: string) {
    setSelectedUser((s) => ({ ...s, [name]: !s[name] }))
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h4 className="text-lg font-semibold">{t('exportDialog.title')}</h4>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl leading-none px-2">×</button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-5">
          <p className="text-sm text-gray-600">{t('exportDialog.description')}</p>

          <section>
            <h5 className="text-sm font-semibold text-gray-800 mb-2">{t('exportDialog.builtinSection')}</h5>
            <label className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" checked={builtinExcel} onChange={(e) => setBuiltinExcel(e.target.checked)} />
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">XLSX</span>
              <span className="text-sm">{t('exportDialog.builtinExcel')}</span>
            </label>
            <label className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" checked={builtinPdf} onChange={(e) => setBuiltinPdf(e.target.checked)} />
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-red-100 text-red-700">PDF</span>
              <span className="text-sm">{t('exportDialog.builtinPdf')}</span>
            </label>
          </section>

          <section>
            <h5 className="text-sm font-semibold text-gray-800 mb-2">{t('exportDialog.userSection')}</h5>
            {userTemplates.length === 0 ? (
              <p className="text-xs text-gray-500 italic">{t('exportDialog.noUserTemplates')}</p>
            ) : (
              <div className="space-y-1">
                {userTemplates.map((tpl) => (
                  <label key={tpl.name} className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!selectedUser[tpl.name]}
                      onChange={() => toggleUser(tpl.name)}
                    />
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                      tpl.type === 'word' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {tpl.type === 'word' ? 'DOCX' : 'XLSX'}
                    </span>
                    <span className="text-sm truncate">{tpl.name}</span>
                  </label>
                ))}
              </div>
            )}
          </section>

          {error && <div className="text-sm text-red-600">{error}</div>}
        </div>

        <div className="px-5 py-3 border-t flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary text-sm" disabled={running}>
            {t('exportDialog.cancel')}
          </button>
          <button onClick={handleRun} className="btn-success text-sm" disabled={running || !anySelected}>
            {running ? t('export.exporting') : t('exportDialog.run')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ExportDialog
