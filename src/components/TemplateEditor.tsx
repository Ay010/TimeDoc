import { useState, useEffect } from 'react'
import { useI18n } from '../i18n'

interface Props {
  templateName: string
  onClose: () => void
}

const VARIABLE_GROUPS_STRUCT = [
  { titleKey: 'editor.group.personal', vars: [
    { key: 'NAME', labelKey: 'editor.var.name' },
    { key: 'ADRESSE_ZEILE1', labelKey: 'editor.var.address1' },
    { key: 'ADRESSE_ZEILE2', labelKey: 'editor.var.address2' },
    { key: 'EMAIL', labelKey: 'editor.var.email' },
  ]},
  { titleKey: 'editor.group.bank', vars: [
    { key: 'IBAN', labelKey: 'editor.var.iban' },
    { key: 'BIC', labelKey: 'editor.var.bic' },
    { key: 'BANK', labelKey: 'editor.var.bank' },
  ]},
  { titleKey: 'editor.group.client', vars: [
    { key: 'AUFTRAGGEBER_NAME', labelKey: 'editor.var.clientName' },
    { key: 'AUFTRAGGEBER_ADRESSE', labelKey: 'editor.var.clientAddress' },
  ]},
  { titleKey: 'editor.group.invoice', vars: [
    { key: 'STUNDENSATZ', labelKey: 'editor.var.hourlyRate' },
    { key: 'BETRAG', labelKey: 'editor.var.total' },
    { key: 'ZWISCHENSUMME', labelKey: 'editor.var.subtotal' },
    { key: 'RECHNUNGSNUMMER', labelKey: 'editor.var.invoiceNr' },
    { key: 'RECHNUNGSDATUM', labelKey: 'editor.var.invoiceDate' },
  ]},
  { titleKey: 'editor.group.period', vars: [
    { key: 'MONAT', labelKey: 'editor.var.monthLong' },
    { key: 'MONAT_KURZ', labelKey: 'editor.var.monthShort' },
    { key: 'JAHR', labelKey: 'editor.var.year' },
    { key: 'MONAT_NUMMER', labelKey: 'editor.var.monthNum' },
    { key: 'GESAMT_STUNDEN', labelKey: 'editor.var.totalHours' },
    { key: 'GESAMT_STUNDEN_DEZIMAL', labelKey: 'editor.var.totalDecimal' },
    { key: 'LEISTUNGSZEITRAUM', labelKey: 'editor.var.period' },
  ]},
]

const DAY_VARS_STRUCT = [
  { base: 'DATUM_', labelKey: 'editor.dayVar.date' },
  { base: 'BEGINN_', labelKey: 'editor.dayVar.start' },
  { base: 'ENDE_', labelKey: 'editor.dayVar.end' },
  { base: 'PAUSE_', labelKey: 'editor.dayVar.break' },
  { base: 'STUNDEN_', labelKey: 'editor.dayVar.hours' },
  { base: 'BEMERKUNG_', labelKey: 'editor.dayVar.notes' },
]

const ALL_VARS_KEYS = VARIABLE_GROUPS_STRUCT.flatMap(g => g.vars.map(v => v.key))

