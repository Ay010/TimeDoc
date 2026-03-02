import { useState, useEffect } from 'react'
import type { TemplateFile } from '../types'
import TemplateEditor from './TemplateEditor'
import EmailTemplate from './EmailTemplate'
import { useI18n } from '../i18n'

function TemplateManager() {
  const t = useI18n((s) => s.t)
  const [templates, setTemplates] = useState<TemplateFile[]>([])
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadTemplates()
  }, [])

  async function loadTemplates() {
    const list = await window.api.templates.list()
    setTemplates(list)
  }

  async function handleUpload(type: 'word' | 'excel') {
    const result = await window.api.templates.upload(type)
    if (result) {
      await loadTemplates()
      setMessage(t('templates.uploaded', { name: result.name }))
      setTimeout(() => setMessage(''), 3000)
    }
  }

  async function handleDelete(fileName: string) {
    await window.api.templates.delete(fileName)
    await loadTemplates()
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">{t('templates.title')}</h2>

      {message && (
        <div className="bg-emerald-50 text-emerald-700 px-4 py-3 rounded-lg text-sm font-medium">
          {message}
        </div>
      )}

      <div className="card">
        <h3 className="text-lg font-semibold mb-4">{t('templates.upload')}</h3>
        <div className="flex gap-3">
          <button onClick={() => handleUpload('word')} className="btn-primary">
            {t('templates.uploadWord')}
          </button>
          <button onClick={() => handleUpload('excel')} className="btn-primary">
            {t('templates.uploadExcel')}
          </button>
        </div>
      </div>

      {templates.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">{t('templates.existing')}</h3>
          <p className="text-sm text-gray-500 mb-4">
            {t('templates.description')}
          </p>
          <div className="space-y-2">
            {templates.map((template) => (
              <div
                key={template.name}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold px-2 py-1 rounded ${
                    template.type === 'word'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {template.type === 'word' ? 'DOCX' : 'XLSX'}
                  </span>
                  <span className="text-sm font-medium text-gray-900">{template.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.api.templates.openInEditor(template.name)}
                    className="btn-primary text-sm"
                  >
                    {t('templates.openEditor')}
                  </button>
                  <button
                    onClick={() => setEditingTemplate(template.name)}
                    className="btn-secondary text-sm"
                  >
                    {t('templates.check')}
                  </button>
                  <button
                    onClick={async () => {
                      const result = await window.api.templates.backup(template.name)
                      if (result.success) {
                        setMessage(t('templates.backupSaved'))
                        setTimeout(() => setMessage(''), 3000)
                      }
                    }}
                    className="btn-secondary text-sm"
                  >
                    {t('templates.backup')}
                  </button>
                  <button
                    onClick={() => handleDelete(template.name)}
                    className="text-red-400 hover:text-red-600 text-sm px-2"
                  >
                    {t('templates.remove')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <EmailTemplate />

      {editingTemplate && (
        <TemplateEditor
          templateName={editingTemplate}
          onClose={() => setEditingTemplate(null)}
        />
      )}
    </div>
  )
}

export default TemplateManager
