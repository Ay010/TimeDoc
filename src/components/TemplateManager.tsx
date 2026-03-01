import { useState, useEffect } from 'react'
import type { TemplateFile } from '../types'
import TemplateEditor from './TemplateEditor'
import EmailTemplate from './EmailTemplate'

function TemplateManager() {
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
      setMessage(`${result.name} erfolgreich hochgeladen!`)
      setTimeout(() => setMessage(''), 3000)
    }
  }

  async function handleDelete(fileName: string) {
    await window.api.templates.delete(fileName)
    await loadTemplates()
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Vorlagen & Export</h2>

      {message && (
        <div className="bg-emerald-50 text-emerald-700 px-4 py-3 rounded-lg text-sm font-medium">
          {message}
        </div>
      )}

      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Vorlagen hochladen</h3>
        <div className="flex gap-3">
          <button onClick={() => handleUpload('word')} className="btn-primary">
            Word-Vorlage (.docx) hochladen
          </button>
          <button onClick={() => handleUpload('excel')} className="btn-primary">
            Excel-Vorlage (.xlsx) hochladen
          </button>
        </div>
      </div>

      {templates.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Vorhandene Vorlagen</h3>
          <p className="text-sm text-gray-500 mb-4">
            Öffne die Vorlage in Word/Excel und füge Platzhalter wie {`{{NAME}}`}, {`{{BETRAG}}`} etc. ein.
            Beim Export werden diese automatisch mit deinen Daten ersetzt.
          </p>
          <div className="space-y-2">
            {templates.map((t) => (
              <div
                key={t.name}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold px-2 py-1 rounded ${
                    t.type === 'word'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {t.type === 'word' ? 'DOCX' : 'XLSX'}
                  </span>
                  <span className="text-sm font-medium text-gray-900">{t.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.api.templates.openInEditor(t.name)}
                    className="btn-primary text-sm"
                  >
                    In {t.type === 'word' ? 'Word' : 'Excel'} öffnen
                  </button>
                  <button
                    onClick={() => setEditingTemplate(t.name)}
                    className="btn-secondary text-sm"
                  >
                    Prüfen
                  </button>
                  <button
                    onClick={async () => {
                      const result = await window.api.templates.backup(t.name)
                      if (result.success) {
                        setMessage('Backup gespeichert!')
                        setTimeout(() => setMessage(''), 3000)
                      }
                    }}
                    className="btn-secondary text-sm"
                  >
                    Backup
                  </button>
                  <button
                    onClick={() => handleDelete(t.name)}
                    className="text-red-400 hover:text-red-600 text-sm px-2"
                  >
                    Entfernen
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