function TemplateEditor({ templateName, onClose }: Props) {
  const t = useI18n((s) => s.t)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState('')
  const [fileType, setFileType] = useState<string>('')
  const [dayNumber, setDayNumber] = useState(1)

  useEffect(() => {
    loadContent()
  }, [templateName])

  async function loadContent() {
    setLoading(true)
    setError('')
    const result = await window.api.templates.readContent(templateName)
    if (result.success && result.content !== undefined) {
      setContent(result.content)
      setFileType(result.type || '')
    } else {
      setError(result.error || t('editor.loadError'))
    }
    setLoading(false)
  }

  function copyVariable(varKey: string) {
    const placeholder = `{{${varKey}}}`
    navigator.clipboard.writeText(placeholder)
    setCopied(varKey)
    setTimeout(() => setCopied(''), 2000)
  }

  function copyAllDays(base: string, label: string) {
    const lines = Array.from({ length: 31 }, (_, i) => `{{${base}${i + 1}}}`)
    navigator.clipboard.writeText(lines.join('\n'))
    setCopied(`${label} 1-31`)
    setTimeout(() => setCopied(''), 3000)
  }

  const foundPlaceholders = content.match(/\{\{[^}]+\}\}/g) || []
  const foundKeys = [...new Set(foundPlaceholders.map(p => p.replace(/\{\{|\}\}/g, '')))]

  const knownFound = foundKeys.filter(k => ALL_VARS_KEYS.includes(k) || /^(DATUM|BEGINN|ENDE|PAUSE|STUNDEN|BEMERKUNG)_\d+$/.test(k))
  const unknownFound = foundKeys.filter(k => !knownFound.includes(k))

  const highlightedContent = content.replace(
    /\{\{([^}]+)\}\}/g,
    (match, key) => {
      const isKnown = ALL_VARS_KEYS.includes(key) || /^(DATUM|BEGINN|ENDE|PAUSE|STUNDEN|BEMERKUNG)_\d+$/.test(key)
      return isKnown ? `██${key}██` : `??${key}??`
    }
  )

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 pb-3 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{t('editor.title')}</h3>
            <p className="text-sm text-gray-500">{templateName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-400">{t('editor.loading')}</p>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-red-500">{error}</p>
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 flex flex-col p-4 overflow-hidden">
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-3 flex items-center justify-between">
                <p className="text-sm text-blue-700">
                  {t('editor.howTo')}
                </p>
                <button
                  onClick={() => window.api.templates.openInEditor(templateName)}
                  className="btn-primary text-sm shrink-0 ml-4"
                >
                  {t('editor.openEditor')}
                </button>
              </div>

              {knownFound.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2 mb-2">
                  <p className="text-sm text-emerald-700">
                    {t('editor.placeholdersFound', { n: knownFound.length })}:&nbsp;
                    {knownFound.map(k => `{{${k}}}`).join(', ')}
                  </p>
                </div>
              )}

              {unknownFound.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 mb-2">
                  <p className="text-sm text-amber-700">
                    {t('editor.unknownPlaceholders', { n: unknownFound.length })}:&nbsp;
                    {unknownFound.map(k => `{{${k}}}`).join(', ')}
                  </p>
                </div>
              )}

              {knownFound.length === 0 && unknownFound.length === 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 mb-2">
                  <p className="text-sm text-amber-700">
                    {t('editor.noPlaceholders')}
                  </p>
                </div>
              )}

              <div className="flex-1 overflow-auto border border-gray-200 rounded-lg p-4 bg-gray-50">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                  {highlightedContent.split(/(██[^█]+██|(?:\?\?)[^?]+(?:\?\?))/).map((part, i) => {
                    const knownMatch = part.match(/^██(.+)██$/)
                    const unknownMatch = part.match(/^\?\?(.+)\?\?$/)
                    if (knownMatch) {
                      return (
                        <span key={i} className="bg-emerald-200 text-emerald-800 px-1 rounded font-semibold">
                          {`{{${knownMatch[1]}}}`}
                        </span>
                      )
                    }
                    if (unknownMatch) {
                      return (
                        <span key={i} className="bg-amber-200 text-amber-800 px-1 rounded font-semibold">
                          {`{{${unknownMatch[1]}}}`}
                        </span>
                      )
                    }
                    return part
                  })}
                </pre>
              </div>
            </div>

            <div className="w-72 border-l border-gray-200 overflow-y-auto p-4 shrink-0">
              <h4 className="text-sm font-bold text-gray-700 mb-1">{t('editor.copyVars')}</h4>
              <p className="text-xs text-gray-400 mb-4">
                {t('editor.copyVarsDesc')}
              </p>

              {copied && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mb-3">
                  <p className="text-xs text-emerald-700 font-medium">
                    {t('editor.copied', { var: `{{${copied}}}` })}
                  </p>
                </div>
              )}

              {VARIABLE_GROUPS_STRUCT.map((group) => (
                <div key={group.titleKey} className="mb-4">
                  <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    {t(group.titleKey)}
                  </h5>
                  <div className="flex flex-wrap gap-1">
                    {group.vars.map((v) => {
                      const isUsed = knownFound.includes(v.key)
                      const label = t(v.labelKey)
                      return (
                        <button
                          key={v.key}
                          onClick={() => copyVariable(v.key)}
                          className={`text-xs px-2 py-1 rounded transition-colors border ${
                            isUsed
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                          }`}
                          title={t('editor.clickToCopy', { label })}
                        >
                          {isUsed ? '✓ ' : ''}{`{{${v.key}}}`}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}

              <div className="mb-4">
                <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  {t('editor.dayEntries')}
                </h5>
                <p className="text-xs text-gray-400 mb-2">
                  {t('editor.copyAllHint')}
                </p>
                <div className="flex flex-wrap gap-1 mb-3">
                  {DAY_VARS_STRUCT.map((v) => {
                    const label = t(v.labelKey)
                    return (
                      <button
                        key={`all-${v.base}`}
                        onClick={() => copyAllDays(v.base, label)}
                        className="text-xs px-2 py-1 rounded transition-colors border bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                        title={t('editor.copyAll', { label })}
                      >
                        {label} 1-31
                      </button>
                    )
                  })}
                </div>

                <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  {t('editor.singleDay')}
                </h5>
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-xs text-gray-500">{t('editor.dayNr')}</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={dayNumber}
                    onChange={(e) => setDayNumber(Math.max(1, Math.min(31, parseInt(e.target.value) || 1)))}
                    className="w-14 text-xs border border-gray-200 rounded px-2 py-1 text-center"
                  />
                </div>
                <div className="flex flex-wrap gap-1">
                  {DAY_VARS_STRUCT.map((v) => {
                    const fullKey = `${v.base}${dayNumber}`
                    const isUsed = knownFound.includes(fullKey)
                    const label = t(v.labelKey)
                    return (
                      <button
                        key={v.base}
                        onClick={() => copyVariable(fullKey)}
                        className={`text-xs px-2 py-1 rounded transition-colors border ${
                          isUsed
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                        }`}
                        title={t('editor.clickToCopyDay', { label, n: dayNumber })}
                      >
                        {isUsed ? '✓ ' : ''}{`{{${fullKey}}}`}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between p-4 border-t border-gray-200">
          <div className="text-xs text-gray-400">
            {t('editor.footer')}
          </div>
          <button onClick={onClose} className="btn-primary">
            {t('editor.close')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default TemplateEditor
